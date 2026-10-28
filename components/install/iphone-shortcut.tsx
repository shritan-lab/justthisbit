import { IPHONE_SHORTCUT_ICLOUD_URL, shortcutUrlPrefix } from "@/lib/install";
import { primaryButton } from "../create/styles";
import { CopyButton } from "./copy-button";
import { Steps } from "./steps";

const code = "rounded-md bg-base px-1.5 py-0.5 font-mono text-[0.9em] break-all";

/** The "Clip it" Shortcut from SPEC 6.2. iPhones can't be share targets for web apps, so this fills in. */
export function IphoneShortcut({ siteUrl }: { siteUrl: string }) {
  const prefix = shortcutUrlPrefix(siteUrl);

  return (
    <>
      <p className="text-muted">
        A Shortcut called <b className="text-ink">Clip it</b> puts this site in the share sheet of the YouTube app.
      </p>

      {IPHONE_SHORTCUT_ICLOUD_URL ? (
        <a href={IPHONE_SHORTCUT_ICLOUD_URL} className={`${primaryButton} self-start`}>
          Get the Clip it Shortcut
        </a>
      ) : (
        <p data-testid="shortcut-link-placeholder" className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
          A one-tap Shortcut link is coming soon. For now it takes about two minutes to build:
        </p>
      )}

      <Steps
        steps={[
          <>
            Open the <b>Shortcuts</b> app, tap <b>+</b>, and name the new shortcut <b>Clip it</b>.
          </>,
          <>
            Open its settings (the <b>ⓘ</b> button), turn on <b>Show in Share Sheet</b>, and let it accept{" "}
            <b>URLs</b> and <b>Text</b>.
          </>,
          <>
            Add the action <b>URL Encode</b>. Its input is <b>Shortcut Input</b>.
          </>,
          <span key="text" className="flex flex-col gap-2">
            <span>
              Add the action <b>Text</b>. Type <code className={code}>{prefix}</code> and then insert the{" "}
              <b>URL Encoded Text</b> variable right after it, with no space.
            </span>
            <CopyButton text={prefix} label="Copy the address" />
          </span>,
          <>
            Add the action <b>Open URLs</b>.
          </>,
          <>
            In YouTube, tap <b>Share</b>, then <b>More</b>, and pick <b>Clip it</b>.
          </>,
        ]}
      />

      <p className="text-sm text-muted">
        No Shortcut? Copy the link in YouTube, open this site, and paste it.
      </p>
    </>
  );
}
