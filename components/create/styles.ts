// Shared class names for the create page. Every control is at least 44px tall (CLAUDE.md).

export const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-base font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

export const secondaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-line px-5 text-base font-medium text-ink transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-40";

export const smallButton =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface px-3 text-sm font-medium tabular-nums text-ink transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:border-accent aria-pressed:text-accent";

export const textField =
  "min-h-12 w-full min-w-0 rounded-xl border border-field bg-surface px-4 text-base text-ink placeholder:text-muted transition-colors hover:border-muted aria-invalid:border-accent";

export const fieldLabel = "text-sm font-medium text-muted";

export const errorText = "text-sm font-medium text-accent";
