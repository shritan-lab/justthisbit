// One stylesheet for the Clip button, the in-page panel and the popup. It lives inside our own
// shadow roots on YouTube, so YouTube's styles never reach it and ours never leak out.
// The panel has its own dark background, so it reads the same on YouTube's light and dark themes.

export const STYLES = `
:host { all: initial; }
.jtb, .jtb * { box-sizing: border-box; }
.jtb {
  --base: #080808;
  --surface: #141414;
  --line: #2e2e2e;
  --ink: #f2efe9;
  --muted: #a39e96;
  --accent: #ff4d1c;
  --accent-ink: #080808;
  font-family: "Bricolage Grotesque", Roboto, ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
/* Zero specificity, so each control's own font size and color win. */
:where(.jtb button, .jtb input, .jtb textarea, .jtb a) { font: inherit; color: inherit; }
.jtb [hidden] { display: none !important; }
.jtb-sr {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.jtb :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* The Clip button in YouTube's action row. 36px tall to sit level with Like and Share. */
.jtb-clip {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 14px 0 10px; margin-left: 8px;
  border-radius: 18px; border: 1px solid #3a3a3a;
  background: var(--base); color: var(--ink);
  font-size: 14px; font-weight: 600; line-height: 1;
  cursor: pointer; white-space: nowrap;
}
.jtb-clip:hover { border-color: var(--accent); }
.jtb-clip[aria-expanded="true"] { border-color: var(--accent); color: var(--accent); }
.jtb-clip svg { width: 20px; height: 20px; flex: none; }

/* On Shorts the buttons are a column of round icons with a label under each. */
.jtb-clip.is-shorts {
  flex-direction: column; gap: 4px; height: auto; margin: 16px 0 0; padding: 0;
  border: 0; border-radius: 0; background: transparent; color: inherit; font-size: 12px; font-weight: 500;
}
.jtb-clip.is-shorts .jtb-clip-icon {
  display: grid; place-items: center; width: 48px; height: 48px;
  border-radius: 50%; background: var(--base); border: 1px solid #3a3a3a;
}
.jtb-clip.is-shorts:hover .jtb-clip-icon,
.jtb-clip.is-shorts[aria-expanded="true"] .jtb-clip-icon { border-color: var(--accent); }
/* The label sits on YouTube's own background, so it follows YouTube's theme. */
.jtb-clip.is-shorts .jtb-clip-label { color: #0f0f0f; }
:host([data-theme="dark"]) .jtb-clip.is-shorts .jtb-clip-label { color: #f1f1f1; }

.jtb-panel {
  display: flex; flex-direction: column; gap: 14px;
  width: 100%; max-width: 640px; margin: 12px 0 4px; padding: 16px;
  background: var(--base); border: 1px solid var(--line); border-radius: 14px;
  font-size: 14px; line-height: 1.4;
}
.jtb-panel.is-floating {
  margin: 0; width: 340px; max-height: calc(100vh - 32px); overflow: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}
.jtb-panel.is-popup { margin: 0; border: 0; border-radius: 0; max-width: none; }
.jtb-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.jtb-title { margin: 0; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.jtb-title svg { width: 20px; height: 20px; }
.jtb-close {
  display: grid; place-items: center; width: 44px; height: 44px; margin: -10px -10px -10px 0;
  border: 0; border-radius: 10px; background: transparent; cursor: pointer; font-size: 22px; color: var(--muted);
}
.jtb-close:hover { color: var(--ink); }

.jtb-times { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.jtb-panel.is-floating .jtb-times, .jtb-panel.is-popup .jtb-times { grid-template-columns: 1fr; }
.jtb-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.jtb-label { font-size: 13px; font-weight: 500; color: var(--muted); }
.jtb-row { display: flex; gap: 8px; }
.jtb-input, .jtb-note {
  width: 100%; min-width: 0; min-height: 44px; padding: 0 12px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  font-size: 16px; font-variant-numeric: tabular-nums;
}
.jtb-input:hover, .jtb-note:hover { border-color: #4a4a4a; }
.jtb-input[aria-invalid="true"] { border-color: var(--accent); }
.jtb-note { min-height: 64px; padding: 10px 12px; resize: vertical; font-size: 14px; line-height: 1.35; }
.jtb-note::placeholder { color: var(--muted); }

.jtb-small {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; min-width: 44px; padding: 0 12px; flex: none;
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  font-size: 13px; font-weight: 500; font-variant-numeric: tabular-nums; cursor: pointer;
}
.jtb-small:hover { border-color: #4a4a4a; }
.jtb-small[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }
.jtb-small:disabled { opacity: 0.4; cursor: not-allowed; }
.jtb-chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }

.jtb-summary {
  display: flex; flex-direction: column; gap: 4px;
  padding: 12px; border: 1px solid var(--line); border-radius: 10px;
}
.jtb-length { margin: 0; font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
.jtb-muted { margin: 0; color: var(--muted); font-size: 13px; }
.jtb-error { margin: 0; color: var(--accent); font-size: 13px; font-weight: 500; }
.jtb-link { margin: 0; color: var(--muted); font-size: 12px; word-break: break-all; user-select: all; }
.jtb-count { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
.jtb-count.is-full { color: var(--accent); }
.jtb-note-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }

.jtb-actions { display: flex; gap: 8px; }
.jtb-primary, .jtb-secondary {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; padding: 0 18px; border-radius: 22px;
  font-size: 15px; font-weight: 600; text-decoration: none; cursor: pointer;
}
.jtb-primary { flex: 1; background: var(--accent); color: var(--accent-ink); border: 0; }
.jtb-primary:hover { opacity: 0.9; }
.jtb-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.jtb-secondary { background: transparent; border: 1px solid var(--line); color: var(--ink); }
.jtb-secondary:hover { border-color: #4a4a4a; }
.jtb-secondary[aria-disabled="true"] { opacity: 0.4; pointer-events: none; }
.jtb-status { margin: 0; font-size: 13px; color: var(--muted); }
.jtb-status:empty { display: none; }

.jtb-keys { margin: 0; font-size: 12px; color: var(--muted); }
.jtb-keys kbd {
  font-family: inherit; font-size: 11px; font-weight: 600; color: var(--ink);
  padding: 1px 5px; border: 1px solid var(--line); border-radius: 4px; background: var(--surface);
}
.jtb-message { margin: 0; padding: 16px; font-size: 14px; color: var(--ink); }
`;
