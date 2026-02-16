import { test, expect } from "@playwright/test";
import { resetEditor, createNewTab, getCursorPosition, getCellContent, getHighlightedCells, goToFirstStaffLine } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetEditor(page);
  await createNewTab(page);
  await goToFirstStaffLine(page);
});

test.describe("Delete key", () => {
  test("Delete clears current cell value", async ({ page }) => {
    const pos = await getCursorPosition(page);
    // Type something first
    await page.keyboard.press("5");
    await page.keyboard.press("Enter");
    // Verify it was entered
    let content = await getCellContent(page, pos.line, pos.chord, pos.string);
    expect(content).toContain("5");
    // Delete should clear it
    await page.keyboard.press("Delete");
    content = await getCellContent(page, pos.line, pos.chord, pos.string);
    expect(content).not.toContain("5");
  });
});

test.describe("Backspace key", () => {
  test("Backspace clears previous chord value and moves left", async ({ page }) => {
    const pos = await getCursorPosition(page);
    // Type a value and commit
    await page.keyboard.press("7");
    await page.keyboard.press("Enter");
    // Move right
    await page.keyboard.press("ArrowRight");
    const beforeBackspace = await getCursorPosition(page);
    expect(beforeBackspace.chord).toBe(pos.chord + 1);
    // Backspace should clear previous chord and move left
    await page.keyboard.press("Backspace");
    const after = await getCursorPosition(page);
    expect(after.chord).toBe(pos.chord);
  });
});

test.describe("Shift+Backspace (delete chord)", () => {
  test("Shift+Backspace deletes the entire chord", async ({ page }) => {
    const pos = await getCursorPosition(page);
    const lineIndex = pos.line;

    const initialChordCount = await page.locator(`[data-cell][data-line="${lineIndex}"][data-string="0"]`).count();

    await page.keyboard.press("Shift+Backspace");

    const newChordCount = await page.locator(`[data-cell][data-line="${lineIndex}"][data-string="0"]`).count();
    expect(newChordCount).toBe(initialChordCount - 1);
  });
});

test.describe("Ctrl+Backspace (delete line)", () => {
  test("Ctrl+Backspace deletes the entire staff line", async ({ page }) => {
    const pos = await getCursorPosition(page);
    const lineIndex = pos.line;

    // Count total lines with data-cell before deletion
    const linesBefore = await page.locator("[data-cell]").evaluateAll((cells) => {
      const lines = new Set(cells.map((c) => c.getAttribute("data-line")));
      return lines.size;
    });

    await page.keyboard.press("Control+Backspace");
    await page.waitForTimeout(100);

    // Count total lines after deletion - should have fewer
    const linesAfter = await page.locator("[data-cell]").evaluateAll((cells) => {
      const lines = new Set(cells.map((c) => c.getAttribute("data-line")));
      return lines.size;
    });

    expect(linesAfter).toBeLessThan(linesBefore);
  });
});

test.describe("Delete/Backspace with selection", () => {
  test("Delete with range selection clears all selected content", async ({ page }) => {
    const pos = await getCursorPosition(page);
    // Type a value at chord 0
    await page.keyboard.press("5");
    await page.keyboard.press("Enter");
    // Verify it was entered
    let content = await getCellContent(page, pos.line, 0, pos.string);
    expect(content).toContain("5");

    // Select multiple chords with Shift+ArrowRight from current position
    await page.keyboard.down("Shift");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.up("Shift");

    const highlighted = await getHighlightedCells(page);
    expect(highlighted.length).toBeGreaterThan(1);

    // Delete should clear the selection
    await page.keyboard.press("Delete");

    // The cell that had "5" should now be cleared
    content = await getCellContent(page, pos.line, 0, pos.string);
    expect(content).not.toMatch(/[0-9]/);
  });
});
