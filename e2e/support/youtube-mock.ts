import { expect, type Page } from "@playwright/test";

// A fake YouTube IFrame Player API (SPEC 8.2). Tests stay offline and deterministic:
// - https://www.youtube.com/iframe_api is intercepted and answered with FAKE_IFRAME_API below.
// - Embed pages and thumbnails are answered with blanks. Every other outside request is aborted.
// - The fake player's media time is derived from performance.now(), so Playwright's page.clock
//   drives both the fake video and the app's 200ms polling. Freeze the clock with page.clock and
//   step it with runFor() to move playback forward.

export const IFRAME_API_URL = "https://www.youtube.com/iframe_api";

export type YouTubeMockConfig = {
  /** Fire onReady after the player is created. Default true. */
  ready?: boolean;
  /** Fire onError with this code right after onReady, like YouTube does for embed-disabled videos. */
  errorCode?: number;
  /** Video length in seconds. Default 600. */
  duration?: number;
};

export type MockCall = { method: string; args: unknown[] };

export type MockPlayerSnapshot = {
  state: number;
  time: number;
  playerVars: Record<string, string>;
  videoId: string;
  destroyed: boolean;
};

const FAKE_IFRAME_API = String.raw`
(function () {
  var cfg = window.__ytMockConfig || {};
  var S = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };
  var mock = window.__ytMock || { players: [], calls: [], scriptRuns: 0 };
  mock.scriptRuns += 1;
  window.__ytMock = mock;

  function Player(el, opts) {
    opts = opts || {};
    var iframe = el;
    if (!iframe || iframe.tagName !== "IFRAME") {
      iframe = document.createElement("iframe");
      var q = new URLSearchParams(opts.playerVars || {});
      iframe.src = "https://www.youtube.com/embed/" + opts.videoId + "?" + q.toString();
      el.replaceWith(iframe);
    }
    var src = new URL(iframe.src);
    this.iframe = iframe;
    this.events = opts.events || {};
    this.videoId = src.pathname.split("/").pop();
    this.playerVars = Object.fromEntries(src.searchParams);
    this.duration = cfg.duration == null ? 600 : cfg.duration;
    this.base = Number(src.searchParams.get("start") || 0);
    this.since = null;
    this.state = S.UNSTARTED;
    this.destroyed = false;
    this.endTimer = null;
    mock.players.push(this);
    mock.player = this;

    var self = this;
    // A microtask, not a timer, so readiness never depends on the test clock.
    Promise.resolve().then(function () {
      if (cfg.ready === false) return;
      self.fire("onReady");
      if (cfg.errorCode != null) self.fire("onError", cfg.errorCode);
    });
  }

  Player.prototype.fire = function (name, data) {
    if (this.destroyed) return;
    var handler = this.events[name];
    if (handler) handler({ target: this, data: data });
  };
  Player.prototype.log = function (method, args) {
    mock.calls.push({ method: method, args: Array.prototype.slice.call(args) });
  };
  Player.prototype.now = function () {
    if (this.since === null) return this.base;
    return Math.min(this.duration, this.base + (performance.now() - this.since) / 1000);
  };
  Player.prototype.setState = function (s) {
    if (this.state === s) return;
    this.state = s;
    this.fire("onStateChange", s);
  };
  Player.prototype.freeze = function () {
    this.base = this.now();
    this.since = null;
    clearTimeout(this.endTimer);
  };
  Player.prototype.run = function () {
    var self = this;
    this.since = performance.now();
    clearTimeout(this.endTimer);
    this.endTimer = setTimeout(function () {
      self.freeze();
      self.base = self.duration;
      self.setState(S.ENDED);
    }, Math.max(0, (this.duration - this.base) * 1000));
  };

  // Internal moves, shared by the API methods and the "viewer" helpers below.
  Player.prototype._play = function () {
    if (this.state === S.PLAYING) return;
    if (this.base >= this.duration) this.base = 0;
    this.run();
    this.setState(S.PLAYING);
  };
  Player.prototype._pause = function () {
    if (this.state !== S.PLAYING) return;
    this.freeze();
    this.setState(S.PAUSED);
  };
  Player.prototype._seek = function (t) {
    var playing = this.state === S.PLAYING;
    this.freeze();
    this.base = Math.max(0, Math.min(Number(t), this.duration));
    if (playing) this.run();
  };

  // The YT.Player API the app calls. Every call is recorded.
  Player.prototype.playVideo = function () { this.log("playVideo", arguments); this._play(); };
  Player.prototype.pauseVideo = function () { this.log("pauseVideo", arguments); this._pause(); };
  Player.prototype.seekTo = function () { this.log("seekTo", arguments); this._seek(arguments[0]); };
  Player.prototype.getCurrentTime = function () { return this.now(); };
  Player.prototype.getPlayerState = function () { return this.state; };
  Player.prototype.getDuration = function () { return this.duration; };
  Player.prototype.getPlaybackRate = function () { return 1; };
  Player.prototype.getIframe = function () { return this.iframe; };
  Player.prototype.destroy = function () {
    this.log("destroy", arguments);
    this.freeze();
    this.destroyed = true;
    if (this.iframe && this.iframe.parentNode) this.iframe.parentNode.removeChild(this.iframe);
  };

  // What a viewer does with YouTube's own controls inside the iframe. Not recorded as app calls.
  mock.viewer = {
    play: function () { mock.player._play(); },
    pause: function () { mock.player._pause(); },
    seek: function (t) { mock.player._seek(t); },
  };
  mock.fireReady = function () { mock.player.fire("onReady"); };
  mock.fireError = function (code) { mock.player.fire("onError", code); };
  mock.snapshot = function () {
    var p = mock.player;
    return p ? { state: p.state, time: p.now(), playerVars: p.playerVars, videoId: p.videoId, destroyed: p.destroyed } : null;
  };

  window.YT = { Player: Player, PlayerState: S, loaded: 1 };
  Promise.resolve().then(function () {
    if (typeof window.onYouTubeIframeAPIReady === "function") window.onYouTubeIframeAPIReady();
  });
})();
`;

