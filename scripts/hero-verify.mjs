import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "/tmp/heroverify";
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  // No --force-device-scale-factor: it fights page.setViewport. DPR per page.
  args: ["--no-sandbox"],
});

// Decoding happens on a separate page so the data URLs don't taint a canvas.
const decoder = await browser.newPage();
await decoder.goto("about:blank");

/**
 * Mean per-channel difference between two screenshots, 0-255.
 *
 * This is the backbone of the whole check. Comparing two renders of the *same*
 * page avoids every colour heuristic: the hero photo's dark forest reads almost
 * identically to the dark teal wall, so absolute colour tests are unreliable.
 */
const diff = (a, b) =>
  decoder.evaluate(
    async (da, db) => {
      const load = async (d) => {
        const i = new Image();
        i.src = "data:image/png;base64," + d;
        await i.decode();
        const c = document.createElement("canvas");
        c.width = i.width;
        c.height = i.height;
        c.getContext("2d").drawImage(i, 0, 0);
        return c.getContext("2d").getImageData(0, 0, i.width, i.height).data;
      };
      const [pa, pb] = await Promise.all([load(da), load(db)]);
      if (pa.length !== pb.length) return -1;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < pa.length; i += 4) {
        sum += Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]);
        n += 3;
      }
      return sum / n;
    },
    a,
    b,
  );

const VIEWPORTS = [
  ["desktop", 1512, 730],
  ["laptop", 1440, 900],
  ["wide", 1920, 1080],
  ["short", 1366, 500],
  ["iphone", 390, 844],
  ["ipad", 834, 1112],
];

let fails = 0;
console.log("=== arch verification (DPR 2) ===");
console.log("closed : green wall must be visible (hiding it changes the frame)");
console.log("open   : arch must cover everything (hiding the wall changes nothing)\n");

for (const [name, W, H] of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1600));

  const go = async (p) => {
    await page.evaluate((y) => window.scrollTo(0, y), p * 5 * H);
    await new Promise((r) => setTimeout(r, 340));
  };
  const setWall = (visible) =>
    page.evaluate((v) => {
      document.querySelector(".dd-hero-atmosphere").style.visibility = v ? "" : "hidden";
    }, visible);

  // How much of the frame does the green wall account for, at each stage?
  const wallContribution = async (p) => {
    await go(p);
    const withWall = await page.screenshot({ encoding: "base64" });
    await setWall(false);
    const without = await page.screenshot({ encoding: "base64" });
    await setWall(true);
    return diff(withWall, without);
  };

  const closedDelta = await wallContribution(0);
  const openDelta = await wallContribution(0.26);

  // Closed: the wall covers most of the screen, so removing it is a big change.
  const closedOk = closedDelta > 1;
  // Fully open: the arch has grown past every edge, so the wall is entirely
  // hidden behind the photo and removing it must be a no-op. Calibrated
  // against the closed delta rather than an absolute number, since how much
  // the wall contributes depends on the photo behind it.
  const openOk = openDelta >= 0 && openDelta < closedDelta / 20;

  const scale = await page.evaluate(
    () => getComputedStyle(document.querySelector(".dd-hero-arch")).clipPath,
  );

  const ok = closedOk && openOk;
  if (!ok) {
    fails++;
    await page.screenshot({ path: `${OUT}/BAD-${name}.png` });
  }
  console.log(
    `${name.padEnd(8)} ${String(W + "x" + H).padEnd(10)} closed=${closedOk ? "ok " : "BAD"}(${closedDelta.toFixed(
      2,
    )}) open=${openOk ? "ok " : "BAD"}(${openDelta.toFixed(4)}) clip=${scale.trim().slice(0, 46)}`,
  );

  await go(0);
  await page.screenshot({ path: `${OUT}/${name}-closed.png` });
  await go(0.12);
  await page.screenshot({ path: `${OUT}/${name}-mid.png` });
  await page.close();
}

console.log(`\n=== viewports failing: ${fails} / ${VIEWPORTS.length} ===`);
await browser.close();
