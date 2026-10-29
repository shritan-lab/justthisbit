// The Clip panel: Start and End with "Set to now", length chips, a note, the live length and
// "Copy link" / "Open". Used in three places: below YouTube's action row, floating beside a
// Short, and in the toolbar popup.

import { copyText } from "./clipboard";
import { clipIcon, h } from "./dom";
import {
  LENGTH_CHIPS,
  openState,
  tidyTimes,
  viewOf,
  withEndNow,
  withEndText,
  withLength,
  withNote,
  withStartNow,
  withStartText,
  type PanelState,
} from "./panel-state";

export type PanelMode = "inline" | "floating" | "popup";

export type PanelOptions = {
  doc: Document;
  mode: PanelMode;
  /** The video the link is for. Read on every render, so it is always the current one. */
  videoId: () => string | null;
  /** The video's current time in seconds, or null when it cannot be read. */
  readTime: () => Promise<number | null>;
  /** Shows a close button that calls this. */
  onClose?: () => void;
};

export type Panel = {
  element: HTMLElement;
  /** Resets the fields: start at `now`, end 30 seconds later, empty note. */
  open: (now: number | null) => void;
  startNow: () => Promise<void>;
  endNow: () => Promise<void>;
  copy: () => Promise<void>;
};

const COPIED_MS = 2000;
const TIME_UNREADABLE = "Couldn't read the video time. Play the video for a moment, then try again.";

