// A tiny stand-in for YouTube's oEmbed endpoint so e2e tests run offline.
// The app is pointed at it with OEMBED_ENDPOINT (see playwright.config.ts).
import { createServer } from "node:http";

const PORT = Number(process.env.OEMBED_STUB_PORT ?? 3101);

// Keep in sync with e2e/support/fixtures.ts.
const VIDEOS = {
  dQw4w9WgXcQ: { title: "Test video & friends", author_name: "Test Channel" },
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (url.pathname === "/health") {
    res.writeHead(200).end("ok");
    return;
  }
  if (url.pathname !== "/oembed") {
    res.writeHead(404).end();
    return;
  }
  const watch = url.searchParams.get("url") ?? "";
  const id = new URL(watch, "https://www.youtube.com").searchParams.get("v") ?? "";
  const video = VIDEOS[id];
  if (!video) {
    // What YouTube answers for embed-disabled videos.
    res.writeHead(401, { "content-type": "text/plain" }).end("Unauthorized");
    return;
  }
  res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ...video, type: "video" }));
}).listen(PORT, () => {
  console.log(`oEmbed stub on http://localhost:${PORT}`);
});
