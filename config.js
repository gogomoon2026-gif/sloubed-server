(function () {
  const RAILWAY_URL = 'https://sloubed-server-production.up.railway.app';
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