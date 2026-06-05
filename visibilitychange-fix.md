# TASK: Fix background/foreground logging on the visibilitychange handler

Status: diagnosed, design agreed, NOT yet implemented.
File to change: `index.html` (the player), `visibilitychange` event handler.

## Symptom (from real logs, user on Android Chrome)
User paused the track from earphones while the phone was locked, later unlocked the
phone and pressed play. Instead of a `foreground` event on unlock, an extra `background`
was logged. Observed event sequence for one session:

```
00:02:07  pause       position 355826ms   (paused from earphones, screen locked)
01:04:05  background   position 355826ms   (~1 hour later, visibility hidden fired)
01:04:16  resume       position 355826ms   (user pressed play)
01:04:29  background   position 367090ms   ← WRONG: expected a foreground around unlock
```

## Root cause
The current `visibilitychange` handler conflates SCREEN state with PLAY state:

```javascript
document.addEventListener('visibilitychange', () => {
  if (!currentTrack || audio.ended) return;
  if (document.visibilityState === 'hidden') {
    logEvent('background');
  } else {
    lastPosition = audio.currentTime;
    if (!audio.paused) { logEvent('foreground'); resetWatchdog(); }  // <-- gated on playing
  }
});
```

Two problems:
1. The "visible" branch only logs `foreground` when `!audio.paused`. So unlocking while
   paused logs NO foreground — the background/foreground pairing becomes asymmetric.
2. `background` is logged unconditionally on hidden, even when the track is paused — so a
   paused, locked phone still emits `background`. Combined with (1), you get backgrounds
   with no matching foreground.

## Agreed correct design
`background` and `foreground` must reflect SCREEN visibility only — independent of whether
audio is playing or paused. Play/pause state is already captured by the `start`, `pause`,
`resume`, `end`, and `stop` events. Do not gate visibility events on play state.

Rules:
- On `visibilitychange` → hidden: log `background` (screen locked / tab hidden).
- On `visibilitychange` → visible: log `foreground` (screen unlocked / tab shown).
- Keep the existing `if (!currentTrack || audio.ended) return;` guard so we only log
  visibility while a track session is active.
- Preserve the side effects that currently live in the handler:
  - on hidden: nothing extra needed beyond the log
  - on visible: still set `lastPosition = audio.currentTime` and call `resetWatchdog()`
    so the stall watchdog re-baselines after the screen comes back. These should run
    regardless of play state (they are about the watchdog, not about logging).

### Target implementation
```javascript
document.addEventListener('visibilitychange', () => {
  if (!currentTrack || audio.ended) return;
  if (document.visibilityState === 'hidden') {
    logEvent('background');
  } else {
    logEvent('foreground');
    lastPosition = audio.currentTime;
    if (!audio.paused) resetWatchdog();   // only re-arm the watchdog if actually playing
  }
});
```

Rationale: `foreground` now always pairs with a prior `background`. The watchdog is only
re-armed when audio is actually playing (a paused track has nothing to stall on), but the
`foreground` log itself is unconditional.

## Verification
After the change, reproduce the original scenario on a real phone:
1. Start a track, lock the screen → expect `background`.
2. Pause from earphones/lock screen → expect `pause`.
3. Unlock the phone → expect `foreground` (NOT background), even though still paused.
4. Press play → expect `resume`.
5. Lock again → expect `background`.

Confirm in the exported logs that every `background` has a following `foreground` on the
next unlock, and that no `background` is emitted on unlock.

## Notes
- This is logging-only; it must not change playback behaviour.
- Do not introduce a flag that is set and immediately unset (an earlier anti-pattern in this
  project). The fix is purely about what the two visibility branches log.
- Heartbeats, end detection (timeupdate), and the stop-on-switch logic are unrelated and
  must be left intact.
