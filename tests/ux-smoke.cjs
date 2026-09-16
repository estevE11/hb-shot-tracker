const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_URL || "http://localhost:4173");
  await page.waitForSelector("#recent-matches .empty-state");
  await page.screenshot({ path: "/tmp/courtside-home.png", fullPage: true });
  await page.getByRole("button", { name: "01 / ROSTER" }).click();
  await page.getByRole("button", { name: "+ Add New Team" }).click();
  await page.getByLabel("Team name").fill("Barcelona's A");
  await page.getByLabel("Shirt numbers").fill("1,7,11,23");
  await page.getByRole("button", { name: "Create team", exact: true }).click();
  await page.getByRole("button", { name: "+ Add New Team" }).click();
  await page.getByLabel("Team name").fill("Granollers");
  await page.getByLabel("Shirt numbers").fill("3,6,9,12");
  await page.getByRole("button", { name: "Create team", exact: true }).click();
  await page.getByRole("button", { name: "Barcelona's A" }).click();
  await page.getByRole("button", { name: "+ Add New Match" }).click();
  await page.getByLabel("Match name").fill("Saturday's league");
  await page.getByRole("button", { name: "Start tracking" }).click();
  await page.waitForSelector("#canvas-container canvas");
  await page
    .locator("#match-players-grid .player-btn")
    .filter({ hasText: /^\s*7\s*$/ })
    .click();
  const canvas = page.locator("#canvas-container canvas");
  const box = await canvas.boundingBox();
  async function point(x, y) {
    await canvas.click({
      position: {
        x: box.width * (0.05 + 0.91 * x),
        y: box.height * (0.07 + 0.91 * y),
      },
    });
  }
  await point(0.3, 0.65);
  await point(0.4, 0.5);
  // Changing players clears unfinished points.
  await page
    .locator("#match-players-grid .player-btn")
    .filter({ hasText: /^\s*11\s*$/ })
    .click();
  if (
    !(await page
      .locator("#shot-status")
      .textContent()
      .then((t) => t.includes("1 of 3")))
  )
    throw Error("Partial shot carried to another player");
  await page
    .locator("#match-players-grid .player-btn")
    .filter({ hasText: /^\s*7\s*$/ })
    .click();
  await point(0.3, 0.65);
  await point(0.4, 0.5);
  await point(0.5, 0.2);
  // Goal popup is positioned above the final target.
  await canvas.click({
    position: {
      x: box.width * (0.05 + 0.91 * 0.5) - 40,
      y: box.height * (0.07 + 0.91 * 0.2) - 39,
    },
  });
  await page.waitForSelector('#match-shot-list .list-item:has-text("GOAL")');
  await page.getByRole("button", { name: "7m penalty", exact: true }).click();
  if (
    !(await page
      .locator("#shot-status")
      .textContent()
      .then((t) => t.includes("1 of 1")))
  )
    throw Error("Penalty guidance incorrect");
  await point(0.5, 0.2);
  await canvas.click({
    position: {
      x: box.width * (0.05 + 0.91 * 0.5) + 40,
      y: box.height * (0.07 + 0.91 * 0.2) - 39,
    },
  });
  await page.waitForFunction(
    () => document.querySelectorAll("#match-shot-list button").length === 2,
  );
  await page.screenshot({
    path: "/tmp/courtside-tracking.png",
    fullPage: true,
  });
  await page.locator("#match-registration-section .header button").click();
  await page
    .locator("#team-players-grid button")
    .filter({ hasText: /^\s*7\s*$/ })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("#player-stats-info .stat-number")?.textContent ===
      "2",
  );
  await page
    .locator("#shot-type-filters-list .match-filter-item")
    .filter({ hasText: "Penalty (7m)" })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("#player-stats-info .stat-number")?.textContent ===
      "1",
  );
  // Statistics canvas must never create a new shot.
  await page
    .locator("#canvas-container-stats canvas")
    .click({ position: { x: 100, y: 100 } });
  if (
    (await page.evaluate(() => CanvasManager.currentShot.points.length)) !== 0
  )
    throw Error("Statistics canvas accepted a draft");
  await page.locator("summary").click();
  await page
    .locator("#match-filters-list .match-filter-item")
    .filter({ hasText: "Saturday's league" })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll("#match-filters-list .selected").length === 1 &&
      !document
        .querySelector("#match-filters-list .match-filter-item")
        .classList.contains("selected"),
  );
  await page.locator("summary").click();
  await page.screenshot({ path: "/tmp/courtside-stats.png", fullPage: true });
  await page.getByRole("button", { name: "Export ↗", exact: true }).click();
  for (const [name, width, height] of [
    ["phone", 390, 844],
    ["tablet", 820, 1180],
    ["landscape", 1180, 820],
    ["small-landscape", 667, 375],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    await page
      .getByRole("button", { name: "Hide controls", exact: true })
      .click();
    const bounds = await page.locator(".export-overlay").boundingBox();
    if (bounds.width !== width || bounds.height !== height)
      throw Error("Export viewport mismatch " + name);
    await page.screenshot({ path: `/tmp/courtside-export-${name}.png` });
    await page.locator(".export-canvas").click({ position: { x: 10, y: 10 } });
  }
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save PNG" }).click();
  const download = await downloadPromise;
  await download.saveAs("/tmp/courtside-report.png");
  await page.getByRole("button", { name: "← Exit", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/courtside-mobile-stats.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /COURTSIDE/ }).click();
  await page.screenshot({
    path: "/tmp/courtside-mobile-home.png",
    fullPage: true,
  });
  await page.reload();
  await page.waitForSelector("#recent-matches .list-item");
  if ((await page.evaluate(() => db.shots.count())) !== 2)
    throw Error("Saved shots did not persist");
  await page.getByRole("button", { name: /Saturday's league/ }).click();
  await page.waitForSelector("#match-players-grid .player-btn");
  await page.screenshot({
    path: "/tmp/courtside-mobile-tracking.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Mobile horizontal overflow");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS: team/match creation, quoted names, partial-shot reset, goal + penalty save, consistent filters, read-only stats, four export viewports, PNG download, clean exit, no page errors",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
