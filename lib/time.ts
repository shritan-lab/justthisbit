const DIGITS_RE = /^\d+$/;
const CLOCK_RE = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/;
const UNITS_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;

function toSafeSeconds(n: number): number | null {
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

/**
 * Parses a time typed by a person or found in a YouTube link.
 * Accepts "90", "90s", "1:30", "01:02:03", "1m30s", "1h2m3s" and "1m 30s".
 * Returns whole seconds, or null when the input is not a time.
 */
export function parseTimeInput(input: string): number | null {
  if (typeof input !== "string") return null;
  const s = input.trim().toLowerCase();
  if (!s) return null;

  if (DIGITS_RE.test(s)) return toSafeSeconds(Number(s));

  const clock = CLOCK_RE.exec(s);
  if (clock) {
    const [, a, b, c] = clock;
    const parts = (c === undefined ? [a, b] : [a, b, c]).map(Number);
    // Every part after the first is minutes or seconds, so it must be under 60.
    if (parts.slice(1).some((p) => p >= 60)) return null;
    const total = parts.reduce((acc, p) => acc * 60 + p, 0);
    return toSafeSeconds(total);
  }

  const compact = s.replace(/\s+/g, "");
  const units = UNITS_RE.exec(compact);
  if (units && compact.length > 0) {
    const [, h, m, sec] = units;
    if (h === undefined && m === undefined && sec === undefined) return null;
    const total = Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(sec ?? 0);
    return toSafeSeconds(total);
  }

  return null;
}

const KEYPAD_SEPARATOR_RE = /^\s*\d+(?:[.,]\d+){1,2}\s*$/;

/**
 * Like parseTimeInput, but also takes "." or "," between the parts ("5.02", "1,05,30"),
 * because phone number pads have no colon key. Everything else is parseTimeInput's job.
 */
export function parseKeypadTimeInput(input: string): number | null {
  if (typeof input !== "string") return null;
  return parseTimeInput(KEYPAD_SEPARATOR_RE.test(input) ? input.replace(/[.,]/g, ":") : input);
}

function clampSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.floor(seconds);
}

/** "0:42", "1:30", "1:02:03". */
export function formatClock(seconds: number): string {
  const total = clampSeconds(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

/** "42s", "1m 30s", "1h 2m". Seconds are dropped once the length reaches an hour. */
export function formatDuration(seconds: number): string {
  const total = clampSeconds(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}
