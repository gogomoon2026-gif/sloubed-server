/**
 * SLOUBED 가이드 — API 엔드포인트 설정
 *
 * Railway 배포 후 RAILWAY_URL 만 바꾸면
 * index.html / admin.html / ui.html 전부 자동 반영됩니다.
 *
 * ※ 이 파일은 서버에서 /config.js 로 서빙됩니다.
 *   브라우저에서 <script src="/config.js"> 로 로드하세요.
 */

(function () {
  const RAILWAY_URL = 'https://sloubed-guide.up.railway.app'; // ← 배포 후 여기만 교체

  const isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname.startsWith('192.168.');

  window.SLOUBED_API = isLocal
    ? 'http://localhost:3000/api'
    : RAILWAY_URL + '/api';

  window.SLOUBED_BASE = isLocal
    ? 'http://localhost:3000'
    : RAILWAY_URL;
})();
