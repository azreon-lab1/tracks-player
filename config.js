// Frontend feature flags / site-wide settings. This is a static site with no
// build step, so there's no real .env to inject values at build time — this
// plain JS file IS the practical equivalent: one place to flip a feature on
// or off, instead of scattering the decision through component code. Loaded
// by every page, before shared.js.

// Controls whether the "Export CSV" button appears in the Compliance Logs
// (reports.html) and Listening Logs (manage-user.html) cards.
const LOG_EXPORT_CONTENT_ENABLED = true;

// player.html — direct ?track=T1 links hide the track list/mode toggle for a
// clean single-track widget view.
const SINGLE_TRACK_HIDES_LIST = true;

// player.html — true = My Reports card shown inline in player.html;
// false = a "Reports" button instead, linking out to reports.html.
const REPORTS_IN_PLAYER = true;

// player.html — fade volume on play/pause to avoid an audible click/pop.
const FADE_AUDIO_ACTIONS = true;

// player.html — default for the "Autoplay" toggle (live in the player UI,
// below Auto-Lock; user choice persists in localStorage ap_autoplay and wins
// over this once set — this is only the first-ever default). true = tapping
// a track plays it as soon as it's ready (current/original behaviour).
// false = tapping a track only loads it (gets ready, Media Session/lock-screen
// controls populated) without starting playback — lets the participant lock
// the phone right after tapping and press play from the lock screen.
const AUTOPLAY_ON_TRACK_TAP = true;

// player.html — "Restart" button (seeks the current track back to position 0,
// keeps playing/paused state as-is) in the in-app player controls, next to
// Play/Pause. Independent of RESTART_BUTTON_IN_MEDIA_CONTROLS below — either,
// both, or neither can be on.
const RESTART_BUTTON_IN_PLAYER = true;

// player.html — MASTER switch for the lock-screen rewind (⏮) capability.
// When true, the platform offers users a "Show/Hide Rewind" toggle in the
// player and wires the restart-to-zero behaviour to the OS media controls'
// previous-track button (navigator.mediaSession 'previoustrack' — chosen over
// 'seekbackward'/⏪ because the OS renders it reliably as a button). When
// false, no toggle and no button exist at all. Independent of
// RESTART_BUTTON_IN_PLAYER. The per-user show/hide default is MEDIA_REWIND_DEFAULT.
const RESTART_BUTTON_IN_MEDIA_CONTROLS = true;

// player.html — first-run default for the per-user "Show/Hide Rewind" toggle
// (persisted in localStorage ap_media_rewind once they choose). Only has any
// effect while RESTART_BUTTON_IN_MEDIA_CONTROLS above is true.
const MEDIA_REWIND_DEFAULT = true;

// player.html — default artwork shown on the OS lock-screen / notification
// media card (navigator.mediaSession metadata). One place to manage the
// image; swap the file or add more sizes here. Each entry: { src, sizes,
// type }. `src` is resolved relative to the page, so a repo-hosted file just
// works on both the LAN test server and GitHub Pages. Future: when the
// backend returns a per-track image, MediaControls.setTrack() already prefers
// a track's own `artwork` array over this default.
const MEDIA_ARTWORK = [
  { src: 'media-artwork.png', sizes: '235x235', type: 'image/png' },
];

// player.html — tap-to-play "session activation". To surface the lock-screen
// controls for a track the user hasn't played yet, we briefly play the intro
// clip (intro-clip.mp3) on its own element, then stop. The real track is never
// touched. Android only grants the media notification to playback that produces
// REAL audible output (muted/volume-0/silent-clip all fail or flake), so the
// intro is audible — but quiet and short, and an intentional intro rather than
// the track's opening.
//   HOLD_MS — how long the intro plays before pausing (ms). 150/300 were
//             intermittent on Android; 600 was the first reliable value.
//   VOLUME  — intro loudness, 0..1 (audio.volume is hard-capped at 1). Must be
//             > 0 to hold audio focus; keep low so it's unobtrusive.
const MEDIA_ACTIVATION_HOLD_MS = 600;
const MEDIA_ACTIVATION_VOLUME  = 0.3;

// reports.html — iframe sandbox for the report viewer. true = allow-scripts
// allow-same-origin (needed for in-page anchor nav, sticky nav, CDN scripts
// inside reports; trade-off: a report's JS can reach the parent frame, so
// only safe when uploaded reports are trusted admin-controlled files).
// false = allow-scripts only (stricter, breaks same-origin-dependent reports).
const REPORT_SAME_ORIGIN = true;
