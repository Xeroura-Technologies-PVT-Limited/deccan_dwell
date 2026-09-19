import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/herointro";
mkdirSync(OUT, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ["--no-sandbox"],
});

const run = async (label, W, H) => {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const start = Date.now();
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });

  const shots = [
    ["cluster", 350],
    ["opening", 1200],
    ["open", 2100],
    ["home", 4000],
  ];

  console.log(`\n=== ${label} ${W}x${H} ===`);
  for (const [name, at] of shots) {
    const wait = at - (Date.now() - start);
    if (wait > 0) await sleep(wait);
    const phase = await page.evaluate(
      () => document.querySelector("[data-dd-intro]")?.getAttribute("data-dd-intro") ?? "gone",
    );
    await page.screenshot({ path: `${OUT}/${label}-${name}.png` });
    console.log(`  ${name.padEnd(10)} t=${String(at).padEnd(5)} phase=${phase}`);
  }
  await page.close();
};

await run("desktop", 1512, 730);
await run("phone", 390, 844);
await browser.close();
