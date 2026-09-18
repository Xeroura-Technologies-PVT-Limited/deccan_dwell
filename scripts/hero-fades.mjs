/**
 * Every scroll-driven fade must actually reach the DOM and must actually
 * reach zero — in both engines, on desktop and on phones.
 *
 * This is the regression that hid for so long: the motion values were correct
 * while the styles were never written, so the title only *looked* like it left
 * on desktop (it magnifies until the viewport sits between two glyphs). On a
 * phone it never grows that large, so it just sat on top of the card stack.
 */
import { webkit, devices } from "playwright";
import puppeteer from "puppeteer-core";

const READ = () => {
  // Read *computed* opacity, not inline. A Web Animations API animation
  // overrides inline styles, so an inline "0" can still paint fully opaque —
  // which is exactly how the Explore bar stayed visible while its inline
  // style said it was hidden.
  const out = {};
  const title = document.querySelector('svg[role="img"]');
  const titleBox = title ? title.parentElement : null;

  const opacityOf = (el) => (el ? getComputedStyle(el).opacity : "missing");
  out.title = opacityOf(titleBox);
  out.header = opacityOf(document.querySelector("header"));
  out.palm = opacityOf(document.querySelector(".dd-hero-palms"));
  out.explore = opacityOf(document.querySelector("[class*='bottom-8']"));
  out.side = opacityOf(document.querySelector("[class*='left-6'], [class*='left-10']"));

  // Anything still painting after the fly-past is a bug, so flag each one.
  const onScreen = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  };
  const lingering = [];
  for (const [name, el] of [
    ["title", titleBox],
    ["header", document.querySelector("header")],
    ["palm", document.querySelector(".dd-hero-palms")],
    ["explore", document.querySelector("[class*='bottom-8']")],
  ]) {
    if (el && onScreen(el) && parseFloat(getComputedStyle(el).opacity) > 0.01) lingering.push(name);
  }
  out.lingering = lingering;

  // Nothing should be running a WAAPI animation on opacity — that is what
  // silently overrode the scroll-driven fades.
  out.waapi = [
    ["title", titleBox],
    ["header", document.querySelector("header")],
    ["explore", document.querySelector("[class*='bottom-8']")],
  ]
    .filter(([, el]) => el && el.getAnimations().length > 0)
    .map(([n]) => n);

  return out;
};

const STEPS = [0, 0.06, 0.12, 0.2, 0.35, 0.6];
let fails = 0;

const check = async (label, read, setScroll, H) => {
  console.log(`\n--- ${label} ---`);
  for (const s of STEPS) {
    await setScroll(s * 5 * H);
    const d = await read();
    // Past the fly-past, every piece of hero chrome must be fully gone.
    const bad = s >= 0.2 && d.lingering.length > 0;
    if (bad) fails++;
    console.log(
      `  p=${String(s).padEnd(5)} header=${String(d.header).padEnd(5)} palm=${String(d.palm).padEnd(
        5,
      )} title=${String(d.title).padEnd(5)} explore=${String(d.explore).padEnd(5)} waapi=[${d.waapi.join(
        ",",
      )}] lingering=[${d.lingering.join(",")}]${bad ? "  <-- BAD" : ""}`,
    );
  }
};

// ---- Chrome
{
  const b = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: false,
    args: ["--no-sandbox"],
  });
  for (const [name, W, H] of [
    ["CHROME 1512x730", 1512, 730],
    ["CHROME 390x844 (phone)", 390, 844],
  ]) {
    const p = await b.newPage();
    await p.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    await p.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1800));
    await check(
      name,
      () => p.evaluate(READ),
      async (y) => {
        await p.evaluate((v) => window.scrollTo(0, v), y);
        await new Promise((r) => setTimeout(r, 380));
      },
      H,
    );
    await p.close();
  }
  await b.close();
}

// ---- WebKit (Safari / iOS)
{
  const b = await webkit.launch();
  for (const [name, opts] of [
    ["WEBKIT desktop", { viewport: { width: 1512, height: 730 } }],
    ["WEBKIT iPhone 15", devices["iPhone 15"]],
    ["WEBKIT iPhone SE", devices["iPhone SE"]],
  ]) {
    const ctx = await b.newContext(opts);
    const p = await ctx.newPage();
    await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    await p.waitForTimeout(1800);
    const H = p.viewportSize().height;
    await check(
      name,
      () => p.evaluate(READ),
      async (y) => {
        await p.evaluate((v) => window.scrollTo(0, v), y);
        await p.waitForTimeout(380);
      },
      H,
    );
    await ctx.close();
  }
  await b.close();
}

console.log(`\n=== lingering-chrome failures: ${fails} ${fails === 0 ? "PASS" : "FAIL"} ===`);