// 1x1 transparent GIF for thumbnails.
const BLANK_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

type MockWindow = Window & {
  __ytMock?: {
    players: unknown[];
    calls: MockCall[];
    scriptRuns: number;
    viewer: { play(): void; pause(): void; seek(t: number): void };
    fireReady(): void;
    fireError(code: number): void;
    snapshot(): MockPlayerSnapshot | null;
  };
};

export class YouTubeMock {
  /** How many times the page requested iframe_api. */
  apiRequests = 0;

  private constructor(private readonly page: Page) {}

  static async install(page: Page, config: YouTubeMockConfig = {}): Promise<YouTubeMock> {
    const mock = new YouTubeMock(page);
    await page.addInitScript((cfg) => {
      (window as Window & { __ytMockConfig?: unknown }).__ytMockConfig = cfg;
    }, config);

    // Playwright runs the most recently added matching route first, so the catch-all goes first.
    await page.route(
      (url) => url.hostname !== "localhost" && url.hostname !== "127.0.0.1",
      (route) => route.abort("blockedbyclient"),
    );
    await page.route(/^https:\/\/i\.ytimg\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: "image/gif", body: BLANK_GIF }),
    );
    await page.route(/^https:\/\/www\.youtube\.com\/embed\//, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>fake embed</title>" }),
    );
    await page.route(IFRAME_API_URL, (route) => {
      mock.apiRequests += 1;
      return route.fulfill({ status: 200, contentType: "text/javascript", body: FAKE_IFRAME_API });
    });
    return mock;
  }

  /** Waits until the app has created a player. Polls from Node so a frozen page clock cannot stall it. */
  async waitForPlayer(): Promise<void> {
    await expect.poll(() => this.playerCount()).toBeGreaterThan(0);
  }

  snapshot(): Promise<MockPlayerSnapshot | null> {
    return this.page.evaluate(() => (window as MockWindow).__ytMock?.snapshot() ?? null);
  }

  async time(): Promise<number> {
    return (await this.snapshot())?.time ?? Number.NaN;
  }

  async state(): Promise<number> {
    return (await this.snapshot())?.state ?? Number.NaN;
  }

  /** Calls the app made on the player (playVideo, pauseVideo, seekTo, destroy). */
  calls(): Promise<MockCall[]> {
    return this.page.evaluate(() => (window as MockWindow).__ytMock?.calls ?? []);
  }

  playerCount(): Promise<number> {
    return this.page.evaluate(() => (window as MockWindow).__ytMock?.players.length ?? 0);
  }

  scriptRuns(): Promise<number> {
    return this.page.evaluate(() => (window as MockWindow).__ytMock?.scriptRuns ?? 0);
  }

  /** The viewer taps YouTube's play button. */
  viewerPlay(): Promise<void> {
    return this.page.evaluate(() => (window as MockWindow).__ytMock?.viewer.play());
  }

  /** The viewer taps YouTube's pause button. */
  viewerPause(): Promise<void> {
    return this.page.evaluate(() => (window as MockWindow).__ytMock?.viewer.pause());
  }

  /** The viewer drags YouTube's progress bar. */
  viewerSeek(seconds: number): Promise<void> {
    return this.page.evaluate((t) => (window as MockWindow).__ytMock?.viewer.seek(t), seconds);
  }

  fireError(code: number): Promise<void> {
    return this.page.evaluate((c) => (window as MockWindow).__ytMock?.fireError(c), code);
  }
}

export const PlayerState = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;
