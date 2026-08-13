import { useEffect, useState, useCallback } from "react";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    // iOS Safari's own (non-standard) flag - there's no display-mode match
    // for it.
    window.navigator?.standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * Registers the service worker once, and surfaces enough state for a
 * custom "Install app" banner (see InstallPwaBanner.js). Chrome/Edge/
 * Android fire `beforeinstallprompt`, which we capture and replay on
 * demand via `promptInstall()` - the event is only usable once, so it's
 * cleared after either outcome. iOS Safari never fires that event at all
 * (no programmatic install API exists there); `isIos` lets the banner
 * show manual "Share > Add to Home Screen" instructions instead.
 */
export default function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing (e.g. served over plain http in some dev
      // setups) shouldn't break the rest of the app - it just means no
      // installability/offline fallback this session.
    });
  }, []);

  useEffect(() => {
    setInstalled(isStandalone());

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome; // "accepted" | "dismissed"
  }, [deferredPrompt]);

  return {
    installed,
    canPromptInstall: !!deferredPrompt,
    promptInstall,
    isIos: isIos(),
  };
}
