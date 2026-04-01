const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// 빈 기본값 — 샘플 데이터 없음
const DEFAULT_DATA = { products: {}, changelog: [] };

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      // 혹시 moonray 샘플이 남아있으면 제거
      if (raw.products && raw.products.moonray && raw.products.moonray.updatedAt === '2025-01-15T00:00:00.000Z') {
        delete raw.products.moonray;
        fs.writeFileSync(DATA_FILE, JSON.stringify(raw, null, 2), 'utf8');
        console.log('[CLEANUP] 샘플 Moonray 데이터 제거 완료');
      }
      return raw;
    }
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 초기화
if (!fs.existsSync(DATA_FILE)) writeData(DEFAULT_DATA);
// 기존 data.json에 샘플 있으면 즉시 제거
readData();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, data) {
  setCORS(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve({}); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') { setCORS(res); res.writeHead(204); res.end(); return; }

  if (pathname === '/api/products' && req.method === 'GET') {
    const data = readData();
    return json(res, 200, { ok: true, products: data.products, changelog: data.changelog });
  }

  if (pathname === '/api/products' && req.method === 'POST') {
    const body = await readBody(req);
    const displayName = body.name || body.nameKo || body.nameEn || '';
    if (!body.id) return json(res, 400, { ok: false, error: 'id 필수' });

    const data = readData();
    const isNew = !data.products[body.id];
    const now = new Date().toISOString();
    const todayStr = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).replace(/\. /g, '.').slice(0, -1);

    const existing = data.products[body.id] || {};
    data.products[body.id] = {
      ...existing, ...body,
      name: displayName,
      status: isNew ? 'new' : 'updated',
      statusDate: todayStr,
      images: existing.images || { main: null, side: null, crossSection: null, cover: null },
      updatedAt: now,
    };

    if (body.changelogNote) {
      data.changelog.unshift({
        id: `cl_${Date.now()}`, product: displayName,
        type: isNew ? 'new' : 'updated', date: todayStr, content: body.changelogNote,
      });
      if (data.changelog.length > 50) data.changelog = data.changelog.slice(0, 50);
    }

    writeData(data);
    console.log(`[SAVE] ${displayName} (${isNew ? '신규' : '수정'}) — ${todayStr}`);
    return json(res, 200, { ok: true, product: data.products[body.id], isNew });
  }

  if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
    const id = pathname.split('/')[3];
    const data = readData();
    if (!data.products[id]) return json(res, 404, { ok: false, error: 'Not found' });
    const name = data.products[id].name || id;
    delete data.products[id];
    writeData(data);
    console.log(`[DELETE] ${name}`);
    return json(res, 200, { ok: true });
  }

  if (pathname.match(/^\/api\/products\/[\w-]+\/image$/) && req.method === 'PUT') {
    const id = pathname.split('/')[3];
    const body = await readBody(req);
    const data = readData();
    if (!data.products[id]) return json(res, 404, { ok: false, error: 'Not found' });
    data.products[id].images = data.products[id].images || {};
    data.products[id].images[body.slot || 'main'] = body.base64 || null;
    writeData(data);
    return json(res, 200, { ok: true });
  }

  if (pathname === '/api/changelog' && req.method === 'POST') {
    const body = await readBody(req);
    const data = readData();
    data.changelog.unshift({
      id: `cl_${Date.now()}`, product: body.product,
      type: body.type || 'updated', date: body.date, content: body.content,
    });
    writeData(data);
    return json(res, 200, { ok: true });
  }

  // Static files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, 'public', filePath.replace(/^\//, ''));
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, pathname.replace(/^\//, ''));
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    setCORS(res);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  json(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  SLOUBED 제품 가이드 서버');
  console.log('  ─────────────────────────');
  console.log(`  http://localhost:${PORT}        대시보드`);
  console.log(`  http://localhost:${PORT}/admin  관리자`);
  console.log(`  http://localhost:${PORT}/api/products  API\n`);
});
