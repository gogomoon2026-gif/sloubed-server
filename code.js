/**
 * SLOUBED 제품 가이드 생성기 — Figma Plugin code.js
 * 
 * 흐름:
 *  1. UI에서 폼 입력
 *  2. "저장" 버튼 → parent에 SAVE_PRODUCT 메시지
 *  3. code.js → fetch POST localhost:3000/api/products
 *  4. 응답 성공 → 피그마 노드에 pluginData 기록 + UI에 성공 알림
 */

figma.showUI(__html__, { width: 420, height: 680, title: 'SLOUBED 제품 가이드' });

// ── 서버 URL: 배포 후 이 값만 교체 ──
const SERVER_URL = 'https://sloubed-guide.up.railway.app'; // 로컬은 'http://localhost:3000'
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

  // ─ 저장 ─
  if (msg.type === 'SAVE_PRODUCT') {
    const product = msg.product;

    // 1) 서버에 저장
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
        message: '서버 연결 실패. 서버에 연결할 수 없습니다. URL을 확인하세요.',
      });
      return;
    }

    if (!serverOk) {
      figma.ui.postMessage({ type: 'SAVE_ERROR', message: serverResult?.error || '저장 실패' });
      return;
    }

    // 2) 선택된 피그마 노드에 pluginData 저장
    const sel = figma.currentPage.selection;
    if (sel.length === 1) {
      try {
        sel[0].setPluginData('slbProduct', JSON.stringify({
          ...product,
          _savedAt: new Date().toISOString(),
        }));
        sel[0].name = `[SLOUBED] ${product.name}`;
      } catch (e) {
        // 노드 종류에 따라 setPluginData 불가할 수 있음 (무시)
      }
    }

    // 3) 성공 알림
    figma.ui.postMessage({
      type: 'SAVE_SUCCESS',
      isNew: serverResult.isNew,
      product: serverResult.product,
    });

    figma.notify(`✓ ${product.name} — 대시보드에 저장되었습니다`, { timeout: 3000 });
  }

  // ─ 서버에서 제품 목록 로드 ─
  if (msg.type === 'LOAD_PRODUCTS') {
    try {
      const resp = await fetch(API_BASE + '/products');
      const data = await resp.json();
      figma.ui.postMessage({ type: 'PRODUCTS_LOADED', products: data.products });
    } catch (e) {
      figma.ui.postMessage({ type: 'SERVER_OFFLINE' });
    }
  }

  // ─ 이미지 업로드 (피그마 선택 노드 → base64 추출) ─
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
      // 노드를 PNG로 내보내기
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

  // ─ 서버 상태 체크 ─
  if (msg.type === 'CHECK_SERVER') {
    try {
      const resp = await fetch(API_BASE + '/products');
      const data = await resp.json();
      figma.ui.postMessage({ type: 'SERVER_ONLINE', productCount: Object.keys(data.products || {}).length });
    } catch (e) {
      figma.ui.postMessage({ type: 'SERVER_OFFLINE' });
    }
  }

  // ─ 닫기 ─
  if (msg.type === 'CLOSE') figma.closePlugin();
};
