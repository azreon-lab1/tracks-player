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

function expandableButton(btnId, sectionId, colour) {
  const btn     = $(btnId);
  const section = $(sectionId);
  const c       = colour || 'var(--tertiary)';
  const openBg     = `color-mix(in srgb, ${c} 8%, white)`;
  const closedBg   = `color-mix(in srgb, ${c} 4%, white)`;
  const closedBorder = `color-mix(in srgb, ${c} 30%, white)`;
  const closedText   = `color-mix(in srgb, ${c} 50%, #888)`;
  function setState(open) {
    section.style.display = open ? 'flex'        : 'none';
    btn.style.background  = open ? openBg        : closedBg;
    btn.style.borderColor = open ? c             : closedBorder;
    btn.style.color       = open ? c             : closedText;
    btn.style.fontWeight  = open ? '600'         : '';
    const arrow = btn.querySelector('.expand-arrow');
    if (arrow) arrow.textContent = open ? '▴' : '▾';
  }
  btn.onclick = () => setState(section.style.display !== 'flex');
  setState(false);
}

function toggleSelector(btnIds, values, onChange, colour) {
  const c           = colour || 'var(--tertiary)';
  const activeStyle   = `flex:1;padding:8px;border:1.5px solid ${c};border-radius:8px;font-size:.85rem;background:var(--tertiary-light);cursor:pointer;font-weight:600;color:${c}`;
  const inactiveStyle = 'flex:1;padding:8px;border:1.5px solid var(--border-muted);border-radius:8px;font-size:.85rem;background:#fff;cursor:pointer;color:var(--text-muted)';
  function set(val) {
    btnIds.forEach((id, i) => $(id).style.cssText = values[i] === val ? activeStyle : inactiveStyle);
    onChange(val);
  }
  btnIds.forEach((id, i) => $(id).onclick = () => set(values[i]));
  return set;
}
