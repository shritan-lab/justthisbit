import { SITE_NAME } from "./site";

export const PAGE_NOT_FOUND_TITLE = "This page doesn't exist";
export const PAGE_NOT_FOUND_DOCUMENT_TITLE = `${PAGE_NOT_FOUND_TITLE} · ${SITE_NAME}`;

/**
 * Runs inline, before the 404 page paints. The page carries both messages: invalid clip links
 * (proxy.ts rewrites /c/... here) keep "This clip link looks broken", any other unknown address
 * switches to "This page doesn't exist" by setting data-kind="page" on the element.
 * The server HTML defaults to the clip message, because almost every visitor arrives on a clip
 * link and link previews read it without running scripts.
 * Plain string checks, no regex, so nothing needs escaping inside the HTML.
 */
export function notFoundScript(elementId: string): string {
  const id = JSON.stringify(elementId);
  return `(function(){try{var p=location.pathname;if(p==="/c"||p.indexOf("/c/")===0)return;var e=document.getElementById(${id});if(e)e.setAttribute("data-kind","page")}catch(_){}})();`;
}

/** True for addresses that get the broken clip message. The same rule as notFoundScript. */
export function isClipPath(pathname: string): boolean {
  return pathname === "/c" || pathname.startsWith("/c/");
}
