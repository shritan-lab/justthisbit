// The small slice of the YouTube IFrame Player API we use.
// https://developers.google.com/youtube/iframe_api_reference

/** YT.PlayerState values. Our own copy so we never depend on the global being loaded. */
export const PlayerState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  /** Shows the video's thumbnail ready to play from `startSeconds`, without playing. */
  cueVideoById(options: { videoId: string; startSeconds?: number }): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  getPlaybackRate?(): number;
  destroy(): void;
};

export type YTPlayerEvent<T = undefined> = {
  target: YTPlayer;
  data: T;
};

export type YTPlayerOptions = {
  events?: {
    onReady?: (event: YTPlayerEvent) => void;
    onStateChange?: (event: YTPlayerEvent<number>) => void;
    onError?: (event: YTPlayerEvent<number>) => void;
  };
};

export type YTNamespace = {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer;
};

declare global {
  interface Window {
    YT?: Partial<YTNamespace>;
    onYouTubeIframeAPIReady?: () => void;
  }
}
