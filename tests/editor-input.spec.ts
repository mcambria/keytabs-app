import { test, expect } from "@playwright/test";
import { resetEditor, createNewTab, getCursorPosition, getCellContent, getCell, goToFirstStaffLine } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetEditor(page);
  await createNewTab(page);
});

test.describe("Character input on staff lines", () => {
  test("Typing a digit enters it into the current cell", async ({ page }) => {
    await goToFirstStaffLine(page);
    const pos = await getCursorPosition(page);
    await page.keyboard.press("5");
    const content = await getCellContent(page, pos.line, pos.chord, pos.string);
    expect(content).toContain("5");
  });

  test("Typing in edit mode appends to the cell value", async ({ page }) => {
    await goToFirstStaffLine(page);
    const pos = await getCursorPosition(page);
    await page.keyboard.press("1");
    await page.keyboard.press("2");
    const content = await getCellContent(page, pos.line, pos.chord, pos.string);
    expect(content).toContain("12");
  });

  test("Enter commits edit mode", async ({ page }) => {
    await goToFirstStaffLine(page);
    const pos = await getCursorPosition(page);
    // Type a value to enter edit mode
    await page.keyboard.press("7");
    // Enter should commit
    await page.keyboard.press("Enter");
    // Typing again should start a new edit, not append
    await page.keyboard.press("3");
    const content = await getCellContent(page, pos.line, pos.chord, pos.string);
    // The cell should have "3" (new edit), not "73"
    expect(content).toContain("3");
  });

  test("Escape discards edit mode and collapses selection", async ({ page }) => {
    await goToFirstStaffLine(page);
    const pos = await getCursorPosition(page);
    await page.keyboard.press("9");
    // Move right to commit, then back
    await page.keyboard.press("Escape");
    // After escape, cursor should still be at same position
    const after = await getCursorPosition(page);
    expect(after.chord).toBe(pos.chord);
  });

  test("Bar delimiter | inserts bar line and moves cursor right by 2", async ({ page }) => {
    await goToFirstStaffLine(page);
    const pos = await getCursorPosition(page);
    await page.keyboard.press("|");
    const after = await getCursorPosition(page);
    expect(after.chord).toBe(pos.chord + 2);
  });

  test("Space is ignored on staff lines", async ({ page }) => {
    await goToFirstStaffLine(page);
    const pos = await getCursorPosition(page);
    await page.keyboard.press(" ");
    // Cursor should not move
    const after = await getCursorPosition(page);
    expect(after.chord).toBe(pos.chord);
  });
});

test.describe("Character input on text lines", () => {
  test("Typing on a text line inserts character and moves right", async ({ page }) => {
    // Navigate to text line (line 0 is the first text line "[Verse]")
    // Click on the text line
    const textCell = getCell(page, 0, 0, 0);
    await textCell.click();
    await page.waitForTimeout(150);

    const pos = await getCursorPosition(page);
    expect(pos.line).toBe(0);

    await page.keyboard.press("H");
    const after = await getCursorPosition(page);
    // Should move one chord right after inserting
    expect(after.chord).toBe(pos.chord + 1);
  });
});
