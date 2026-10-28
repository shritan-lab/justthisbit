import type { ReactNode } from "react";

/** A numbered list of how-to steps. */
export function Steps({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-base text-sm font-semibold tabular-nums text-accent"
          >
            {i + 1}
          </span>
          <span className="pt-0.5 leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  );
}
