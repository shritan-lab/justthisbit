// Runs on https://www.youtube.com/* pages. Adds a "Clip" button next to Like and Share and opens
// the Clip panel below the action row (or beside a Short). Never draws on top of the video.
//
// YouTube is a single-page app, so placement runs again on every yt-navigate-finish event, and a
// MutationObserver catches re-renders that remove our nodes. Placement is idempotent: it never
// adds a second button and does nothing when everything is already in place.

import { clipIcon, h } from "./dom";
import { isStateRequest, type StateReply } from "./messages";
import { createPanel } from "./panel";
import { isTypingElement, keyTarget, matchShortcut, type ShortcutAction } from "./shortcuts";
import { STYLES } from "./styles";
import {
  SPOTS,
  WATCH_PANEL_AFTER,
  boxesOverlap,
  floatingSpot,
  isVisibleBox,
  pageKindOf,
  videoIdOf,
  type Box,
  type PageKind,
} from "./youtube-page";

const BUTTON_ATTR = "data-jtb-clip-button";
const PANEL_ATTR = "data-jtb-clip-panel";

let kind: PageKind | null = null;
let videoId: string | null = null;
let isOpen = false;

function first(selectors: readonly string[], root: ParentNode = document): HTMLElement | null {
  for (const selector of selectors) {
    const found = root.querySelector<HTMLElement>(selector);
    if (found) return found;
  }
  return null;
}

function box(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

function findVideo(page: PageKind | null): HTMLVideoElement | null {
  if (!page) return null;
  const el = first(SPOTS[page].video);
  return el instanceof HTMLVideoElement ? el : null;
}

function currentTime(): number | null {
  const video = findVideo(pageKindOf(location.pathname));
  const t = video?.currentTime;
  return typeof t === "number" && Number.isFinite(t) ? t : null;
}

/** On Shorts the action bar sits beside the video on wide windows and on top of it on narrow ones. */
function shortsPlayerBox(): Box | null {
  const player = document.querySelector("#shorts-player") ?? findVideo("shorts");
  return player ? box(player) : null;
}

function findButtonRow(page: PageKind): HTMLElement | null {
  if (page === "shorts") {
    // Prefer the action bar in the same reel as the playing video.
    const reel = document.querySelector("#shorts-player")?.closest("ytd-reel-video-renderer");
    const inReel = reel ? first(SPOTS.shorts.buttonRow, reel) : null;
    if (inReel) return inReel;
  }
  return first(SPOTS[page].buttonRow);
}

// ---------- The Clip button ----------

function makeButtonHost(page: PageKind): HTMLElement {
  const host = h(document, "span", { [BUTTON_ATTR]: "", "data-kind": page });
  host.style.display = page === "shorts" ? "flex" : "inline-flex";
  host.style.alignItems = "center";
  host.style.justifyContent = "center";
  const root = host.attachShadow({ mode: "open" });
  const style = h(document, "style", {}, [STYLES]);
  const content =
    page === "shorts"
      ? [h(document, "span", { class: "jtb-clip-icon" }, [clipIcon(document)]), h(document, "span", { class: "jtb-clip-label" }, ["Clip"])]
      : [clipIcon(document), "Clip"];
  const button = h(
    document,
    "button",
    {
      type: "button",
      class: `jtb jtb-clip${page === "shorts" ? " is-shorts" : ""}`,
      "aria-expanded": "false",
      "aria-label": "Clip this bit",
      title: "Clip this bit (Alt+Shift+S)",
    },
    content,
  );
  button.addEventListener("click", () => (isOpen ? closePanel() : openPanel()));
  root.append(style, button);
  return host;
}

function buttonOf(host: Element | null): HTMLButtonElement | null {
  return host?.shadowRoot?.querySelector("button") ?? null;
}

function setIfChanged(el: Element, name: string, value: string) {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

function placeButton(page: PageKind | null) {
  const row = page ? findButtonRow(page) : null;
  let usable = row !== null;
  if (row && page === "shorts") {
    const player = shortsPlayerBox();
    usable = player === null || !isVisibleBox(player) || !boxesOverlap(box(row), player);
  }

  // Keep exactly one button: the first one inside the current row, of the right kind.
  let keep: Element | null = null;
  for (const el of Array.from(document.querySelectorAll(`[${BUTTON_ATTR}]`))) {
    if (!keep && usable && el.parentElement === row && el.getAttribute("data-kind") === page) keep = el;
    else el.remove();
  }
  if (!row || !page || !usable) return;

  if (!keep) {
    keep = makeButtonHost(page);
    // On Shorts the last item is the sound/remix tile. Go just above it, right after Share.
    const before = page === "shorts" ? row.querySelector(":scope > pivot-button-view-model") : null;
    if (before) row.insertBefore(keep, before);
    else row.append(keep);
  }
  setIfChanged(keep, "data-theme", document.documentElement.hasAttribute("dark") ? "dark" : "light");
  const button = buttonOf(keep);
  if (button) setIfChanged(button, "aria-expanded", String(isOpen));
}

// ---------- The panel ----------

const panel = createPanel({
  doc: document,
  mode: "inline",
  videoId: () => videoId,
  readTime: async () => currentTime(),
  onClose: () => closePanel(),
});

const panelHost = h(document, "div", { [PANEL_ATTR]: "" });
{
  const root = panelHost.attachShadow({ mode: "open" });
  root.append(h(document, "style", {}, [STYLES]), panel.element);
}

function setPanelMode(mode: "inline" | "floating") {
  panel.element.classList.toggle("is-inline", mode === "inline");
  panel.element.classList.toggle("is-floating", mode === "floating");
}

function noRoom() {
  closePanel();
  const label = buttonOf(document.querySelector(`[${BUTTON_ATTR}]`))?.querySelector(".jtb-clip-label");
  if (!label) return;
  label.textContent = "No room";
  window.setTimeout(() => (label.textContent = "Clip"), 2500);
}

/** Puts the open panel in place. Returns false when there is nowhere to put it. */
function placePanel(): boolean {
  if (kind === "watch") {
    const anchor = first(WATCH_PANEL_AFTER);
    if (!anchor) return false;
    setPanelMode("inline");
    panelHost.style.cssText = "display:block;";
    if (anchor.nextElementSibling !== panelHost) anchor.after(panelHost);
    return true;
  }

  if (kind === "shorts") {
    const row = findButtonRow("shorts");
    const player = shortsPlayerBox();
    if (!row || !player) return false;
    setPanelMode("floating");
    if (panelHost.parentElement !== document.body) document.body.append(panelHost);
    const size = panel.element.getBoundingClientRect();
    const spot = floatingSpot({
      viewport: { width: window.innerWidth, height: window.innerHeight },
      video: player,
      actions: box(row),
      panel: { width: size.width || 340, height: size.height || 560 },
    });
    if (!spot) return false;
    const css = `position:fixed;left:${Math.round(spot.left)}px;top:${Math.round(spot.top)}px;z-index:2100;display:block;`;
    if (panelHost.style.cssText !== css) panelHost.style.cssText = css;
    return true;
  }

  return false;
}

function openPanel() {
  if (!kind || !videoId) return;
  isOpen = true;
  panel.open(currentTime());
  if (!placePanel()) {
    if (kind === "shorts") noRoom();
    else closePanel();
    return;
  }
  placeButton(kind);
  if (kind === "watch") panelHost.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function closePanel() {
  isOpen = false;
  panelHost.remove();
  placeButton(kind);
}

// ---------- Keeping it all in place ----------

function ensure() {
  const nextKind = pageKindOf(location.pathname);
  const nextId = videoIdOf(location.href);
  if (nextKind !== kind || nextId !== videoId) {
    kind = nextKind;
    videoId = nextId;
    if (isOpen) closePanel();
  }
  if (!kind || !videoId) {
    placeButton(null);
    return;
  }
  placeButton(kind);
  if (isOpen && !placePanel()) closePanel();
}

let scheduled = false;
function ensureSoon() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    ensure();
  }, 100);
}

