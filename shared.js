const WORKER = 'https://audio-worker.azreon.workers.dev';
const $      = id => document.getElementById(id);
const token  = localStorage.getItem('ap_token');

// Single source of truth for the site's brand name — every page derives its
// own PAGE_TITLE from this (e.g. `WEBSITE_TITLE` or `'Management — ' +
// WEBSITE_TITLE`) instead of hardcoding the brand text itself. Change the
// name in exactly one place; every page's <title> updates on next load.
const WEBSITE_TITLE = 'Azreon Platform';

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

// border (optional, default false): when true, encloses the section in a
// border matching the button's open-state border colour exactly (left/right/
// bottom only, no top) so it reads as one continuous shape attached to the
// button above, rather than a separate floating box below it. Applied once
// at setup, not per open/close — the section is only ever visible while the
// button itself is in its "open" state (border-color === c), so a static
// border using the same `c` always matches without needing to track state.
function expandableButton(btnId, sectionId, colour, border) {
  const btn     = $(btnId);
  const section = $(sectionId);
  const c       = colour || 'var(--tertiary)';
  const openBg     = `color-mix(in srgb, ${c} 8%, white)`;
  const closedBg   = `color-mix(in srgb, ${c} 4%, white)`;
  const closedBorder = `color-mix(in srgb, ${c} 30%, white)`;
  const closedText   = `color-mix(in srgb, ${c} 50%, #888)`;
  if (border) {
    section.style.marginTop    = '0';
    section.style.padding      = '12px';
    section.style.border       = `1.5px solid ${c}`;
    section.style.borderTop    = 'none';
    section.style.borderRadius = '0 0 8px 8px';
  }
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

// Reusable "grant tracks" picker: scope toggle (specific/all) + checkbox grid + expiry date,
// plus an optional "Notify participant" dropdown (none / with link to one of the granted
// tracks / without link). Used by both the Add User flow (reports.html) and Manage User
// (manage-user.html) so the component only needs to look and behave one way.
// ids: { expandBtn, section, specificBtn, allBtn, checks, deselectBtn?, expiry, colour?,
//        notifySelect?, notifyLinkWrap?, notifyLinkSelect?, border? } — the three notify*
// keys are optional as a group; omit all three to skip the notify UI entirely. `border`
// (optional, default false) encloses the section visually — see expandableButton().
function trackGrantPicker(ids) {
  let allTracksList = [];
  let scope          = 'specific';

  expandableButton(ids.expandBtn, ids.section, ids.colour, ids.border);

  const setScope = toggleSelector(
    [ids.specificBtn, ids.allBtn], ['specific', 'all'],
    s => {
      scope = s;
      $(ids.checks).style.display = s === 'specific' ? 'grid' : 'none';
      if (ids.deselectBtn) $(ids.deselectBtn).style.display = s === 'specific' ? '' : 'none';
      refreshNotifyLinkOptions();
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
      refreshNotifyLinkOptions();
    };
  }

  // Rebuilds the "which track to link to" dropdown from whatever's currently
  // selected — the full catalog when scope is 'all', else just the ticked
  // boxes. Re-run on every selection change so it never goes stale.
  function refreshNotifyLinkOptions() {
    if (!ids.notifyLinkSelect) return;
    const sel = $(ids.notifyLinkSelect);
    const prev = sel.value;
    const candidates = scope === 'all'
      ? allTracksList
      : allTracksList.filter(t => document.querySelector(`.${ids.checks}-check[value="${t.id}"]`)?.checked);
    sel.innerHTML = '<option value="">Select track…</option>' +
      candidates.map(t => `<option value="${t.track_code}">${t.track_code} — ${t.title}</option>`).join('');
    sel.value = candidates.some(t => t.track_code === prev) ? prev : '';
  }

  if (ids.checks) {
    $(ids.checks).addEventListener('change', refreshNotifyLinkOptions);
  }

  if (ids.notifySelect && ids.notifyLinkWrap) {
    $(ids.notifySelect).addEventListener('change', () => {
      const showLink = $(ids.notifySelect).value === 'TRACK_ACCESS_L_V1';
      $(ids.notifyLinkWrap).style.display = showLink ? 'block' : 'none';
      if (showLink) refreshNotifyLinkOptions();
    });
  }

  async function load() {
    try {
      const res  = await fetch(WORKER + '/admin/tracks', { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      allTracksList = data.tracks || [];
      renderChecks();
      refreshNotifyLinkOptions();
    } catch {
      $(ids.checks).innerHTML = '<p class="msg err">Failed to load tracks.</p>';
    }
  }

  function getSelection() {
    const trackIds = scope === 'all'
      ? 'all'
      : [...document.querySelectorAll('.' + ids.checks + '-check:checked')].map(c => Number(c.value));
    const notifyCode = ids.notifySelect ? ($(ids.notifySelect).value || null) : null;
    const notifyLinkTrackCode = (notifyCode === 'TRACK_ACCESS_L_V1' && ids.notifyLinkSelect)
      ? ($(ids.notifyLinkSelect).value || null)
      : null;
    return { scope, trackIds, expiryDate: $(ids.expiry).value || null, notifyCode, notifyLinkTrackCode };
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
    if (ids.notifySelect)     $(ids.notifySelect).value = '';
    if (ids.notifyLinkWrap)   $(ids.notifyLinkWrap).style.display = 'none';
    if (ids.notifyLinkSelect) $(ids.notifyLinkSelect).innerHTML = '<option value="">Select track…</option>';
  }

  return { load, getSelection, hasSelection, reset };
}

// Reusable "send notification templates" checklist: loads email_templates via
// GET /admin/templates and lets the caller select zero or more codes to send.
// ids: { expandBtn?, section?, checks, category?, colour?, border? } — expandBtn/section
// are optional (omit when the checklist is already inside its own expandable
// and doesn't need a further nested toggle). category filters server-side
// (e.g. 'general' excludes report templates that need {{report_title}} and
// don't make sense outside a report-specific flow); omit for all templates.
function notifyTemplatesPicker(ids) {
  let allTemplates = [];

  if (ids.expandBtn && ids.section) {
    expandableButton(ids.expandBtn, ids.section, ids.colour, ids.border);
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
//        getUserId: () => string|null, hint?, colour? }
// Each row shows the user_id only when no specific user is selected for that
// run (getUserId() returned null/empty) — if a user is fixed or chosen, it's
// already shown elsewhere in the UI and would just be redundant noise.
// `hint` (optional) is an element id whose text updates to a one-line
// explanation of whichever tier is currently selected, same pattern as
// player.html's mode-toggle hint. `hintsWide` (optional) is [strictId,
// lenientId, resumedId] — three elements populated once with ALL three
// descriptions (for a wide-viewport side-by-side layout), independent of
// whichever tier is currently selected. TIER_HINTS is the single source of
// truth for this text — both usages read from it, neither hardcodes a copy.
const TIER_HINTS = {
  strict:  'Reached the end with zero interruptions (no pauses, seeks, or errors at all).',
  lenient: 'Allows one quick pause if resumed within 3 seconds.',
  resumed: 'Reached the end despite any interruptions (if nothing was skipped).',
};

function complianceLogsViewer(ids) {
  let tier = 'lenient';
  const setTier = toggleSelector(ids.tierBtns, ['strict', 'lenient', 'resumed'], v => {
    tier = v;
    if (ids.hint) $(ids.hint).textContent = TIER_HINTS[v];
  }, ids.colour);
  setTier('lenient');

  if (ids.hintsWide) {
    ['strict', 'lenient', 'resumed'].forEach((t, i) => {
      const el = $(ids.hintsWide[i]);
      if (el) el.textContent = TIER_HINTS[t];
    });
  }

  // Feature flag from config.js — hidden entirely (not just disabled) when
  // off, regardless of whether there are results. Strict === true, not just
  // truthy, so an undefined flag (config.js missing/not loaded) defaults to
  // hidden rather than silently exposing the feature.
  const exportFeatureOn = typeof LOG_EXPORT_CONTENT_ENABLED !== 'undefined' && LOG_EXPORT_CONTENT_ENABLED === true;
  if (ids.exportBtn && !exportFeatureOn) $(ids.exportBtn).style.display = 'none';

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

  // Shared by run() and exportCsv() — both need the same current selection.
  function currentParams() {
    const userId = ids.getUserId ? ids.getUserId() : null;
    let   from   = $(ids.from).value;
    let   to     = $(ids.to).value;
    // A single filled date (either side) means "just that one day" —
    // not "open-ended", which would otherwise silently return all time.
    if (from && !to) to = from;
    else if (to && !from) from = to;
    return { userId, from, to };
  }

  // Snapshot of the params + tier that produced the results currently on
  // screen — null whenever there's nothing (yet) to export. Export deliberately
  // re-exports THIS, not whatever's currently typed into the form, so it
  // always matches what's actually being looked at, even if the inputs have
  // since been changed without re-running.
  let lastResult = null;

  function setExportEnabled(on) {
    if (ids.exportBtn) $(ids.exportBtn).disabled = !on;
  }
  setExportEnabled(false);

  async function run() {
    const out = $(ids.out);
    const params = currentParams();
    const { userId, from, to } = params;

    lastResult = null;
    setExportEnabled(false);
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
      if (data.tracks.length) {
        lastResult = { tier, ...params };
        setExportEnabled(true);
      }
    } catch {
      out.innerHTML = '<p class="msg err">Network error.</p>';
    }
  }

  // Opens the equivalent CSV download in a new tab — plain navigation can't
  // set an Authorization header, so the token rides the same ?t= query-param
  // fallback /audio/:key and /report already rely on (getSessionUser extracts
  // it from either place). Uses lastResult, not currentParams(), so the
  // export always matches the results actually shown on screen.
  function exportCsv() {
    if (!lastResult) return;
    const { tier: t, userId, from, to } = lastResult;
    let url = WORKER + '/admin/logs?type=' + t + '&format=csv&t=' + encodeURIComponent(token);
    if (userId)     url += '&user_id=' + encodeURIComponent(userId);
    if (from && to) url += '&from=' + from + '&to=' + to;
    window.open(url, '_blank');
  }

  function setQuickRange(days) {
    const to   = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    $(ids.from).value = from.toISOString().slice(0, 10);
    $(ids.to).value   = to.toISOString().slice(0, 10);
  }

  $(ids.runBtn).onclick = run;
  if (ids.exportBtn) $(ids.exportBtn).onclick = exportCsv;

  return { run, setQuickRange, exportCsv };
}

// Generates the full Compliance/Listening Logs markup (everything from the
// Tier toggle down to the results area) and wires it up via
// complianceLogsViewer(). reports.html and manage-user.html were carrying
// two hand-copied versions of this same block — this is the one place it's
// now written. The only real difference between the two pages is who the
// logs are scoped to: reports.html lets an admin pick any participant (or
// "All participants"); manage-user.html is locked to whichever user is
// currently open. That's the one part callers configure via `opts.mode`:
//   - mode: 'picker' — renders a participant <select id="logs-user">
//           (options populated separately by the caller, e.g. once a users
//           list has loaded)
//   - mode: 'fixed'  — renders a read-only "Participant ID: <strong>" line
//           (caller sets its text directly via $('logs-participant-id'))
// opts.getUserId is always supplied by the caller either way.
function renderLogsViewer(containerId, opts) {
  const headerHtml = opts.mode === 'picker'
    ? `<select id="logs-user" style="width:100%;padding:10px;border:1px solid var(--tertiary);border-radius:8px;font-size:.9rem;color:#333">
         <option value="">All participants</option>
       </select>`
    : `<p class="field-label" style="margin:0 0 8px">Participant ID: <strong id="logs-participant-id" style="color:#333">—</strong></p>`;

  $(containerId).innerHTML = `
    ${headerHtml}
    <p class="field-label" style="margin:4px 0 0">Tier</p>
    <div style="display:flex;gap:8px">
      <button id="logs-strict-btn"  style="flex:1">Strict</button>
      <button id="logs-lenient-btn" style="flex:1">Lenient</button>
      <button id="logs-resumed-btn" style="flex:1">Resumed</button>
    </div>
    <div class="tier-hints-wide" style="margin-top:4px">
      <p id="logs-tier-hint-strict"  style="flex:1;font-size:.72rem;color:var(--text-muted);margin:0"></p>
      <p id="logs-tier-hint-lenient" style="flex:1;font-size:.72rem;color:var(--text-muted);margin:0"></p>
      <p id="logs-tier-hint-resumed" style="flex:1;font-size:.72rem;color:var(--text-muted);margin:0"></p>
    </div>
    <p id="logs-tier-hint" class="tier-hint-narrow" style="font-size:.72rem;color:var(--text-muted);margin:4px 0 0"></p>
    <p class="field-label" style="margin:4px 0 0">Quick range</p>
    <div style="display:flex;gap:8px">
      <button class="quick-range-btn" id="logs-7d-btn">Last 7 days</button>
      <button class="quick-range-btn" id="logs-30d-btn">Last 30 days</button>
      <button class="quick-range-btn" id="logs-all-btn">All time</button>
    </div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <div style="flex:1;min-width:0">
        <p class="field-label" style="margin:0 0 4px">From (optional)</p>
        <input id="logs-from" type="date" style="margin:0;width:100%">
      </div>
      <div style="flex:1;min-width:0">
        <p class="field-label" style="margin:0 0 4px">To (optional)</p>
        <input id="logs-to" type="date" style="margin:0;width:100%">
      </div>
    </div>
    <button class="secondary" id="logs-run-btn" style="margin-top:4px">Run</button>
    <button class="quick-range-btn" id="logs-export-btn" style="width:100%;margin-top:8px" disabled>Export CSV</button>
    <div id="logs-out" style="margin-top:8px"><p class="msg">${opts.initialMsg || 'Run a query to see results.'}</p></div>
  `;

  const viewer = complianceLogsViewer({
    tierBtns: ['logs-strict-btn', 'logs-lenient-btn', 'logs-resumed-btn'],
    from: 'logs-from', to: 'logs-to', runBtn: 'logs-run-btn', exportBtn: 'logs-export-btn', out: 'logs-out', hint: 'logs-tier-hint',
    hintsWide: ['logs-tier-hint-strict', 'logs-tier-hint-lenient', 'logs-tier-hint-resumed'],
    getUserId: opts.getUserId,
  });

  $('logs-7d-btn').onclick  = () => { viewer.setQuickRange(7);  viewer.run(); };
  $('logs-30d-btn').onclick = () => { viewer.setQuickRange(30); viewer.run(); };
  $('logs-all-btn').onclick = () => { $('logs-from').value = ''; $('logs-to').value = ''; viewer.run(); };

  return viewer;
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
