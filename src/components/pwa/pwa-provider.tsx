"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallMessage = "dismissed" | "failed" | "accepted" | null;
interface PwaState {
  available: boolean;
  installing: boolean;
  installed: boolean;
  standalone: boolean;
  message: InstallMessage;
  install(): Promise<void>;
}

const PwaContext = createContext<PwaState | null>(null);
function standalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone
  );
}
function subscribeDisplayMode(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const serverStandalone = () => false;

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState<InstallMessage>(null);
  const inApp = useSyncExternalStore(
    subscribeDisplayMode,
    standalone,
    serverStandalone,
  );

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
      setMessage(null);
    };
    const onInstalled = () => {
      setPrompt(null);
      setInstalled(true);
      setMessage(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (
      process.env.NODE_ENV === "production" &&
      window.isSecureContext &&
      "serviceWorker" in navigator
    ) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Installation guidance remains usable if the browser restricts workers.
          console.warn("AyosDito offline screen could not be enabled.");
        });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!prompt || installing) return;
    setInstalling(true);
    setPrompt(null);
    setMessage(null);
    try {
      await prompt.prompt();
      setMessage((await prompt.userChoice).outcome);
    } catch {
      setMessage("failed");
    } finally {
      setInstalling(false);
    }
  }, [prompt, installing]);

  return (
    <PwaContext.Provider
      value={{
        available: !!prompt && !installed && !inApp,
        installing,
        installed,
        standalone: inApp,
        message,
        install,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) throw new Error("PWA controls require PwaProvider.");
  return context;
}
