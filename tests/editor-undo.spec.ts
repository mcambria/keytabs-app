import { test, expect, Page } from "@playwright/test";
import { resetEditor, createNewTab, clickCell, getCellContent, getCursorPosition, goToFirstStaffLine } from "./helpers";

const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem(`tab_${localStorage.getItem("current-tab-id")}`)!).entries);

test.beforeEach(async ({ page }) => {
  await resetEditor(page);
  await createNewTab(page);
});

test.describe("Undo and redo", () => {
  test("Typing in a text block is undone as one step, then redone", async ({ page }) => {
    await clickCell(page, 0, "[Verse]".length, 0);
    await page.keyboard.type(" one");
    await expect.poll(async () => (await stored(page))[0]).toBe("[Verse] one");

    await page.keyboard.press("Control+z");
    await expect.poll(async () => (await stored(page))[0]).toBe("[Verse]");
    expect(await getCursorPosition(page)).toEqual({ line: 0, chord: 7, string: 0 });

    await page.keyboard.press("Control+Shift+Z");
    await expect.poll(async () => (await stored(page))[0]).toBe("[Verse] one");
  });

  test("Multi-digit cell entry is one step", async ({ page }) => {
    await goToFirstStaffLine(page);
    await page.keyboard.type("12");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.type("3");
    await page.keyboard.press("Enter");

    await page.keyboard.press("Control+z");
    expect(await getCellContent(page, 1, 1, 0)).not.toContain("3");
    expect(await getCellContent(page, 1, 0, 0)).toContain("12");
    await page.keyboard.press("Control+z");
    expect(await getCellContent(page, 1, 0, 0)).not.toContain("1");
  });

  test("Deleting a staff can be undone and redone", async ({ page }) => {
    await goToFirstStaffLine(page);
    const before = await stored(page);
    await page.keyboard.press("Control+Backspace");
    await expect.poll(async () => (await stored(page)).length).toBe(before.length - 2);

    await page.keyboard.press("Control+z");
    await expect.poll(() => stored(page)).toEqual(before);
    expect(await getCursorPosition(page)).toEqual({ line: 1, chord: 0, string: 0 });

    await page.keyboard.press("Control+y");
    await expect.poll(async () => (await stored(page)).length).toBe(before.length - 2);
  });

  test("A new edit clears redo", async ({ page }) => {
    await clickCell(page, 0, 7, 0);
    await page.keyboard.type("a");
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(1100);
    await page.keyboard.type("b");
    await page.keyboard.press("Control+Shift+Z");
    await expect.poll(async () => (await stored(page))[0]).toBe("[Verse]b");
  });

  test("Undo history does not carry over to another tab", async ({ page }) => {
    // two undo steps in the first tab; the top one restores "[Verse]x"
    await clickCell(page, 0, 7, 0);
    await page.keyboard.type("x");
    await page.waitForTimeout(1100);
    await page.keyboard.type("y");
    await createNewTab(page);
    await clickCell(page, 0, 7, 0);
    await page.keyboard.press("Control+z");
    await expect.poll(async () => (await stored(page))[0]).toBe("[Verse]");
  });
});
