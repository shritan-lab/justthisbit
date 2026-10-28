import { describe, expect, it } from "vitest";
import { detectDevice, shortcutUrlPrefix } from "./install";

const UA = {
  pixel:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  samsungTablet:
    "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Safari/537.36",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};

describe("detectDevice", () => {
  it("finds Android phones and tablets", () => {
    expect(detectDevice(UA.pixel, 5)).toBe("android");
    expect(detectDevice(UA.samsungTablet, 5)).toBe("android");
  });

  it("finds iPhones in any browser", () => {
    expect(detectDevice(UA.iphone, 5)).toBe("iphone");
    expect(detectDevice(UA.iphoneChrome, 5)).toBe("iphone");
  });

  it("treats a touch-screen Mac as an iPad", () => {
    expect(detectDevice(UA.mac, 5)).toBe("iphone");
  });

  it("treats everything else as desktop", () => {
    expect(detectDevice(UA.mac, 0)).toBe("desktop");
    expect(detectDevice(UA.windows)).toBe("desktop");
    expect(detectDevice("")).toBe("desktop");
  });
});

describe("shortcutUrlPrefix", () => {
  it("builds the create page url= prefix", () => {
    expect(shortcutUrlPrefix("https://justthisbit.vercel.app")).toBe("https://justthisbit.vercel.app/?url=");
    expect(shortcutUrlPrefix("https://justthisbit.vercel.app/")).toBe("https://justthisbit.vercel.app/?url=");
  });
});
