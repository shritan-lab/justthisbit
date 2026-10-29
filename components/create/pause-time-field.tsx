"use client";

import { useRef, useState, type FormEvent } from "react";
import { parseKeypadTimeInput } from "@/lib/time";
import { errorText, textField } from "./styles";

export const PAUSE_TIME_LABEL = "Where did you pause?";
export const PAUSE_TIME_TIP = "Next time, turn on Start at in YouTube's Share menu and this fills in by itself.";
export const PAUSE_TIME_ERROR = "Time not understood. Try 5:02 or 302.";

type Props = {
  /** Called with whole seconds every time the field holds a valid time. */
  onTime: (seconds: number) => void;
};

/**
 * Shown when a shared link has no time in it (YouTube's "Start at" switch was off).
 * The number pad keeps typing quick on phones. It has no colon key, so "5.02" works as well as "5:02".
 * The error waits for Enter or leaving the field, so it never flashes while someone types "1:05:30".
 */
export function PauseTimeField({ onTime }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(false);
  const invalid = text.trim() !== "" && parseKeypadTimeInput(text) === null;
  const showError = checked && invalid;

  const change = (value: string) => {
    setText(value);
    setChecked(false);
    const seconds = parseKeypadTimeInput(value);
    if (seconds !== null) onTime(seconds);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecked(true);
    // A good time closes the phone keyboard so the player and times are in view.
    if (!invalid && text.trim() !== "") inputRef.current?.blur();
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      data-testid="pause-time"
      className="flex flex-col gap-2 rounded-xl border border-line p-4"
    >
      <label htmlFor="pause-time-input" className="text-lg font-semibold text-ink">
        {PAUSE_TIME_LABEL}
      </label>
      <input
        ref={inputRef}
        id="pause-time-input"
        type="text"
        inputMode="decimal"
        pattern="[0-9]+([:.,][0-9]{1,2}){0,2}"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        // The sender came here to type this one thing, so the keyboard can open straight away.
        autoFocus
        placeholder="5:02"
        value={text}
        onChange={(e) => change(e.target.value)}
        onBlur={() => setChecked(true)}
        aria-invalid={showError ? true : undefined}
        aria-describedby={showError ? "pause-time-error pause-time-tip" : "pause-time-tip"}
        className={`${textField} text-lg tabular-nums`}
      />
      {showError ? (
        <p id="pause-time-error" role="alert" className={errorText}>
          {PAUSE_TIME_ERROR}
        </p>
      ) : null}
      <p id="pause-time-tip" className="text-sm text-muted">
        {PAUSE_TIME_TIP}
      </p>
    </form>
  );
}