async function runShortcut(action: ShortcutAction) {
  if (!isOpen) openPanel();
  if (action === "start") await panel.startNow();
  else if (action === "end") await panel.endNow();
  else await panel.copy();
}

function onKeyDown(event: KeyboardEvent) {
  const action = matchShortcut(event);
  if (!action || isTypingElement(keyTarget(event))) return;
  if (!pageKindOf(location.pathname) || !videoIdOf(location.href)) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.repeat) return;
  ensure();
  void runShortcut(action);
}

function start() {
  // A second copy of this script (it should not happen, but costs nothing to guard) stays idle.
  const flag = "__justThisBitClip";
  const scope = globalThis as unknown as Record<string, unknown>;
  if (scope[flag]) return;
  scope[flag] = true;

  window.addEventListener("yt-navigate-finish", ensureSoon);
  document.addEventListener("yt-navigate-finish", ensureSoon);
  window.addEventListener("popstate", ensureSoon);
  window.addEventListener("resize", ensureSoon);
  window.addEventListener("keydown", onKeyDown, true);
  new MutationObserver(ensureSoon).observe(document.documentElement, { childList: true, subtree: true });

  // The toolbar popup asks the tab for the video and its time.
  try {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (isStateRequest(message)) {
        const reply: StateReply = { videoId: videoIdOf(location.href), time: currentTime() };
        sendResponse(reply);
      }
      return false;
    });
  } catch {
    // Not running as an extension (or the extension was reloaded). The in-page button still works.
  }

  ensure();
}

start();
