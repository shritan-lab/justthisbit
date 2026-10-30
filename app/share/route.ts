import { NextResponse, type NextRequest } from "next/server";
import { shareTargetRedirect } from "@/lib/share-target";

// Android share sheet entry point (SPEC 5.3). The manifest's share_target sends a GET here.
// It has no page of its own, so if anything goes wrong it sends the visitor to the create page
// instead of an error screen.
export function GET(request: NextRequest) {
  // Read outside the try: reading the request is how Next learns this route is dynamic.
  const { searchParams } = request.nextUrl;
  const params = { title: searchParams.get("title"), text: searchParams.get("text"), url: searchParams.get("url") };
  let target = "/";
  try {
    target = shareTargetRedirect(params);
  } catch (error) {
    console.error(error);
  }
  const response = NextResponse.redirect(new URL(target, request.nextUrl.origin), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
