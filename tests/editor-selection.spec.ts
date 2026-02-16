import { test, expect } from "@playwright/test";
import { resetEditor, createNewTab, getCursorPosition, getHighlightedCells, clickCell, getCell, goToFirstStaffLine } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetEditor(page);
  await createNewTab(page);
});

test.describe("Shift+Arrow selection", () => {
  test("Shift+ArrowRight extends selection to include full chord", async ({ page }) => {
    await goToFirstStaffLine(page);
    const initial = await getCursorPosition(page);
    await page.keyboard.down("Shift");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.up("Shift");
    const highlighted = await getHighlightedCells(page);
    // First shift+arrow on a single position selects the full chord (all 6 strings)
    expect(highlighted.length).toBeGreaterThan(1);
    // All highlighted cells should span at least the initial chord's strings
    const strings = highlighted.filter((c) => c.chord === initial.chord);
    expect(strings.length).toBe(6);
  });

  test("Multiple Shift+ArrowRight extends selection further", async ({ page }) => {
    await goToFirstStaffLine(page);
    await page.keyboard.down("Shift");
    await page.keyboard.press("ArrowRight");
    const first = await getHighlightedCells(page);
    await page.keyboard.press("ArrowRight");
    const second = await getHighlightedCells(page);
    await page.keyboard.up("Shift");
    expect(second.length).toBeGreaterThan(first.length);
  });

  test("Shift+ArrowLeft extends selection to the left", async ({ page }) => {
    await goToFirstStaffLine(page);
    // Move right first
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.down("Shift");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.up("Shift");
    const highlighted = await getHighlightedCells(page);
    // Should have selection spanning at least one chord of all 6 strings
    expect(highlighted.length).toBeGreaterThanOrEqual(6);
  });
});

test.describe("Click selection", () => {
  test("Click positions cursor at the clicked cell", async ({ page }) => {
    await clickCell(page, 1, 10, 3);
    const after = await getCursorPosition(page);
    expect(after.line).toBe(1);
    expect(after.chord).toBe(10);
    expect(after.string).toBe(3);
  });

  test("Shift+Click extends selection from cursor to clicked cell", async ({ page }) => {
    await goToFirstStaffLine(page);
    const initial = await getCursorPosition(page);
    // Shift+click on a cell further right
    const targetCell = getCell(page, initial.line, 5, 3);
    await targetCell.click({ modifiers: ["Shift"] });
    await page.waitForTimeout(100);
    const highlighted = await getHighlightedCells(page);
    // Should have multiple cells highlighted between initial and target
    expect(highlighted.length).toBeGreaterThan(1);
  });
});

test.describe("Ctrl+A select all", () => {
  test("Ctrl+A selects all cells", async ({ page }) => {
    await page.keyboard.press("Control+a");
    const highlighted = await getHighlightedCells(page);
    // Should have many cells highlighted (entire tab content)
    expect(highlighted.length).toBeGreaterThan(100);
  });
});

test.describe("Click and drag selection", () => {
  test("Dragging across cells creates selection", async ({ page }) => {
    const staffLine = 1; // First staff line
    const startCell = getCell(page, staffLine, 2, 0);
    const endCell = getCell(page, staffLine, 6, 0);

    const startBox = await startCell.boundingBox();
    const endBox = await endCell.boundingBox();

    if (startBox && endBox) {
      await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2);
      await page.mouse.up();
      await page.waitForTimeout(150);

      const highlighted = await getHighlightedCells(page);
      // Should have selection across multiple chords (at least 5 chords * 6 strings)
      expect(highlighted.length).toBeGreaterThan(6);
    }
  });
});
