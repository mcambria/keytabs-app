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

test.describe("Deleting selections", () => {
  const stored = (page: import("@playwright/test").Page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem(`tab_${localStorage.getItem("current-tab-id")}`)!).entries);

  test("Shift+Delete removes the selected chords", async ({ page }) => {
    const before = await page.locator(`[data-cell][data-line="1"][data-string="0"]`).count();
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+Delete");
    await expect(page.locator(`[data-cell][data-line="1"][data-string="0"]`)).toHaveCount(before - 2);
  });

  test("Delete on a whole-staff selection removes the staff", async ({ page }) => {
    const before = (await stored(page)).length;
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
    // the whole staff is selected
    expect(await getHighlightedCells(page)).toHaveLength(32 * 6);
    await page.keyboard.press("Delete");
    // the staff and the empty text after it are gone
    await expect.poll(async () => (await stored(page)).length).toBe(before - 2);
    expect(await getCursorPosition(page)).toEqual({ line: 0, chord: "[Verse]".length, string: 0 });
  });

  test("Backspace on a selection across entries removes them all", async ({ page }) => {
    // staff 1 through staff 3
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    const lines = [...new Set((await getHighlightedCells(page)).map((c) => c.line))];
    expect(lines).toEqual([1, 2, 3]);
    await page.keyboard.press("Backspace");
    await expect.poll(async () => (await stored(page)).slice(0, 2)).toEqual(["[Verse]\n[Chorus]", expect.any(Array)]);
  });
});

test.describe("Bar lines", () => {
  const firstChords = (page: import("@playwright/test").Page) =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem(`tab_${localStorage.getItem("current-tab-id")}`)!)
        .entries[1].slice(0, 3)
        .map((chord: string[]) => chord.join(""))
    );

  // goToFirstStaffLine puts the cursor at chord 0; "|" inserts a bar at chord 1
  // and moves the cursor to chord 2
  test.beforeEach(async ({ page }) => {
    await page.keyboard.press("5");
    await page.keyboard.press("Enter");
    await page.keyboard.press("|");
    expect(await firstChords(page)).toEqual(["5", "||||||", ""]);
  });

  test("Backspace just after a bar removes the whole bar", async ({ page }) => {
    await page.keyboard.press("Backspace");
    expect(await firstChords(page)).toEqual(["5", "", ""]);
    expect((await getCursorPosition(page)).chord).toBe(1);
  });

  test("Backspace after a bar on a lower string removes the whole bar", async ({ page }) => {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Backspace");
    expect(await firstChords(page)).toEqual(["5", "", ""]);
  });

  test("Delete on a bar removes the whole bar", async ({ page }) => {
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Delete");
    expect(await firstChords(page)).toEqual(["5", "", ""]);
  });

  test("Typing on a bar does not change it", async ({ page }) => {
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("7");
    expect(await firstChords(page)).toEqual(["5", "||||||", ""]);
  });
});
