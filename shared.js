const WORKER = 'https://audio-worker.azreon.workers.dev';
const $      = id => document.getElementById(id);
const token  = localStorage.getItem('ap_token');

function logout() {
  localStorage.removeItem('ap_token');
  localStorage.removeItem('ap_email');
  location.href = 'index.html';
}

function initOptionsMenu() {
  const email   = localStorage.getItem('ap_email');
  const emailEl = $('options-email');
  if (emailEl) {
    if (email) emailEl.textContent = email;
    else emailEl.style.display = 'none';
  }
  const btn  = $('options-btn');
  const menu = $('options-menu');
  if (btn && menu) {
    btn.onclick = e => {
      e.stopPropagation();
      const open = menu.style.display === 'block';
      menu.style.display = open ? 'none' : 'block';
      btn.setAttribute('aria-expanded', String(!open));
      btn.classList.toggle('open', !open);
    };
    document.addEventListener('click', () => {
      menu.style.display = 'none';
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('open');
    });
  }
  const logoutBtn = $('logout-btn');
  if (logoutBtn) logoutBtn.onclick = logout;
}
