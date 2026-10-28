/**
 * The desktop "Clip this" bookmarklet (SPEC 6.3).
 *
 * On youtube.com/watch, /shorts/ and /live/ pages it opens `{origin}/?v={id}&t={seconds}` in a
 * new tab, with the current playback time. Anywhere else it says "Open a YouTube video first".
 * Written as plain ES5 so it runs on any browser that can hold a bookmark.
 */
export function bookmarkletSource(origin: string): string {
  const base = JSON.stringify(origin.replace(/\/+$/, ""));
  return [
    "(function(){",
    "var l=location,p=l.pathname,id=null,m;",
    'if(/(^|\\.)youtube\\.com$/.test(l.hostname)){',
    'if(p==="/watch"){id=new URLSearchParams(l.search).get("v")}',
    "else{m=/^\\/(?:shorts|live)\\/([^\\/?#]+)/.exec(p);if(m){id=m[1]}}",
    "}",
    'if(!id||!/^[A-Za-z0-9_-]{11}$/.test(id)){alert("Open a YouTube video first");return}',
    "var q=function(s){return document.querySelector(s)},",
    'v=q("#movie_player video")||q("#shorts-player video")||q("video"),',
    "t=Math.floor(v&&v.currentTime||0);",
    `window.open(${base}+"/?v="+id+"&t="+t,"_blank")`,
    "})()",
  ].join("");
}

/** The `javascript:` URL to put in the link's href. Fully encoded, so `#` and spaces survive. */
export function buildBookmarklet(origin: string): string {
  return `javascript:${encodeURIComponent(bookmarkletSource(origin))}`;
}
