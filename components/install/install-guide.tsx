"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { detectDevice, type Device } from "@/lib/install";
import { AndroidInstall } from "./android-install";
import { DesktopBookmarklet } from "./desktop-bookmarklet";
import { IphoneShortcut } from "./iphone-shortcut";

const noopSubscribe = () => () => {};

function useDevice(): Device | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return detectDevice(navigator.userAgent, navigator.maxTouchPoints);
      } catch {
        return "desktop";
      }
    },
    () => null,
  );
}

const SECTIONS: { id: Device; title: string; blurb: string }[] = [
  { id: "android", title: "Android", blurb: "Share straight from the YouTube app." },
  { id: "iphone", title: "iPhone and iPad", blurb: "A Shortcut in the share sheet." },
  { id: "desktop", title: "Computer", blurb: "A button on your bookmarks bar." },
];

/** The three /install sections. The one that matches this device opens by itself (SPEC 5.4). */
export function InstallGuide({ siteUrl, bookmarklet }: { siteUrl: string; bookmarklet: string }) {
  const device = useDevice();
  // Sections the visitor opened or closed by hand. Everything else follows the detected device.
  const [toggled, setToggled] = useState<Partial<Record<Device, boolean>>>({});

  const content: Record<Device, ReactNode> = {
    android: <AndroidInstall />,
    iphone: <IphoneShortcut siteUrl={siteUrl} />,
    desktop: <DesktopBookmarklet bookmarklet={bookmarklet} />,
  };

  return (
    <div className="flex flex-col gap-3" data-device={device ?? "unknown"}>
      {SECTIONS.map(({ id, title, blurb }) => (
        <details
          key={id}
          id={id}
          data-testid={`install-${id}`}
          open={toggled[id] ?? device === id}
          onToggle={(e) => {
            const open = e.currentTarget.open;
            setToggled((prev) => (prev[id] === open ? prev : { ...prev, [id]: open }));
          }}
          className="group rounded-2xl border border-line bg-surface open:border-muted"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-3 [&::-webkit-details-marker]:hidden">
            <span className="flex flex-col">
              <span className="text-lg font-semibold">{title}</span>
              <span className="text-sm text-muted">{blurb}</span>
            </span>
            <span aria-hidden="true" className="text-2xl leading-none text-muted transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="flex flex-col gap-4 px-5 pb-5">{content[id]}</div>
        </details>
      ))}
    </div>
  );
}
