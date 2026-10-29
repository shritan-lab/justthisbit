import type { BrowserContext } from "@playwright/test";

// A stand-in for youtube.com, served at https://www.youtube.com/* by request routing, so the
// extension's content script runs on it exactly as on the real site. The markup copies the parts
// the extension looks for (checked against youtube.com in October 2026): the watch page's
// ytd-watch-metadata action row, and the Shorts reel with its action bar beside the player.
//
// Page helpers for tests (main world):
//   fakeNavigate(id)  pushState to another video, rebuild the metadata (which drops anything added
//                     to it, like YouTube re-rendering), then fire yt-navigate-finish.
//   fakeRerender()    rebuild the metadata with no event, so only the MutationObserver can notice.
//   setVideoTime(s)   set the main video's currentTime.

const STYLE = `
  body { margin: 0; font-family: Arial, sans-serif; background: #fff; color: #0f0f0f; }
  #movie_player { width: 960px; height: 540px; background: #000; }
  #movie_player video, #shorts-player video { width: 100%; height: 100%; display: block; background: #111; }
  #top-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; }
  #top-level-buttons-computed { display: flex; gap: 8px; align-items: center; }
  #top-level-buttons-computed button, reel-action-bar-view-model button { height: 36px; }
  ytd-shorts { display: block; padding: 40px 0 0 300px; }
  #reel-video-renderer { display: flex; align-items: flex-end; gap: 12px; }
  #shorts-player { width: 340px; height: 600px; background: #000; }
  reel-action-bar-view-model { display: flex; flex-direction: column; align-items: center; gap: 16px; }
  reel-action-bar-view-model > * { display: block; }
`;

const SCRIPT = String.raw`
  function metadataHtml(id) {
    return '<div id="above-the-fold">' +
      '<div id="title"><h1>Fake video ' + id + '</h1></div>' +
      '<div id="top-row">' +
        '<div id="owner">Fake channel</div>' +
        '<div id="actions"><div id="actions-inner"><div id="menu"><ytd-menu-renderer>' +
          '<div id="top-level-buttons-computed">' +
            '<segmented-like-dislike-button-view-model><button>Like</button></segmented-like-dislike-button-view-model>' +
            '<yt-button-view-model><button>Share</button></yt-button-view-model>' +
          '</div>' +
        '</ytd-menu-renderer></div></div></div>' +
      '</div>' +
      '<div id="description">Description</div>' +
    '</div>';
  }
  window.fakeRerender = function () {
    var meta = document.querySelector('ytd-watch-metadata');
    var id = new URLSearchParams(location.search).get('v') || '';
    meta.innerHTML = metadataHtml(id);
  };
  window.fakeNavigate = function (id) {
    history.pushState({}, '', '/watch?v=' + id);
    window.fakeRerender();
    document.dispatchEvent(new CustomEvent('yt-navigate-finish', { bubbles: true }));
  };
  window.setVideoTime = function (seconds) {
    var video = document.querySelector('#movie_player video, #shorts-player video');
    video.currentTime = seconds;
    return video.currentTime;
  };
  if (document.querySelector('ytd-watch-metadata')) window.fakeRerender();
`;

function page(body: string, dark: boolean): string {
  return `<!doctype html><html${dark ? " dark" : ""}><head><meta charset="utf-8"><title>Fake YouTube</title><style>${STYLE}</style></head><body>${body}<script>${SCRIPT}</script></body></html>`;
}

export function fakeWatchPage(dark = false): string {
  return page(
    `<ytd-app><div id="content"><ytd-page-manager id="page-manager"><ytd-watch-flexy>
      <div id="full-bleed-container"><div id="player-container"><ytd-player id="ytd-player"><div id="container">
        <div id="movie_player" class="html5-video-player"><div class="html5-video-container"><video class="video-stream html5-main-video"></video></div></div>
      </div></ytd-player></div></div>
      <div id="columns"><div id="primary"><div id="primary-inner"><div id="below"><ytd-watch-metadata></ytd-watch-metadata></div></div></div></div>
    </ytd-watch-flexy></ytd-page-manager></div></ytd-app>`,
    dark,
  );
}

export function fakeShortsPage(dark = true): string {
  return page(
    `<ytd-app><div id="content"><ytd-page-manager id="page-manager"><ytd-shorts><div id="shorts-inner-container">
      <ytd-reel-video-renderer id="reel-video-renderer">
        <div id="short-video-container"><div id="player-container"><ytd-player id="player"><div id="container">
          <div id="shorts-player" class="html5-video-player"><div class="html5-video-container"><video class="video-stream html5-main-video"></video></div></div>
        </div></ytd-player></div></div>
        <div class="ytReelPlayerOverlayViewModelActionsContainer"><reel-action-bar-view-model>
          <like-button-view-model><button>Like</button></like-button-view-model>
          <button-view-model><button>Share</button></button-view-model>
          <pivot-button-view-model><button>Sound</button></pivot-button-view-model>
        </reel-action-bar-view-model></div>
      </ytd-reel-video-renderer>
    </div></ytd-shorts></ytd-page-manager></div></ytd-app>`,
    dark,
  );
}

/** Answers every youtube.com page with the fake, and blocks everything else that leaves the machine. */
export async function routeFakeYouTube(context: BrowserContext, options: { dark?: boolean } = {}) {
  await context.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "www.youtube.com" || route.request().resourceType() !== "document") {
      await route.abort();
      return;
    }
    const body = url.pathname.startsWith("/shorts/") ? fakeShortsPage(options.dark ?? true) : fakeWatchPage(options.dark ?? false);
    await route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body });
  });
}
