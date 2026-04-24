// client/config.js
// Auto-detect: use production backend when developing locally
const isLocalDev = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';

export const API_BASE_URL = isLocalDev 
  ? "https://geoarchive.org"  // Point to production backend when local
  : "";                          // Use relative URLs in production (nginx proxies)
