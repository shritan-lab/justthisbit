import { matchClipPath, parseClipParams } from "./clip";
import { parseTimeInput } from "./time";
import { isValidVideoId } from "./video-id";

export type YouTubeInput = {
  videoId: string;
  startSeconds?: number;
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);

// Paths where the video id is the second segment: /shorts/ID, /live/ID, /embed/ID, /v/ID.
const ID_IN_PATH = new Set(["shorts", "live", "embed", "v"]);

// Pasted text can be long (a whole chat message). Nothing useful is past this point.
const MAX_INPUT_LENGTH = 4000;

const LEADING_JUNK_RE = /^[(<[{"'`]+/;
const TRAILING_JUNK_RE = /[)>\]}"'`.,;:!?]+$/;

function toUrl(token: string): URL | null {
  const httpIndex = token.search(/https?:\/\//i);
  let candidate = httpIndex >= 0 ? token.slice(httpIndex) : token;
  candidate = candidate.replace(LEADING_JUNK_RE, "").replace(TRAILING_JUNK_RE, "");
  if (!candidate) return null;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

function readStart(url: URL): number | undefined {
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const raw = url.searchParams.get("t") ?? url.searchParams.get("start") ?? hashParams.get("t");
  if (raw === null) return undefined;
  return parseTimeInput(raw) ?? undefined;
}

function withStart(videoId: string, start: number | undefined): YouTubeInput {
  return start === undefined ? { videoId } : { videoId, startSeconds: start };
}

function fromUrl(url: URL): YouTubeInput | null {
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const segments = url.pathname.split("/").filter(Boolean);

  let videoId: string | null | undefined;
  if (SHORT_HOSTS.has(host)) {
    videoId = segments[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    const [first, second] = segments;
    if (first === "watch") videoId = url.searchParams.get("v");
    else if (first !== undefined && ID_IN_PATH.has(first)) videoId = second;
    else return null;
  } else {
    // One of our own clip links: /c/{id}/{start}-{end}. The note is ignored here.
    const raw = matchClipPath(url.pathname);
    if (!raw) return null;
    const parsed = parseClipParams(raw);
    return parsed.ok ? { videoId: parsed.clip.videoId, startSeconds: parsed.clip.start } : null;
  }

  return isValidVideoId(videoId) ? withStart(videoId, readStart(url)) : null;
}

/**
 * Finds a YouTube video (or one of our clip links) in pasted text.
 * Returns the video id and optional start time, or null if there is no video.
 */
export function parseYouTubeInput(input: string): YouTubeInput | null {
  if (typeof input !== "string") return null;
  const tokens = input.slice(0, MAX_INPUT_LENGTH).split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const url = toUrl(token);
    if (!url) continue;
    const result = fromUrl(url);
    if (result) return result;
  }
  return null;
}
