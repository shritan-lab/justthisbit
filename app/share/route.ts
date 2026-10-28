import { NextResponse, type NextRequest } from "next/server";
import { shareTargetRedirect } from "@/lib/share-target";

// Android share sheet entry point (SPEC 5.3). The manifest's share_target sends a GET here.
export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const target = shareTargetRedirect({
    title: searchParams.get("title"),
    text: searchParams.get("text"),
    url: searchParams.get("url"),
  });
  const response = NextResponse.redirect(new URL(target, request.nextUrl.origin), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
