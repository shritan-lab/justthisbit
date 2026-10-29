// Tiny DOM helpers. YouTube enforces Trusted Types, so nothing here ever sets innerHTML.

type Attrs = Record<string, string | boolean | undefined>;
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  attrs: Attrs = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    el.setAttribute(name, value === true ? "" : value);
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === "string" ? doc.createTextNode(child) : child);
  }
  return el;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** The app icon's mark: two brackets around a play triangle, in the accent color. */
export function clipIcon(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "80 100 352 312");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const brackets = doc.createElementNS(SVG_NS, "g");
  brackets.setAttribute("fill", "none");
  brackets.setAttribute("stroke", "#FF4D1C");
  brackets.setAttribute("stroke-width", "44");
  for (const d of ["M172 132H112V380H172", "M340 132H400V380H340"]) {
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    brackets.append(path);
  }
  const play = doc.createElementNS(SVG_NS, "path");
  play.setAttribute("d", "M212 178V334L334 256Z");
  play.setAttribute("fill", "#FF4D1C");
  play.setAttribute("stroke", "#FF4D1C");
  play.setAttribute("stroke-width", "16");
  play.setAttribute("stroke-linejoin", "round");
  svg.append(brackets, play);
  return svg;
}
