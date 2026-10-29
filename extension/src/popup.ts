// The toolbar popup: the same Clip panel, for when the in-page button can't be placed.
// It asks the YouTube tab's content script for the video and its time. If the content script is
// not there (the tab was open before the extension was installed), it reads the video from the
// tab's URL, which the activeTab permission allows after the toolbar click.

import { parseYouTubeInput } from "../../lib/youtube";
import { h } from "./dom";
import { STATE_MESSAGE, readStateReply, type StateReply } from "./messages";
import { createPanel } from "./panel";
import { isTypingElement, keyTarget, matchShortcut } from "./shortcuts";
import { STYLES } from "./styles";
import { videoIdOf } from "./youtube-page";

async function targetTab(): Promise<chrome.tabs.Tab | null> {
  // popup.html?tab={id} talks to that tab instead of the active one. The e2e test uses this,
  // because a popup opened as a normal page is itself the active tab.
  const fromQuery = Number(new URLSearchParams(location.search).get("tab"));
  try {
    if (Number.isSafeInteger(fromQuery) && fromQuery > 0) return await chrome.tabs.get(fromQuery);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab ?? null;
  } catch {
    return null;
  }
}

async function askTab(tabId: number): Promise<StateReply | null> {
  try {
    return readStateReply(await chrome.tabs.sendMessage(tabId, { type: STATE_MESSAGE }));
  } catch {
    // No content script in that tab.
    return null;
  }
}

function showMessage(root: HTMLElement, text: string) {
  root.replaceChildren(h(document, "p", { class: "jtb jtb-message", "data-testid": "jtb-popup-message" }, [text]));
}

async function main() {
  document.head.append(h(document, "style", {}, [STYLES]));
  const root = document.getElementById("app");
  if (!root) return;

  const tab = await targetTab();
  const tabId = tab?.id;
  const reply = tabId === undefined ? null : await askTab(tabId);
  const url = tab?.url ?? "";
  const videoId = reply?.videoId ?? videoIdOf(url);

  if (tabId === undefined || !videoId) {
    showMessage(root, "Open a YouTube video, then click this button again.");
    return;
  }

  const panel = createPanel({
    doc: document,
    mode: "popup",
    videoId: () => videoId,
    readTime: async () => (await askTab(tabId))?.time ?? null,
  });

  const notice = reply
    ? null
    : h(document, "p", { class: "jtb jtb-message", "data-testid": "jtb-popup-message" }, [
        "Reload the YouTube tab so Set to now can read the video time.",
      ]);
  root.replaceChildren(...(notice ? [notice] : []), panel.element);
  panel.open(reply?.time ?? parseYouTubeInput(url)?.startSeconds ?? 0);

  document.addEventListener("keydown", (event) => {
    const action = matchShortcut(event);
    if (!action || isTypingElement(keyTarget(event))) return;
    event.preventDefault();
    if (action === "start") void panel.startNow();
    else if (action === "end") void panel.endNow();
    else void panel.copy();
  });
}

void main();