export function createPanel({ doc, mode, videoId, readTime, onClose }: PanelOptions): Panel {
  let state: PanelState = openState(0);
  let copiedTimer: number | undefined;

  const timeField = (key: "start" | "end", label: string) => {
    const input = h(doc, "input", {
      id: `jtb-${key}`,
      class: "jtb-input",
      type: "text",
      inputmode: "text",
      autocomplete: "off",
      spellcheck: "false",
      "aria-describedby": `jtb-${key}-error`,
    });
    // One span, so flexbox keeps the spaces around the screen-reader word (as on the create page).
    const now = h(doc, "button", { type: "button", class: "jtb-small" }, [
      h(doc, "span", {}, ["Set ", h(doc, "span", { class: "jtb-sr" }, [`${label.toLowerCase()} `]), "to now"]),
    ]);
    const error = h(doc, "p", { id: `jtb-${key}-error`, class: "jtb-error", role: "alert", hidden: true });
    const field = h(doc, "div", { class: "jtb-field" }, [
      h(doc, "label", { class: "jtb-label", for: `jtb-${key}` }, [label]),
      h(doc, "div", { class: "jtb-row" }, [input, now]),
      error,
    ]);
    return { field, input, now, error };
  };

  const start = timeField("start", "Start");
  const end = timeField("end", "End");

  const chips = LENGTH_CHIPS.map((chip) =>
    h(doc, "button", { type: "button", class: "jtb-small", "aria-pressed": "false", "data-seconds": String(chip.seconds) }, [
      chip.label,
    ]),
  );

  const length = h(doc, "p", { class: "jtb-length", "aria-live": "polite", "data-testid": "jtb-length" });
  const range = h(doc, "p", { class: "jtb-muted" });
  const rangeError = h(doc, "p", { class: "jtb-error", role: "alert", hidden: true });
  const link = h(doc, "p", { class: "jtb-link", "data-testid": "jtb-link" });

  const noteCount = h(doc, "span", { id: "jtb-note-count", class: "jtb-count" });
  const note = h(doc, "textarea", {
    id: "jtb-note",
    class: "jtb-note",
    rows: "2",
    placeholder: "Why it's worth watching",
    "aria-describedby": "jtb-note-count",
  });
  const noteError = h(doc, "p", { class: "jtb-error", role: "alert", hidden: true });

  const copyButton = h(doc, "button", { type: "button", class: "jtb-primary" }, ["Copy link"]);
  const openLink = h(doc, "a", { class: "jtb-secondary", target: "_blank", rel: "noopener noreferrer" }, ["Open"]);
  const status = h(doc, "p", { class: "jtb-status", role: "status", "aria-live": "polite" });

  const closeButton = onClose
    ? h(doc, "button", { type: "button", class: "jtb-close", "aria-label": "Close clip panel" }, ["×"])
    : null;

  const kbd = (text: string) => h(doc, "kbd", {}, [text]);
  const keys = h(doc, "p", { class: "jtb-keys" }, [
    "Keys: ",
    kbd("Alt+Shift+S"),
    " start, ",
    kbd("Alt+Shift+E"),
    " end, ",
    kbd("Alt+Shift+C"),
    " copy link",
  ]);

  const title = h(doc, "h2", { class: "jtb-title" }, [clipIcon(doc), "Clip this bit"]);

  const element = h(
    doc,
    "section",
    { class: `jtb jtb-panel is-${mode}`, "aria-label": "Clip this bit", "data-testid": "jtb-panel" },
    [
      h(doc, "div", { class: "jtb-head" }, [title, closeButton]),
      h(doc, "div", { class: "jtb-times" }, [start.field, end.field]),
      h(doc, "div", { class: "jtb-field" }, [
        h(doc, "span", { class: "jtb-label", id: "jtb-chips-label" }, ["Length from the start"]),
        h(doc, "div", { class: "jtb-chips", role: "group", "aria-labelledby": "jtb-chips-label" }, chips),
      ]),
      h(doc, "div", { class: "jtb-summary" }, [length, range, rangeError, link]),
      h(doc, "div", { class: "jtb-field" }, [
        h(doc, "div", { class: "jtb-note-head" }, [
          h(doc, "label", { class: "jtb-label", for: "jtb-note" }, ["Note (optional)"]),
          noteCount,
        ]),
        note,
        noteError,
      ]),
      h(doc, "div", { class: "jtb-actions" }, [copyButton, openLink]),
      status,
      keys,
    ],
  );

  const setText = (el: HTMLElement, text: string | null) => {
    el.textContent = text ?? "";
    el.hidden = !text;
  };

  // Leave a field alone while it has focus, so the caret never jumps under the person typing.
  const setValue = (field: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    if (field.value !== value && !field.matches(":focus")) field.value = value;
  };

  function render() {
    const id = videoId();
    setValue(start.input, state.startText);
    setValue(end.input, state.endText);
    setValue(note, state.note);

    if (!id) {
      setText(length, "No video");
      setText(range, null);
      setText(rangeError, "Open a YouTube video first.");
      setText(link, null);
      copyButton.disabled = true;
      openLink.removeAttribute("href");
      openLink.setAttribute("aria-disabled", "true");
      return;
    }

    const view = viewOf(state, id);
    setText(length, view.lengthText);
    setText(range, view.rangeText);
    setText(rangeError, view.rangeError);
    setText(start.error, view.startError);
    setText(end.error, view.endError);
    setText(noteError, view.noteError);
    setText(link, view.url);
    start.input.setAttribute("aria-invalid", String(view.startError !== null));
    end.input.setAttribute("aria-invalid", String(view.endError !== null));
    noteCount.textContent = `${view.noteCount}/${view.noteMax}`;
    noteCount.classList.toggle("is-full", view.noteCount >= view.noteMax);

    const startValid = view.startError === null;
    for (const chip of chips) {
      chip.disabled = !startValid;
      chip.setAttribute("aria-pressed", String(view.activeChip === Number(chip.dataset.seconds)));
    }

    copyButton.disabled = view.url === null;
    if (view.url) {
      openLink.href = view.url;
      openLink.removeAttribute("aria-disabled");
    } else {
      openLink.removeAttribute("href");
      openLink.setAttribute("aria-disabled", "true");
    }
  }

  const update = (next: PanelState) => {
    state = next;
    render();
  };

  const say = (message: string) => {
    status.textContent = message;
  };

  async function readNow(): Promise<number | null> {
    const time = await readTime().catch(() => null);
    if (time === null || !Number.isFinite(time)) {
      say(TIME_UNREADABLE);
      return null;
    }
    say("");
    return time;
  }

  async function startNow() {
    const time = await readNow();
    if (time !== null) update(withStartNow(state, time));
  }

  async function endNow() {
    const time = await readNow();
    if (time !== null) update(withEndNow(state, time));
  }

  async function copy() {
    const id = videoId();
    const url = id ? viewOf(state, id).url : null;
    if (!url) {
      say(id ? "Fix the times first, then copy." : "Open a YouTube video first.");
      return;
    }
    const ok = await copyText(doc, url);
    if (!ok) {
      say("Couldn't copy. Select the link above and copy it.");
      return;
    }
    say("");
    copyButton.textContent = "Copied";
    window.clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => {
      copyButton.textContent = "Copy link";
    }, COPIED_MS);
  }

  start.input.addEventListener("input", () => update(withStartText(state, start.input.value)));
  end.input.addEventListener("input", () => update(withEndText(state, end.input.value)));
  note.addEventListener("input", () => {
    update(withNote(state, note.value));
    // limitNote may have cut the text, so put it back even though the field has focus.
    if (note.value !== state.note) note.value = state.note;
  });
  for (const field of [start.input, end.input]) {
    field.addEventListener("blur", () => update(tidyTimes(state)));
  }
  start.now.addEventListener("click", () => void startNow());
  end.now.addEventListener("click", () => void endNow());
  chips.forEach((chip) => chip.addEventListener("click", () => update(withLength(state, Number(chip.dataset.seconds)))));
  copyButton.addEventListener("click", () => void copy());
  closeButton?.addEventListener("click", () => onClose?.());

  // Keep YouTube's own single-key shortcuts (k, j, l, f, m...) from firing while typing here.
  element.addEventListener("keydown", (event) => {
    if (!(event.altKey && event.shiftKey)) event.stopPropagation();
    if (event.key === "Escape" && onClose) onClose();
  });

  const open = (now: number | null) => {
    say("");
    copyButton.textContent = "Copy link";
    start.input.value = "";
    end.input.value = "";
    note.value = "";
    update(openState(now));
  };

  render();
  return { element, open, startNow, endNow, copy };
}
