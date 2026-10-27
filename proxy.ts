import { NextResponse, type NextRequest } from "next/server";
import { matchClipPath, parseClipParams } from "@/lib/clip";

/** Matches no route, so Next renders app/not-found.tsx with a real 404 and full server HTML. */
const BROKEN_CLIP_PATH = "/_broken-clip-link";

// Validates clip links before the page renders. The viewer page streams (Cache Components),
// and once streaming starts the status is fixed at 200, so a broken link has to be caught here
// to get a real 404 (SPEC 5.1). A rewrite cannot set the status itself, hence the unmatched path.
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const raw = matchClipPath(pathname);
  const notes = searchParams.getAll("n");
  const result = raw ? parseClipParams({ ...raw, n: notes.length > 0 ? notes : undefined }) : null;
  if (result?.ok) return NextResponse.next();

  return NextResponse.rewrite(new URL(BROKEN_CLIP_PATH, request.url));
}

export const config = {
  matcher: ["/c", "/c/:path*"],
};
