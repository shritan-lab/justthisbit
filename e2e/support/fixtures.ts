// Videos known to the oEmbed stub (e2e/support/oembed-stub.mjs).
export const KNOWN_VIDEO = { id: "dQw4w9WgXcQ", title: "Test video & friends", author: "Test Channel" };

/** Not known to the stub, so oEmbed answers 401 like it does for embed-disabled videos. */
export const UNKNOWN_VIDEO_ID = "aaaaaaaaaaa";

/** Bot user agents that get blocking metadata in <head> (WhatsApp, iMessage). */
export const WHATSAPP_UA = "WhatsApp/2.23.20.0 A";
export const IMESSAGE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0";

const ENTITIES: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&#x27;": "'", "&#39;": "'", "&lt;": "<", "&gt;": ">" };

export function decodeEntities(s: string): string {
  return s.replace(/&(amp|quot|#x27|#39|lt|gt);/g, (m) => ENTITIES[m] ?? m);
}

/** Reads `<meta property|name="key" content="...">` out of raw HTML. */
export function metaContent(html: string, key: string): string | null {
  const re = new RegExp(`<meta (?:property|name)="${key.replace(/[:.]/g, "\\$&")}" content="([^"]*)"`);
  const m = re.exec(html);
  return m ? decodeEntities(m[1]!) : null;
}

export function titleTag(html: string): string | null {
  const m = /<title>([^<]*)<\/title>/.exec(html);
  return m ? decodeEntities(m[1]!) : null;
}

export function headOf(html: string): string {
  return html.split("</head>")[0] ?? "";
}
