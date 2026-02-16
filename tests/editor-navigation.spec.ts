import { test, expect } from "@playwright/test";
import { resetEditor, createNewTab, getCursorPosition, clickCell, goToFirstStaffLine } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetEditor(page);
  await createNewTab(page);
});

test.describe("Arrow key navigation", () => {
  test("ArrowRight moves cursor one chord right", async ({ page }) => {
    const initial = await getCursorPosition(page);
    await page.keyboard.press("ArrowRight");
    const after = await getCursorPosition(page);
    expect(after.chord).toBe(initial.chord + 1);
    expect(after.line).toBe(initial.line);
  });

  test("ArrowLeft moves cursor one chord left", async ({ page }) => {
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    const before = await getCursorPosition(page);
    await page.keyboard.press("ArrowLeft");
    const after = await getCursorPosition(page);
    expect(after.chord).toBe(before.chord - 1);
  });

  test("ArrowDown moves cursor one string down on staff line", async ({ page }) => {
    await goToFirstStaffLine(page);
    const initial = await getCursorPosition(page);
    await page.keyboard.press("ArrowDown");
    const after = await getCursorPosition(page);
    expect(after.string).toBe(initial.string + 1);
    expect(after.chord).toBe(initial.chord);
  });

  test("ArrowUp moves cursor one string up on staff line", async ({ page }) => {
    await goToFirstStaffLine(page);
    // Move down first so we have room to go up
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const before = await getCursorPosition(page);
    await page.keyboard.press("ArrowUp");
    const after = await getCursorPosition(page);
    expect(after.string).toBe(before.string - 1);
  });

  test("Ctrl+ArrowRight jumps 8 chords", async ({ page }) => {
    await goToFirstStaffLine(page);
    const initial = await getCursorPosition(page);
    await page.keyboard.press("Control+ArrowRight");
    const after = await getCursorPosition(page);
    expect(after.chord).toBe(initial.chord + 8);
  });

  test("Ctrl+ArrowLeft jumps 8 chords left", async ({ page }) => {
    await goToFirstStaffLine(page);
    await page.keyboard.press("Control+ArrowRight");
    await page.keyboard.press("Control+ArrowRight");
    const before = await getCursorPosition(page);
    await page.keyboard.press("Control+ArrowLeft");
    const after = await getCursorPosition(page);
    expect(after.chord).toBe(before.chord - 8);
  });

  test("Ctrl+ArrowDown moves to a later line", async ({ page }) => {
    await goToFirstStaffLine(page);
    const initial = await getCursorPosition(page);
    await page.keyboard.press("Control+ArrowDown");
    const after = await getCursorPosition(page);
    expect(after.line).toBeGreaterThan(initial.line);
  });

  test("Ctrl+ArrowUp moves to an earlier line", async ({ page }) => {
    await goToFirstStaffLine(page);
    // Move down a couple of lines first
    await page.keyboard.press("Control+ArrowDown");
    await page.keyboard.press("Control+ArrowDown");
    await page.keyboard.press("Control+ArrowDown");
    const before = await getCursorPosition(page);
    await page.keyboard.press("Control+ArrowUp");
    const after = await getCursorPosition(page);
    expect(after.line).toBeLessThan(before.line);
  });
});

test.describe("Home/End navigation", () => {
  test("Home moves cursor to chord 0 on same line", async ({ page }) => {
    await goToFirstStaffLine(page);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Home");
    const after = await getCursorPosition(page);
    expect(after.chord).toBe(0);
  });

  test("End moves cursor to last chord on same line", async ({ page }) => {
    await goToFirstStaffLine(page);
    await page.keyboard.press("End");
    const after = await getCursorPosition(page);
    // Default tab has 32 columns, so last chord index is 31
    expect(after.chord).toBe(31);
  });
});

test.describe("Cursor wrapping", () => {
  test("ArrowDown wraps from last string to next line on staff line", async ({ page }) => {
    await goToFirstStaffLine(page);
    const initial = await getCursorPosition(page);
    // Move to last string (string 5 for 6-string guitar)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowDown");
    }
    const atBottom = await getCursorPosition(page);
    expect(atBottom.string).toBe(5);
    expect(atBottom.line).toBe(initial.line);
    // One more down should wrap to next line
    await page.keyboard.press("ArrowDown");
    const wrapped = await getCursorPosition(page);
    expect(wrapped.line).toBeGreaterThan(initial.line);
    expect(wrapped.string).toBe(0);
  });

  test("ArrowLeft at chord 0 clamps to chord 0", async ({ page }) => {
    await goToFirstStaffLine(page);
    // Already at chord 0, pressing left should clamp
    const initial = await getCursorPosition(page);
    expect(initial.chord).toBe(0);
    await page.keyboard.press("ArrowLeft");
    const after = await getCursorPosition(page);
    expect(after.chord).toBe(0);
    // Line might change to text line above, that's ok - just verify chord doesn't go negative
  });
});

test.describe("Click to position", () => {
  test("Clicking a cell positions cursor there", async ({ page }) => {
    await clickCell(page, 1, 5, 2);
    const after = await getCursorPosition(page);
    expect(after.line).toBe(1);
    expect(after.chord).toBe(5);
    expect(after.string).toBe(2);
  });
});
