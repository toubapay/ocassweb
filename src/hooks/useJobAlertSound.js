import { useEffect, useRef, useState } from "react";

const MUTE_KEY = "ocass_job_alert_muted";

/**
 * A short two-note chime whenever the number of open jobs goes UP, for an
 * agent/rider who has the app open but isn't looking at it.
 *
 * Synthesised with the Web Audio API rather than shipping an mp3: it's a
 * few lines, there's no asset to cache or fail to load on a Senegalese
 * mobile connection, and the service worker (public/sw.js) deliberately
 * caches no media - so a file would be re-fetched to make a beep.
 *
 * Three rules this has to respect, and each one is a real browser
 * behaviour rather than caution:
 *
 * 1. **Only on a rise.** The first count an agent sees on page load is
 *    not news, and a beep on every 15s poll that returns the same 2 jobs
 *    would have the app muted within a minute. The previous count is kept
 *    in a ref, seeded on the first value, and only a strictly higher
 *    number rings.
 * 2. **Autoplay is not granted.** An AudioContext created before the user
 *    has interacted with the page starts suspended, and resume() rejects.
 *    That's silently accepted here - the badge is still on screen, so a
 *    missed chime costs nothing, whereas an unhandled rejection in a poll
 *    callback is a console error on every tick.
 * 3. **It must be muteable, and stay muted.** A courier who is riding, or
 *    in a meeting, or just tired of it, gets a speaker toggle persisted in
 *    localStorage - a sound you cannot turn off is worse than no sound.
 *    localStorage is wrapped: it throws outright in a private window with
 *    site data blocked.
 */
export default function useJobAlertSound(count) {
  const [muted, setMuted] = useState(false);
  const previousRef = useRef(null);
  const contextRef = useRef(null);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem(MUTE_KEY) === "1");
    } catch {
      // Storage unavailable - default to audible, don't crash the card.
    }
  }, []);

  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    try {
      window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      // The toggle still works for this session; it just won't persist.
    }
  };

  useEffect(() => {
    if (typeof count !== "number") return;
    const previous = previousRef.current;
    previousRef.current = count;
    // First value seen this mount: remember it, don't announce it.
    if (previous === null) return;
    if (count <= previous || mutedRef.current) return;

    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!contextRef.current) contextRef.current = new AudioCtor();
      const ctx = contextRef.current;
      // Returns a promise in every current browser, but older Safari
      // returns undefined - hence the optional call rather than .catch().
      const resumed = ctx.resume?.();
      if (resumed?.catch) resumed.catch(() => {});

      // Two rising notes, 120ms apart, ~0.35s total: long enough to hear
      // over street noise, short enough not to be a ringtone.
      [
        { freq: 880, at: 0 },
        { freq: 1175, at: 0.12 },
      ].forEach(({ freq, at }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = ctx.currentTime + at;
        // Ramped rather than switched on/off: a gain that jumps produces
        // an audible click at both ends of the note.
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
        gain.gain.linearRampToValueAtTime(0, start + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.22);
      });
    } catch {
      // No audio on this device/context. The badge is the real signal.
    }
  }, [count]);

  useEffect(
    () => () => {
      contextRef.current?.close?.();
    },
    []
  );

  return { muted, toggleMuted };
}
