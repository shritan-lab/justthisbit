import { cacheLife } from "next/cache";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OEMBED_TIMEOUT_MS, getVideoMeta, oembedUrl } from "./oembed";

// "use cache" is a plain string outside Next, but cacheLife needs a stand-in.
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

const ID = "dQw4w9WgXcQ";

function mockFetch(impl: (...args: unknown[]) => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.mocked(cacheLife).mockClear();
});

describe("oembedUrl", () => {
  it("points at YouTube's oEmbed endpoint for the watch URL", () => {
    const url = new URL(oembedUrl(ID));
    expect(url.origin + url.pathname).toBe("https://www.youtube.com/oembed");
    expect(url.searchParams.get("url")).toBe(`https://www.youtube.com/watch?v=${ID}`);
    expect(url.searchParams.get("format")).toBe("json");
  });

  it("uses OEMBED_ENDPOINT when set (e2e stub)", () => {
    vi.stubEnv("OEMBED_ENDPOINT", "http://localhost:3101/oembed");
    expect(oembedUrl(ID).startsWith("http://localhost:3101/oembed?url=")).toBe(true);
  });

  it("ignores an OEMBED_ENDPOINT that is not http(s)", () => {
    vi.stubEnv("OEMBED_ENDPOINT", "file:///etc/passwd");
    expect(oembedUrl(ID).startsWith("https://www.youtube.com/oembed?url=")).toBe(true);
  });
});

describe("getVideoMeta", () => {
  it("returns the title and channel", async () => {
    const fetchFn = mockFetch(() => json({ title: "  A video  ", author_name: "A channel" }));
    await expect(getVideoMeta(ID)).resolves.toEqual({ title: "A video", authorName: "A channel" });
    expect(fetchFn).toHaveBeenCalledWith(oembedUrl(ID));
  });

  it("caches for a day", async () => {
    mockFetch(() => json({ title: "A video" }));
    await getVideoMeta(ID);
    expect(cacheLife).toHaveBeenCalledWith(expect.objectContaining({ revalidate: 86400 }));
  });

  it("uses an empty author name when missing", async () => {
    mockFetch(() => json({ title: "A video" }));
    await expect(getVideoMeta(ID)).resolves.toEqual({ title: "A video", authorName: "" });
  });

  it.each([[401], [403], [404], [429], [500], [503]])("returns null on HTTP %i", async (status) => {
    mockFetch(() => json({ error: "nope" }, status));
    await expect(getVideoMeta(ID)).resolves.toBeNull();
  });

  it("returns null on a network error", async () => {
    mockFetch(() => Promise.reject(new TypeError("fetch failed")));
    await expect(getVideoMeta(ID)).resolves.toBeNull();
  });

  it("returns null on invalid JSON", async () => {
    mockFetch(() => Promise.resolve(new Response("<html>", { status: 200 })));
    await expect(getVideoMeta(ID)).resolves.toBeNull();
  });

  it.each([[{}], [{ title: 42 }], [{ title: "   " }], [null], [[]]])("returns null for unexpected body %j", async (body) => {
    mockFetch(() => json(body));
    await expect(getVideoMeta(ID)).resolves.toBeNull();
  });

  it("returns null without fetching for an invalid id", async () => {
    const fetchFn = mockFetch(() => json({ title: "x" }));
    await expect(getVideoMeta("not-an-id")).resolves.toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it(`returns null after ${OEMBED_TIMEOUT_MS}ms`, async () => {
    vi.useFakeTimers();
    mockFetch(() => new Promise<Response>(() => {}));
    const result = getVideoMeta(ID);
    await vi.advanceTimersByTimeAsync(OEMBED_TIMEOUT_MS);
    await expect(result).resolves.toBeNull();
  });

  it("returns the result when it arrives just before the timeout", async () => {
    vi.useFakeTimers();
    mockFetch(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => resolve(new Response(JSON.stringify({ title: "Late" }))), OEMBED_TIMEOUT_MS - 50);
        }),
    );
    const result = getVideoMeta(ID);
    await vi.advanceTimersByTimeAsync(OEMBED_TIMEOUT_MS);
    await expect(result).resolves.toEqual({ title: "Late", authorName: "" });
  });
});
