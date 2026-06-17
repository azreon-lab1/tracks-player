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

function expandableCard(cardId, openColour, closedColour, startOpen) {
  const card = document.getElementById(cardId);
  if (!card) return;

  const isOpen  = startOpen !== false;
  const openC   = openColour   || 'var(--card-arrow-open,   #888)';
  const closedC = closedColour || 'var(--card-arrow-closed, #bbb)';

  const h2 = card.querySelector(':scope > h2');
  if (!h2) return;

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;-webkit-user-select:none';

  const arrow = document.createElement('span');
  arrow.style.cssText = 'font-size:2rem;flex-shrink:0;line-height:1;display:flex;align-items:center';

  h2.style.marginBottom = '0';
  card.insertBefore(header, h2);
  header.appendChild(h2);
  header.appendChild(arrow);

  const body = document.createElement('div');
  while (header.nextSibling) body.appendChild(header.nextSibling);
  card.appendChild(body);

  function setState(open) {
    body.style.display        = open ? 'block' : 'none';
    header.style.marginBottom = open ? '18px'  : '0';
    arrow.textContent         = open ? '▴'     : '▾';
    arrow.style.color         = open ? openC   : closedC;
  }

  header.onclick = () => setState(body.style.display !== 'block');
  setState(isOpen);
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
