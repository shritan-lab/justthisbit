import { describe, expect, it } from "vitest";
import manifestJson from "../manifest.json";
import { isStateRequest, readStateReply, STATE_MESSAGE } from "./messages";

const manifest = manifestJson as {
  manifest_version: number;
  permissions?: string[];
  host_permissions?: string[];
  optional_permissions?: string[];
  content_scripts: { matches: string[]; js: string[] }[];
  background?: unknown;
  web_accessible_resources?: unknown;
  externally_connectable?: unknown;
  content_security_policy?: unknown;
};

describe("manifest", () => {
  it("is Manifest V3", () => {
    expect(manifest.manifest_version).toBe(3);
  });

  it("asks only for activeTab and clipboardWrite", () => {
    expect([...(manifest.permissions ?? [])].sort()).toEqual(["activeTab", "clipboardWrite"]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.optional_permissions).toBeUndefined();
  });

  it("runs the content script on https://www.youtube.com/* only", () => {
    expect(manifest.content_scripts).toEqual([
      expect.objectContaining({ matches: ["https://www.youtube.com/*"], js: ["content.js"] }),
    ]);
  });

  it("has no background worker, exposed files, outside connections or CSP changes", () => {
    expect(manifest.background).toBeUndefined();
    expect(manifest.web_accessible_resources).toBeUndefined();
    expect(manifest.externally_connectable).toBeUndefined();
    expect(manifest.content_security_policy).toBeUndefined();
  });
});

describe("popup messages", () => {
  it("recognises the state request", () => {
    expect(isStateRequest({ type: STATE_MESSAGE })).toBe(true);
    expect(isStateRequest({ type: "other" })).toBe(false);
    expect(isStateRequest(null)).toBe(false);
    expect(isStateRequest("jtb:state")).toBe(false);
  });

  it("reads replies and drops bad values", () => {
    expect(readStateReply({ videoId: "dQw4w9WgXcQ", time: 12.5 })).toEqual({ videoId: "dQw4w9WgXcQ", time: 12.5 });
    expect(readStateReply({ videoId: 5, time: -1 })).toEqual({ videoId: null, time: null });
    expect(readStateReply({ time: Number.NaN })).toEqual({ videoId: null, time: null });
    expect(readStateReply(undefined)).toBeNull();
  });
});
