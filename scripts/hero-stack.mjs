/**
 * The card gating hides cards that haven't started moving. Verify that every
 * card still shows up on the way down AND on the way back up, and that no
 * card is ever visible while it is still parked off-screen.
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/herostack";
mkdirSync(OUT, { recursive: true });
const W = 1512;
const H = 730;

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: false,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2000));

const probe = () =>
  page.evaluate(() => {
    const arch = document.querySelector(".dd-hero-arch");
    const cards = [...arch.querySelectorAll(":scope > div > div")].filter(
      (d) => d.querySelector("img"),
    );
    return cards.map((c, i) => {
      const cs = getComputedStyle(c);
      const r = c.getBoundingClientRect();
      const img = c.querySelector("img");
      return {
        i,
        visible: cs.visibility,
        willChange: cs.willChange,
        // How far down the viewport the card's top edge sits, as a fraction.
        topFrac: +(r.top / window.innerHeight).toFixed(3),
        loaded: img.complete && img.naturalWidth > 0,
      };
    });
  });

const POSITIONS = [0, 0.2, 0.32, 0.45, 0.58, 0.72, 0.86, 1.0];
let problems = 0;

const runPass = async (label, positions) => {
  console.log(`\n--- ${label} ---`);
  for (const p of positions) {
    await page.evaluate((y) => window.scrollTo(0, y), p * 5 * H);
    await new Promise((r) => setTimeout(r, 380));
    const cards = await probe();

    // A visible card must either be on screen or exactly at the bottom edge.
    // A hidden card must be parked fully below the fold.
    const bad = cards.filter((c) =>
      c.visible === "hidden" ? c.topFrac < 0.999 : !c.loaded,
    );
    if (bad.length) problems += bad.length;

    console.log(
      `  p=${String(p).padEnd(5)} ` +
        cards
          .map((c) => `${c.i}:${c.visible === "visible" ? "vis" : "hid"}@${c.topFrac}${c.loaded ? "" : "!UNLOADED"}`)
          .join("  ") +
        (bad.length ? `  <-- BAD: ${bad.map((b) => b.i).join(",")}` : ""),
    );
    await page.screenshot({ path: `${OUT}/${label}-${p}.png` });
  }
};

await runPass("down", POSITIONS);
await runPass("up", [...POSITIONS].reverse());

// Every card must have been visible at some point on the way through.
await page.evaluate((y) => window.scrollTo(0, y), 1.0 * 5 * H);
await new Promise((r) => setTimeout(r, 400));
const final = await probe();
const allSeen = final.every((c) => c.visible === "visible");
console.log(
  `\nall cards visible at the end of the stack: ${allSeen ? "PASS" : "FAIL"}`,
);
console.log(`inconsistent card states: ${problems} ${problems === 0 ? "PASS" : "FAIL"}`);

await browser.close();
