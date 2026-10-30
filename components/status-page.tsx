import type { ReactNode } from "react";

export const primaryAction =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink transition-opacity hover:opacity-90";
export const secondaryAction =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-line px-6 text-base font-medium text-ink transition-colors hover:border-muted";

type Props = {
  title: string;
  children: ReactNode;
  /** Buttons and links shown under the text. */
  actions: ReactNode;
  testId?: string;
};

/** One full-page message: broken clip links, unknown pages and the error boundary all use it. */
export function StatusPage({ title, children, actions, testId }: Props) {
  return (
    <main
      data-testid={testId}
      className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-16 sm:px-6"
    >
      <div aria-hidden="true" className="h-1.5 w-12 rounded-full bg-accent" />
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="text-lg text-muted">{children}</p>
      <div className="flex flex-wrap gap-3">{actions}</div>
    </main>
  );
}
