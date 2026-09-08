"use client";

import { useEffect, useState } from "react";

export function InstallApp({ compact = false }: { compact?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [help, setHelp] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const nav = window.navigator as Navigator & { standalone?: boolean };
    setStandalone(media.matches || Boolean(nav.standalone));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => null);
    }
    setReady(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!ready || standalone) return null;

  async function install() {
    if (promptEvent) {
      await promptEvent.prompt();
      setPromptEvent(null);
      return;
    }
    setHelp((v) => !v);
  }

  return (
    <div className="relative">
      <button type="button" onClick={install} className={compact ? "btn-ghost px-3 text-[11px]" : "btn-ghost"} aria-expanded={help}>
        {promptEvent ? (compact ? "Install" : "Install Apogee") : compact ? "Save" : "Save Apogee"}
      </button>
      {help ? (
        <div className="glass-3 absolute right-0 z-50 mt-2 w-64 p-3 text-xs leading-relaxed text-ivory/85">
          This browser has no install prompt. On iPhone: Share → Add to Home Screen. On desktop Chrome: menu → Save and
          share → Install page as app. The site still works in the tab.
        </div>
      ) : null}
    </div>
  );
}
