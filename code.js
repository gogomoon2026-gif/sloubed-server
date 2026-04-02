/**
 * SLOUBED 제품 가이드 생성기 — Figma Plugin code.js
 */

figma.showUI(__html__, { width: 420, height: 680, title: 'SLOUBED 제품 가이드' });

// ── 서버 URL ──
const SERVER_URL = 'https://sloubed-server-production.up.railway.app';
const API_BASE = SERVER_URL + '/api';

// ── 선택된 노드에서 제품 정보 읽기 ──
function getProductDataFromNode(node) {
  if (!node) return null;
  try {
    const raw = node.getPluginData('slbProduct');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ── 선택 변경 시 UI로 현재 데이터 전달 ──
figma.on('selectionchange', () => {
  const sel = figma.currentPage.selection;
  if (sel.length === 1) {
    const data = getProductDataFromNode(sel[0]);
    figma.ui.postMessage({
      type: 'NODE_SELECTED',
      nodeId: sel[0].id,
      nodeName: sel[0].name,
      existingData: data,
    });
  } else {
    figma.ui.postMessage({ type: 'NODE_DESELECTED' });
  }
});

// ── UI → Plugin 메시지 처리 ──
figma.ui.onmessage = async (msg) => {

  if (msg.type === 'SAVE_PRODUCT') {
    const product = msg.product;
    let serverOk = false;
    let serverResult = null;
    try {
      const resp = await fetch(API_BASE + '/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      serverResult = await resp.json();
      serverOk = serverResult.ok;
    } catch (e) {
      figma.ui.postMessage({
        type: 'SAVE_ERROR',
        message: '서버 연결 실패. 서버에 연결할 수 없습니다.',
      });
      return;
    }

    if (!serverOk) {
      figma.ui.postMessage({ type: 'SAVE_ERROR', message: serverResult?.error || '저장 실패' });
      return;
    }

    const sel = figma.currentPage.selection;
    if (sel.length === 1) {
      try {
        sel[0].setPluginData('slbProduct', JSON.stringify({
          ...product,
          _savedAt: new Date().toISOString(),
        }));
        sel[0].name = `[SLOUBED] ${product.name}`;
      } catch (e) {}
    }

    figma.ui.postMessage({
      type: 'SAVE_SUCCESS',
      isNew: serverResult.isNew,
      product: serverResult.product,
    });

    figma.notify(`✓ ${product.name} — 대시보드에 저장되었습니다`, { timeout: 3000 });
  }

  if (msg.type === 'LOAD_PRODUCTS') {
    try {
      const resp = await fetch(API_BASE + '/products');
      const data = await resp.json();
      figma.ui.postMessage({ type: 'PRODUCTS_LOADED', products: data.products });
    } catch (e) {
      figma.ui.postMessage({ type: 'SERVER_OFFLINE' });
    }
  }

  if (msg.type === 'UPLOAD_IMAGE') {
    const sel = figma.currentPage.selection;
    if (sel.length !== 1) {
      figma.ui.postMessage({ type: 'IMAGE_ERROR', message: '이미지 노드를 1개 선택하세요' });
      return;
    }
    const node = sel[0];
    if (node.type !== 'RECTANGLE' && node.type !== 'FRAME' && node.type !== 'COMPONENT') {
      figma.ui.postMessage({ type: 'IMAGE_ERROR', message: '이미지가 포함된 Rectangle/Frame을 선택하세요' });
      return;
    }
    try {
      const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'WIDTH', value: 800 } });
      const base64 = figma.base64Encode(bytes);
      const resp = await fetch(`${API_BASE}/products/${msg.productId}/image`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot: msg.slot, base64: `data:image/png;base64,${base64}` }),
      });
      const result = await resp.json();
      if (result.ok) {
        figma.ui.postMessage({ type: 'IMAGE_UPLOADED', slot: msg.slot });
        figma.notify(`✓ 이미지(${msg.slot}) 업로드 완료`, { timeout: 2000 });
      }
    } catch (e) {
      figma.ui.postMessage({ type: 'IMAGE_ERROR', message: `업로드 실패: ${e.message}` });
    }
  }

  if (msg.type === 'CHECK_SERVER') {
    try {
      const resp = await fetch(API_BASE + '/products');
      const data = await resp.json();
      figma.ui.postMessage({ type: 'SERVER_ONLINE', productCount: Object.keys(data.products || {}).length });
    } catch (e) {
      figma.ui.postMessage({ type: 'SERVER_OFFLINE' });
    }
  }

  if (msg.type === 'CLOSE') figma.closePlugin();
};