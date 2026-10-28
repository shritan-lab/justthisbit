"use client";

import { errorText, fieldLabel, smallButton, textField } from "./styles";

const NUDGES = [-5, -1, 1, 5] as const;

type Props = {
  id: string;
  label: "Start" | "End";
  text: string;
  /** Parsed value of `text`, or null when it is not a time. Nudges need a value. */
  value: number | null;
  onText: (text: string) => void;
  onBlur: () => void;
  onNow: () => void;
  nowDisabled: boolean;
  onNudge: (delta: number) => void;
  error?: string;
};

function nudgeLabel(delta: number): string {
  return delta < 0 ? `−${-delta}s` : `+${delta}s`;
}

export function TimeRow({ id, label, text, value, onText, onBlur, onNow, nowDisabled, onNudge, error }: Props) {
  const errorId = `${id}-error`;
  const word = label.toLowerCase();

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          value={text}
          onChange={(e) => onText(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${textField} flex-1 text-lg tabular-nums`}
        />
        <button type="button" onClick={onNow} disabled={nowDisabled} className={`${smallButton} shrink-0 px-4`}>
          {/* One span, so flexbox keeps the spaces around the screen-reader word. */}
          <span>
            Set <span className="sr-only">{word} </span>to now
          </span>
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {NUDGES.map((delta) => (
          <button
            key={delta}
            type="button"
            onClick={() => onNudge(delta)}
            disabled={value === null || (delta < 0 && value === 0)}
            aria-label={`${label} ${delta < 0 ? "back" : "forward"} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? "second" : "seconds"}`}
            className={smallButton}
          >
            {nudgeLabel(delta)}
          </button>
        ))}
      </div>
      {error ? (
        <p id={errorId} role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
