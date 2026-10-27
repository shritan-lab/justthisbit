import type { YTNamespace } from "./youtube-types";

export const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

// One load per page, shared by every player. Survives React strict mode double effects
// because the promise lives at module level, not in a component.
let pending: Promise<YTNamespace> | null = null;

function loadedApi(): YTNamespace | null {
  const yt = window.YT;
  return yt && typeof yt.Player === "function" ? (yt as YTNamespace) : null;
}

/**
 * Loads https://www.youtube.com/iframe_api once and resolves with `window.YT`.
 * Rejects if the script fails to load (offline, blocked by an ad blocker), and the next call tries again.
 */
export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The YouTube player only loads in a browser"));
  }

  const ready = loadedApi();
  if (ready) return Promise.resolve(ready);
  if (pending) return pending;

  pending = new Promise<YTNamespace>((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;

    const fail = (error: Error) => {
      pending = null;
      window.onYouTubeIframeAPIReady = previousCallback;
      reject(error);
    };

    // YouTube calls this global once the API is ready. Keep any callback someone else set.
    window.onYouTubeIframeAPIReady = () => {
      try {
        previousCallback?.();
      } catch {
        // Someone else's callback failing must not break our player.
      }
      const api = loadedApi();
      if (api) resolve(api);
      else fail(new Error("The YouTube player API loaded without YT.Player"));
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${IFRAME_API_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("error", () => {
      script.remove();
      fail(new Error("Could not load the YouTube player"));
    });
    if (!existing) {
      script.src = IFRAME_API_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return pending;
}
