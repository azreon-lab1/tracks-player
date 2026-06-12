// Shared UI utilities

// ── Header banner ─────────────────────────────────────────────────────
// Set HEADER_IMAGE_DEFAULT to a filename or URL to show a banner on all
// pages. Each page can override with its own HEADER_IMAGE_URL constant
// (empty string = fall back to this default).
const HEADER_IMAGE_DEFAULT        = 'AZREON_gold_1920x480.png';
const HEADER_IMAGE_HEIGHT_DEFAULT = '70px';
const HEADER_IMAGE_FILTER_DEFAULT = 'brightness(0) invert(1)';

(function() {
  // null in a page's HEADER_IMAGE_URL = explicitly disabled for that page.
  // '' = use default. Any other string = page-specific override.
  const pageVal = (typeof HEADER_IMAGE_URL !== 'undefined') ? HEADER_IMAGE_URL : undefined;
  if (pageVal === null) return;
  const url = pageVal || HEADER_IMAGE_DEFAULT;
  if (!url) return;
  const banner = document.getElementById('header-banner');
  const img    = document.getElementById('header-img');
  if (!banner || !img) return;

  const height = (typeof HEADER_IMAGE_HEIGHT !== 'undefined' && HEADER_IMAGE_HEIGHT) || HEADER_IMAGE_HEIGHT_DEFAULT;
  img.style.maxHeight = height;
  img.style.width     = 'auto';
  img.style.maxWidth  = '100%';

  const filter = (typeof HEADER_IMAGE_FILTER !== 'undefined' && HEADER_IMAGE_FILTER) || HEADER_IMAGE_FILTER_DEFAULT;
  if (filter) img.style.filter = filter;

  img.src = url;
  banner.style.display = 'block';
})();

function showLoadingBar(container, message) {
  if (typeof container === 'string') container = document.getElementById(container);
  if (!container) return;
  const id = 'lb_' + Math.random().toString(36).slice(2);
  container.innerHTML =
    `<div style="padding:20px 0;text-align:center">` +
    `<style>#${id}{width:160px;height:4px;background:rgba(0,0,0,.08);border-radius:2px;overflow:hidden;margin:0 auto 10px}` +
    `#${id}::after{content:'';display:block;height:100%;width:40%;background:#d4a843;border-radius:2px;animation:lbslide 1.2s ease-in-out infinite}` +
    `@keyframes lbslide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}</style>` +
    `<div id="${id}"></div>` +
    `<div style="font-size:.82rem;color:#bbb">${message || 'Loading…'}</div></div>`;
}
