/**
 * Chrome fires `beforeinstallprompt` once per page load, often before React has hydrated.
 * /install puts this tiny script in its server HTML so the event is caught early and kept on
 * `window` until the Install button asks for it. Only /install uses it, so Chrome's own install
 * hint still shows everywhere else.
 */
export const INSTALL_PROMPT_KEY = "__jtbInstallPrompt";
export const INSTALL_PROMPT_EVENT = "jtb-installprompt";

export const INSTALL_PROMPT_SCRIPT =
  `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();` +
  `window.${INSTALL_PROMPT_KEY}=e;window.dispatchEvent(new Event("${INSTALL_PROMPT_EVENT}"))});`;
