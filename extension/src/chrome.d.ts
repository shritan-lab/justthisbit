// The few extension APIs this extension uses, typed by hand so the Next.js app never sees a
// global `chrome`. Only included by extension/tsconfig.json.

declare namespace chrome {
  namespace runtime {
    type MessageSender = { tab?: tabs.Tab; id?: string };
    const onMessage: {
      addListener(
        callback: (message: unknown, sender: MessageSender, sendResponse: (response?: unknown) => void) => boolean | void,
      ): void;
    };
  }

  namespace tabs {
    type Tab = { id?: number; url?: string; active: boolean; windowId: number };
    function query(queryInfo: { active?: boolean; currentWindow?: boolean; lastFocusedWindow?: boolean }): Promise<Tab[]>;
    function get(tabId: number): Promise<Tab>;
    function sendMessage(tabId: number, message: unknown): Promise<unknown>;
  }
}
