"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { INSTALL_PROMPT_EVENT, INSTALL_PROMPT_KEY } from "@/lib/install-prompt";
import { SITE_NAME } from "@/lib/site";
import { primaryButton } from "../create/styles";
import { Steps } from "./steps";

/** Chrome's install prompt event. Not in the TypeScript DOM types yet. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PromptWindow = Window & { [INSTALL_PROMPT_KEY]?: BeforeInstallPromptEvent | null };

function subscribePrompt(onChange: () => void) {
  window.addEventListener(INSTALL_PROMPT_EVENT, onChange);
  return () => window.removeEventListener(INSTALL_PROMPT_EVENT, onChange);
}

function readPrompt(): BeforeInstallPromptEvent | null {
  return (window as PromptWindow)[INSTALL_PROMPT_KEY] ?? null;
}

function storePrompt(event: BeforeInstallPromptEvent | null) {
  (window as PromptWindow)[INSTALL_PROMPT_KEY] = event;
  window.dispatchEvent(new Event(INSTALL_PROMPT_EVENT));
}

function isStandalone(): boolean {
  try {
    const nav = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
  } catch {
    return false;
  }
}

const noopSubscribe = () => () => {};

export function AndroidInstall() {
  const prompt = useSyncExternalStore(subscribePrompt, readPrompt, () => null);
  const standalone = useSyncExternalStore(noopSubscribe, isStandalone, () => false);
  const [status, setStatus] = useState<"idle" | "installed" | "dismissed">("idle");

  useEffect(() => {
    // Catches the event when this page was reached without a full load (the inline script didn't run).
    const onPrompt = (e: Event) => {
      e.preventDefault();
      storePrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      storePrompt(null);
      setStatus("installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    // The event can only be used once.
    storePrompt(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setStatus(choice.outcome === "accepted" ? "installed" : "dismissed");
    } catch {
      setStatus("dismissed");
    }
  };

  const shareStep = (
    <>
      In the YouTube app, tap <b>Share</b> under any video and pick <b>{SITE_NAME}</b>. If it isn&apos;t in the
      list, tap <b>More</b>.
    </>
  );

  if (standalone || status === "installed") {
    return (
      <p role="status" className="text-base">
        {SITE_NAME} is installed. {shareStep}
      </p>
    );
  }

  return (
    <>
      <p className="text-muted">Install the app once. Then it shows up when you tap Share in YouTube.</p>
      {prompt ? (
        <button type="button" onClick={install} className={`${primaryButton} self-start`}>
          Install app
        </button>
      ) : null}
      {status === "dismissed" ? (
        <p role="status" className="text-sm text-muted">
          No problem. You can install it any time from the browser menu.
        </p>
      ) : null}
      {prompt ? <p className="text-sm font-medium text-muted">Or do it by hand:</p> : null}
      <Steps
        steps={[
          <>Open this page in Chrome.</>,
          <>
            Tap the <b>⋮</b> menu at the top right, then <b>Install app</b> or <b>Add to Home screen</b>.
          </>,
          shareStep,
        ]}
      />
    </>
  );
}
