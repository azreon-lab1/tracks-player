# tracks-player

Frontend audio player for the **Azreon Tracks Platform** (audio streaming research tool). A single-page HTML/JS application hosted on GitHub Pages.

---

## What This Is

A mobile-friendly web player that:
- Authenticates users via email OTP (one-time password)
- Shows each user their permitted audio tracks
- Streams audio securely via the Cloudflare Worker backend
- Logs every play event (start, pause, resume, end, heartbeat, error, background, foreground) for research compliance
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
const DOWNLOAD_MODE = 'blob';   // 'blob' (download then gapless) or 'stream'
const LOG_HEARTBEAT = true;     // set false to suppress heartbeat logs

const UI = {                    // all labels and text — edit to rebrand
  PLATFORM_NAME:   'Azreon Tracks Platform',
  PLATFORM_ARTIST: 'Azreon Tracks Platform',
  // ... etc
};
```

**End detection:** The player uses the `timeupdate` event (fires ~4x/sec while playing) as the primary track-end detector, with the native `ended` event as backup. This is reliable even when the screen is locked, because the blob's `ended` event does not fire reliably on mobile browsers.

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
