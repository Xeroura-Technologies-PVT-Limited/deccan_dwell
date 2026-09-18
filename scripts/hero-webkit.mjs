/**
 * Verify the hero in WebKit — the engine Safari and every iOS browser uses.
 *
 * This is the case that was reported as looking "more different and shit", and
 * the one the old two-contour `path(evenodd, ...)` clip could not be trusted
 * to rasterise the same way as Chrome.
 */
import { webkit, devices } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/herowebkit";
mkdirSync(OUT, { recursive: true });

const browser = await webkit.launch();

const CASES = [
  ["safari-desktop", { viewport: { width: 1512, height: 730 }, deviceScaleFactor: 2 }],
  ["safari-laptop", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }],
  ["iphone-15", devices["iPhone 15"]],
  ["iphone-se", devices["iPhone SE"]],
  ["ipad", devices["iPad Pro 11"]],
];

let fails = 0;

for (const [name, opts] of CASES) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const H = page.viewportSize().height;
  const go = async (p) => {
    await page.evaluate((y) => window.scrollTo(0, y), p * 5 * H);
    await page.waitForTimeout(400);
  };

  // Does WebKit accept and apply the clip at all?
  const applied = await page.evaluate(() => {
    const el = document.querySelector(".dd-hero-arch");
    if (!el) return { ok: false, why: "no .dd-hero-arch" };
    const cs = getComputedStyle(el);
    const clip = cs.clipPath || cs.webkitClipPath;
    return { ok: !!clip && clip !== "none", clip, inline: el.style.clipPath };
  });

  // Same differential test as Chrome: at full openness, hiding the green layer
  // must change nothing; at rest it must change a lot.
  const wallDelta = async (p) => {
    await go(p);
    const a = await page.screenshot();
    await page.evaluate(() => {
      document.querySelector(".dd-hero-atmosphere").style.visibility = "hidden";
    });
    const b = await page.screenshot();
    await page.evaluate(() => {
      document.querySelector(".dd-hero-atmosphere").style.visibility = "";
    });
    // Compare raw PNG bytes via the page's own canvas.
    return page.evaluate(
      async ([da, db]) => {
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
        let s = 0;
        let n = 0;
        for (let i = 0; i < pa.length; i += 4) {
          s += Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]);
          n += 3;
        }
        return s / n;
      },
      [a.toString("base64"), b.toString("base64")],
    );
  };

  const closed = await wallDelta(0);
  await page.screenshot({ path: `${OUT}/${name}-closed.png` });
  await go(0.12);
  await page.screenshot({ path: `${OUT}/${name}-mid.png` });
  const open = await wallDelta(0.26);
  await go(0.6);
  await page.screenshot({ path: `${OUT}/${name}-stack.png` });

  const closedOk = closed > 1;
  const openOk = open >= 0 && open < closed / 20;
  const ok = applied.ok && closedOk && openOk;
  if (!ok) fails++;

  console.log(
    `${name.padEnd(15)} clipApplied=${applied.ok ? "yes" : "NO "} closed=${
      closedOk ? "ok " : "BAD"
    }(${closed.toFixed(2)}) open=${openOk ? "ok " : "BAD"}(${open.toFixed(4)}) ${ok ? "" : "<-- FAIL"}`,
  );
  if (!applied.ok) console.log(`   ${JSON.stringify(applied)}`);

  await ctx.close();
}

console.log(`\n=== WebKit cases failing: ${fails} / ${CASES.length} ===`);
await browser.close();
