import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/herostory";
mkdirSync(OUT, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ["--no-sandbox"],
});

const inspect = (page) =>
  page.evaluate(() => {
    const polaroids = [...document.querySelectorAll(".dd-polaroid, .dd-tell-polaroid")];
    const visible = polaroids.filter((el) => parseFloat(getComputedStyle(el).opacity) > 0.08);
    const names = visible.map((el) => el.querySelector(".dd-polaroid-caption")?.textContent?.trim());
    const labels = [...document.querySelectorAll("[data-dd-km]")].filter(
      (s) => parseFloat(getComputedStyle(s).opacity) > 0.1,
    );
    const hotel = names.includes("Deccan Dwell");
    return {
      polaroidCount: visible.length,
      names,
      hotel,
      labels: labels.map((l) => l.textContent.trim()),
      scrollY: Math.round(window.scrollY),
    };
  });

const run = async (label, W, H) => {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000/?intro=0", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1600));

  const range = await page.evaluate(() => {
    const section = document.getElementById("home");
    return section.getBoundingClientRect().height - window.innerHeight;
  });

  const shots = [
    ["closed", 0],
    ["portal-open", 0.09],
    ["tell-hotel", 0.16],
    ["tell-next", 0.22],
    ["tell-rooms", 0.29],
    ["story-mid", 0.45],
    ["story-lines", 0.64],
    ["stack", 0.75],
  ];

  console.log(`\n=== ${label} ${W}x${H} range=${Math.round(range)} ===`);
  for (const [name, p] of shots) {
    await page.evaluate((y) => window.scrollTo(0, y), p * range);
    await new Promise((r) => setTimeout(r, 420));
    const d = await inspect(page);
    await page.screenshot({ path: `${OUT}/${label}-${name}.png` });
    console.log(
      `  ${name.padEnd(12)} p=${String(p).padEnd(5)} polaroids=${d.polaroidCount} hotel=${d.hotel} labels=${d.labels.length} [${d.names.join(", ")}]`,
    );
  }
  await page.close();
};

await run("desktop", 1512, 730);
await run("phone", 390, 844);
await browser.close();
