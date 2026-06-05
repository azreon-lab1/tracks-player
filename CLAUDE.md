# CLAUDE.md — Azreon Tracks Platform (Player / Frontend)

> Project context for Claude Code. This repo is the **frontend player**.
> The backend (Cloudflare Worker) and admin tool live in the separate
> `audio-worker` repo — that repo has its own, fuller CLAUDE.md.

## What this is
A single-file web audio player (`index.html`) for a **research study**, hosted on
**GitHub Pages** at https://azreon-lab1.github.io/tracks-player. Participants log in
with email + one-time code, listen to assigned tracks, and every playback action is
logged to the backend for compliance analysis.

**Tone of work:** consistent and scalable. Diagnose root causes before changing code.
No temporary/dodgy patches. Verify changes with explicit reasoning. The platform is
mobile-first (Android Chrome, iOS Safari) — screen-lock behaviour matters a lot.

## The backend it talks to
- Worker base URL: `https://audio-worker.azreon.workers.dev` (the `WORKER` constant)
- `GET /tracks` (Bearer token) → allowed tracks + player `settings` (e.g. log_heartbeat)
- `GET /audio/:key?t=TOKEN` → audio stream (HTTP 206 range)
- `POST /log` (Bearer token) → one play event
- Auth: `POST /auth/send-otp`, `POST /auth/verify-otp` → session token (93-day), stored in localStorage `ap_token`.

## File
Everything is in `index.html` — HTML, CSS, and JS in one file. Config constants live
at the top of the `<script>`:
- `WORKER` — Worker URL
- `DEFAULT_MODE = 'blob'` — 'blob' (preload), 'stream', or 'hybrid'
- `MODE_TOGGLE_POSITION = 'bottom'` — 'player' or 'bottom'
- `SINGLE_TRACK_HIDES_LIST = true` — direct links show only the player
- `FADE_AUDIO_ACTIONS = true` — fade volume on play/pause to avoid click/pop
- `let LOG_HEARTBEAT = true` — default; overridden at runtime by server settings.log_heartbeat
- `UI = {...}` — all labels/text (PLATFORM_NAME, AUTH_TITLE='Authentication Step', mode hints, messages)

## Playback modes (three)
User toggle for the first two; choice persisted in localStorage `ap_mode`, applies from next track tap.
- **blob (Preload)** — download the full file, then play. No glitches, works offline once loaded. Default.
- **stream** — play immediately, stream as you go.
- **hybrid** — stream then swap to blob mid-play. Has an audible blip at the switch. NOT in the UI; only via `DEFAULT_MODE='hybrid'`.

## Event logging (POST /log)
Event types: `start | pause | resume | end | stop | heartbeat | error | background | foreground`
- **end** — track reached full duration. Detected primarily via the `timeupdate` event
  (fires ~4x/sec, keeps working when the screen is locked because JS stays alive via the
  heartbeat timer), with the native `ended` event as backup. A single `handleTrackEnd()`
  function with a `wasPlaying` mutex ensures `end` is logged exactly once. (The blob's
  native `ended` does NOT fire reliably on mobile when locked — `timeupdate` is the fix.)
- **stop** — user tapped a different track while one was playing. `playTrack()` logs `stop`
  for the outgoing track (captured before `currentTrack` is overwritten), then mutes,
  pauses, resets, and loads the new track. Excluded from compliance.
- **background / foreground** — screen locked / unlocked, via the `visibilitychange` handler.
- **heartbeat** — every 30s while a track is loaded. Timer always runs; logging gated by `LOG_HEARTBEAT`.

## Key state flags
- `wasPlaying` — the active-session mutex (true between start and end). Guards pause logging and end logging.
- `hasPaused` — distinguishes resume from start.
- `isSwitchingBlob` — true during a hybrid blob swap (suppresses spurious start/end).
- `hasStartedPlaying` — true after the initial canplaythrough.
- `currentTrack`, `sessionId` (new per play session).

## Click-free playback
`FADE_AUDIO_ACTIONS` (when true): `fadePlay()` sets volume 0 then ramps up over ~40ms;
`fadePause()` ramps down then pauses then restores volume. Used by the play/pause button,
initial auto-play, and Media Session handlers. No effect on iOS Safari (it ignores audio.volume).

## Direct track links (home-screen widgets)
`?track=T1` → reads `pendingTrackCode` on load, auto-plays that track (by track_code) once
the list is loaded, survives the login flow (consumed in `loadPlayer()` which runs in both
auth paths). Autoplay attempted; if blocked, the track sits loaded for one-tap play. Friendly
message if the code is invalid/inaccessible. With `SINGLE_TRACK_HIDES_LIST`, the track list
and mode toggle are hidden for a clean single-track widget experience.

## Other mechanisms
- Watchdog: 15s stall detection + reconnect via `audio.load()` and seek-back.
- Media Session API: lock-screen play/pause/stop (routed through fadePlay/fadePause).
- Debounced loading indicator (`loadingDelayTimer`, 400ms) so brief waiting events don't flicker the UI.
- Track list disabled (pointerEvents=none) while a track loads, re-enabled on canplaythrough.

## KNOWN ISSUE under investigation (visibilitychange)
When the user pauses (e.g. from earphones) with the screen locked, then unlocks, the
`visibilitychange` "visible" branch only logs `foreground` if `!audio.paused`. So unlocking
while paused logs nothing, and subsequent lock/visibility cycles can log an extra `background`
instead of the expected foreground. Observed sequence: pause → background → resume → background.
Needs the visibilitychange logic reworked so background/foreground correctly reflect screen
state independent of play/pause state. Diagnose carefully before patching.

## Audio files
Tracks are AAC/.m4a at 192k, encoded from WAV masters with
`ffmpeg -i in.wav -af "afade=t=in:st=0:d=0.01" -c:a aac -b:a 192k -movflags +faststart out.m4a`.
`+faststart` is essential for streaming. A ~1-2s "mic plug-in" pop on some tracks is believed
baked into the WAV masters (edit splice) — to try: ffmpeg adeclick or Audacity Repair.

## Conventions
- One file: edit `index.html` directly.
- No browser storage beyond what's used: `ap_token`, `ap_mode`.
- Test screen-locked behaviour on a real phone — many bugs only appear when locked.
- After changing: commit and push; GitHub Pages serves the repo directly.
