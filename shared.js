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

// Reusable "grant tracks" picker: scope toggle (specific/all) + checkbox grid + expiry date.
// Used by both the Add User flow (reports.html) and Manage User (manage-user.html) so the
// component only needs to look and behave one way.
// ids: { expandBtn, section, specificBtn, allBtn, checks, deselectBtn?, expiry, colour? }
function trackGrantPicker(ids) {
  let allTracksList = [];
  let scope          = 'specific';

  expandableButton(ids.expandBtn, ids.section, ids.colour);

  const setScope = toggleSelector(
    [ids.specificBtn, ids.allBtn], ['specific', 'all'],
    s => {
      scope = s;
      $(ids.checks).style.display = s === 'specific' ? 'grid' : 'none';
      if (ids.deselectBtn) $(ids.deselectBtn).style.display = s === 'specific' ? '' : 'none';
    },
    ids.colour
  );
  setScope('specific');

  function renderChecks() {
    $(ids.checks).innerHTML = allTracksList.map(t =>
      `<label style="display:flex;align-items:center;gap:8px;font-size:.82rem;padding:6px 10px;border:1px solid var(--border);border-radius:7px;cursor:pointer">
        <input type="checkbox" class="${ids.checks}-check" value="${t.id}" style="width:auto;margin:0">
        ${t.track_code} — ${t.title}
      </label>`
    ).join('');
  }

  if (ids.deselectBtn) {
    $(ids.deselectBtn).onclick = () => {
      document.querySelectorAll('.' + ids.checks + '-check').forEach(c => c.checked = false);
    };
  }

  async function load() {
    try {
      const res  = await fetch(WORKER + '/admin/tracks', { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      allTracksList = data.tracks || [];
      renderChecks();
    } catch {
      $(ids.checks).innerHTML = '<p class="msg err">Failed to load tracks.</p>';
    }
  }

  function getSelection() {
    const trackIds = scope === 'all'
      ? 'all'
      : [...document.querySelectorAll('.' + ids.checks + '-check:checked')].map(c => Number(c.value));
    return { scope, trackIds, expiryDate: $(ids.expiry).value || null };
  }

  function hasSelection() {
    return scope === 'all' || document.querySelectorAll('.' + ids.checks + '-check:checked').length > 0;
  }

  function reset() {
    // Clear checkboxes before resetting scope — if a future onChange callback
    // ever reads checkbox state, order matters (see plan-manage-user.md gotchas).
    document.querySelectorAll('.' + ids.checks + '-check').forEach(c => c.checked = false);
    setScope('specific');
    $(ids.expiry).value = '';
  }

  return { load, getSelection, hasSelection, reset };
}

// Reusable "send notification templates" checklist: loads email_templates via
// GET /admin/templates and lets the caller select zero or more codes to send.
// ids: { expandBtn?, section?, checks, category?, colour? } — expandBtn/section
// are optional (omit when the checklist is already inside its own expandable
// and doesn't need a further nested toggle). category filters server-side
// (e.g. 'general' excludes report templates that need {{report_title}} and
// don't make sense outside a report-specific flow); omit for all templates.
function notifyTemplatesPicker(ids) {
  let allTemplates = [];

  if (ids.expandBtn && ids.section) {
    expandableButton(ids.expandBtn, ids.section, ids.colour);
  }

  function renderChecks() {
    $(ids.checks).innerHTML = allTemplates.map(t =>
      `<label style="display:flex;align-items:center;gap:8px;font-size:.82rem;padding:6px 10px;border:1px solid var(--border);border-radius:7px;cursor:pointer">
        <input type="checkbox" class="${ids.checks}-check" value="${t.code}" style="width:auto;margin:0">
        ${t.subject}
      </label>`
    ).join('');
  }

  async function load() {
    try {
      const qs   = ids.category ? '?category=' + encodeURIComponent(ids.category) : '';
      const res  = await fetch(WORKER + '/admin/templates' + qs, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      allTemplates = data.templates || [];
      renderChecks();
    } catch {
      $(ids.checks).innerHTML = '<p class="msg err">Failed to load templates.</p>';
    }
  }

  function getSelection() {
    return [...document.querySelectorAll('.' + ids.checks + '-check:checked')].map(c => c.value);
  }

  function hasSelection() {
    return document.querySelectorAll('.' + ids.checks + '-check:checked').length > 0;
  }

  function reset() {
    document.querySelectorAll('.' + ids.checks + '-check').forEach(c => c.checked = false);
  }

  return { load, getSelection, hasSelection, reset };
}

// Reusable "compliance logs" viewer: tier toggle (strict/lenient/resumed) +
// optional date range + run button, calls GET /admin/logs and renders one row
// per qualifying session (track + start/end time). Used by both reports.html
// (admin picks any participant via getUserId) and manage-user.html (user is
// already fixed — getUserId just returns that page's currentUser.user_id).
// ids: { tierBtns: [strictId, lenientId, resumedId], from, to, runBtn, out,
//        getUserId: () => string|null, colour? }
// Each row shows the user_id only when no specific user is selected for that
// run (getUserId() returned null/empty) — if a user is fixed or chosen, it's
// already shown elsewhere in the UI and would just be redundant noise.
function complianceLogsViewer(ids) {
  let tier = 'strict';
  const setTier = toggleSelector(ids.tierBtns, ['strict', 'lenient', 'resumed'], v => tier = v, ids.colour);
  setTier('strict');

  function fmt(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function render(tracks, showUser) {
    const out = $(ids.out);
    if (!tracks.length) {
      out.innerHTML = '<p class="msg">No completed tracks found for this selection.</p>';
      return;
    }
    out.innerHTML = tracks.map(t => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:7px;font-size:.85rem;margin-bottom:6px">
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${showUser ? (t.user_id + ' — ') : ''}${t.track_code} — ${t.track_title}</span>
        <span style="color:var(--muted);font-size:.76rem;white-space:nowrap">${fmt(t.start_time)} → ${fmt(t.end_time)}</span>
      </div>
    `).join('');
  }

  async function run() {
    const out    = $(ids.out);
    const userId = ids.getUserId ? ids.getUserId() : null;
    let   from   = $(ids.from).value;
    let   to     = $(ids.to).value;

    // A single filled date (either side) means "just that one day" —
    // not "open-ended", which would otherwise silently return all time.
    if (from && !to) to = from;
    else if (to && !from) from = to;

    out.innerHTML = '<p class="msg">Loading…</p>';
    let url = WORKER + '/admin/logs?type=' + tier;
    if (userId)     url += '&user_id=' + encodeURIComponent(userId);
    if (from && to) url += '&from=' + from + '&to=' + to;

    try {
      const res  = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      if (!data.success) {
        out.innerHTML = '<p class="msg err">' + (data.error || 'Failed to load logs.') + '</p>';
        return;
      }
      render(data.tracks, !userId);
    } catch {
      out.innerHTML = '<p class="msg err">Network error.</p>';
    }
  }

  function setQuickRange(days) {
    const to   = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    $(ids.from).value = from.toISOString().slice(0, 10);
    $(ids.to).value   = to.toISOString().slice(0, 10);
  }

  $(ids.runBtn).onclick = run;

  return { run, setQuickRange };
}

function toggleSelector(btnIds, values, onChange, colour) {
  const c           = colour || 'var(--tertiary)';
  const activeStyle   = `flex:1;padding:8px;border:1.5px solid ${c};border-radius:8px;font-size:.85rem;background:color-mix(in srgb, ${c} 8%, white);cursor:pointer;font-weight:600;color:${c}`;
  const inactiveStyle = 'flex:1;padding:8px;border:1.5px solid var(--border-muted);border-radius:8px;font-size:.85rem;background:#fff;cursor:pointer;color:var(--text-muted)';
  function set(val) {
    btnIds.forEach((id, i) => $(id).style.cssText = values[i] === val ? activeStyle : inactiveStyle);
    onChange(val);
  }
  btnIds.forEach((id, i) => $(id).onclick = () => set(values[i]));
  return set;
}
