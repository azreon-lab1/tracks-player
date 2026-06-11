// Shared UI utilities

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
