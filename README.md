# tracks-player

Frontend audio player for the **Azreon Tracks Platform** (audio streaming research tool). A single-page HTML/JS application hosted on GitHub Pages.

---

## What This Is

A mobile-friendly web player that:
- Authenticates users via email OTP (one-time password)
- Shows each user their permitted audio tracks
- Streams audio securely via the Cloudflare Worker backend
- Logs every play event (start, pause, resume, end, stop, heartbeat, error, background, foreground) for research compliance
- Works on any browser, any device — no app install required

All backend logic (auth, streaming, access control, logging) lives in the [audio-worker](https://github.com/azreon-lab1/audio-worker) repository.

---

## Live URL

```
https://azreon-lab1.github.io/tracks-player
```

---

## How It Works

```
User's phone
     ↓
GitHub Pages (this repo — index.html)
     ↓
Cloudflare Worker (audio-worker)
     ↓
Backblaze B2 (audio files) + Cloudflare D1 (database)
```

1. User opens the URL on their phone
2. Enters email → receives 6-digit OTP code
3. Enters code → receives a session token (valid 93 days)
4. Token stored in `localStorage` — no re-login needed on return visits
5. Track list loads — only tracks permitted for that user
6. Tap a track → audio streams via the Worker from Backblaze B2 (downloads full file as a blob in the background for gapless playback)
7. All play events logged to D1 with UTC millisecond timestamps

---

## Files

```
tracks-player/
├── index.html    ← Complete player — HTML, CSS, and JS in one file
├── .gitignore
└── README.md
```

---

## Configuration

Configuration lives at the top of the `<script>` section in `index.html`:

```javascript
const WORKER = 'https://audio-worker.azreon.workers.dev';  // Worker URL

const DEFAULT_MODE = 'blob';        // 'blob' (preload), 'stream', or 'hybrid'
const MODE_TOGGLE_POSITION = 'bottom'; // 'player' or 'bottom' — where the toggle sits
const SINGLE_TRACK_HIDES_LIST = true;  // direct links show only the player
const FADE_AUDIO_ACTIONS = true;       // fade play/pause to avoid click/pop
let   LOG_HEARTBEAT = true;             // default; overridden by server setting

const UI = {                    // all labels and text — edit to rebrand
  PLATFORM_NAME:   'Azreon Tracks Platform',
  AUTH_TITLE:      'Authentication Step',
  // ... mode labels/hints, messages, etc.
};
```

### Playback modes
The player offers three modes, with a user-facing toggle for the first two:
- **blob (Preload):** downloads the full track first, then plays. No glitches, works offline once loaded. The default.
- **stream:** plays immediately, streams as you go. Needs a connection throughout.
- **hybrid:** streams immediately then swaps to a blob mid-play. Has a small audible blip at the switch, so it is NOT offered in the UI — only selectable by setting `DEFAULT_MODE = 'hybrid'`.

The user's choice persists in `localStorage` (`ap_mode`) and applies from the next track tap onward. `MODE_TOGGLE_POSITION` controls whether the toggle appears in the player card or its own card below the list.

### End detection
The player uses the `timeupdate` event (fires ~4x/sec while playing) as the primary track-end detector, with the native `ended` event as backup. This is reliable even when the screen is locked, because the blob's `ended` event does not fire reliably on mobile browsers. A single `handleTrackEnd()` function with a `wasPlaying` mutex ensures `end` is logged exactly once.

### Click-free playback
`FADE_AUDIO_ACTIONS` (when true) fades the volume over ~40ms on every play and pause via `fadePlay()`/`fadePause()`, preventing click/pop sounds from abrupt transitions. No effect on iOS Safari, which ignores `audio.volume`.

### Direct track links (home-screen widgets)
A URL parameter opens the player and auto-plays a specific track:
```
https://azreon-lab1.github.io/tracks-player?track=T1
```
Uses the track's `track_code`. Survives the login flow — if the session expired, the participant logs in and the track plays once they're in. Auto-play is attempted; if the browser blocks it, the track sits loaded with the play button ready (one tap). If the track code is invalid or not accessible, a friendly message shows.

When `SINGLE_TRACK_HIDES_LIST` is true, a valid direct link shows only the player (track list and mode toggle hidden) — a focused single-track experience ideal for phone home-screen widgets.

### Remote settings
On load, the player reads settings from the `/tracks` response. Currently `log_heartbeat` (`'1'`/`'0'`) controls whether heartbeat events are logged — changeable from the admin tool's Settings tab or directly in the database, with no redeploy. The heartbeat timer always runs; only the logging is gated.

---

## Deployment

This repo deploys automatically via GitHub Pages on every push to `main`.

To update the player:
```powershell
git add index.html
git commit -m "Update player"
git push origin main
```

GitHub Pages rebuilds within ~60 seconds.

---

## Backend Setup

See [audio-worker](https://github.com/azreon-lab1/audio-worker) for:
- Worker setup and deployment
- Database schema and management
- Adding participants and tracks
- Viewing play logs

---

## Notes

- **No download:** `controlsList="nodownload"` and right-click disabled
- **No direct file URL:** audio files are never exposed — served through the Worker only
- **Token in audio URL:** The `<audio>` element cannot send custom headers, so the session token is passed as `?t=TOKEN` query param — validated server-side on every request
- **Safari/iOS:** The Worker handles Safari's `bytes=0-1` probe request correctly, returning HTTP 206 for proper seeking support
