import { test, expect } from "@playwright/test";
import { resetEditor, createNewTab, getCursorPosition, getCellContent, goToFirstStaffLine, clickCell } from "./helpers";

test.beforeEach(async ({ page, context }) => {
  // Grant clipboard permissions for copy/paste tests
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await resetEditor(page);
  await createNewTab(page);
  await goToFirstStaffLine(page);
});

test.describe("Copy and paste", () => {
  test("Ctrl+C copies and Ctrl+V pastes single cell value", async ({ page }) => {
    const pos = await getCursorPosition(page);

    // Type a value
    await page.keyboard.press("9");
    await page.keyboard.press("Enter");

    // Verify it was entered
    let content = await getCellContent(page, pos.line, pos.chord, pos.string);
    expect(content).toContain("9");

    // Copy it (Ctrl+C)
    await page.keyboard.press("Control+c");

    // Move to a different chord
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    const pastePos = await getCursorPosition(page);

    // Paste (Ctrl+V)
    await page.keyboard.press("Control+v");
    await page.waitForTimeout(100);

    // The pasted content should appear at the paste position
    const pastedContent = await getCellContent(page, pastePos.line, pastePos.chord, pastePos.string);
    expect(pastedContent).toContain("9");
  });

  test("Copy and paste a multi-chord selection", async ({ page }) => {
    const pos = await getCursorPosition(page);

    // Type values in consecutive chords
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("2");
    await page.keyboard.press("Enter");

    // Click back at chord 0 to reset initialSelectionPosition properly
    await clickCell(page, pos.line, 0, 0);

    // Select from chord 0 rightward with Shift+ArrowRight
    await page.keyboard.down("Shift");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.up("Shift");

    // Copy
    await page.keyboard.press("Control+c");

    // Navigate to chord 15 for pasting
    await clickCell(page, pos.line, 15, 0);
    const pastePos = await getCursorPosition(page);
    expect(pastePos.chord).toBe(15);

    // Paste
    await page.keyboard.press("Control+v");
    await page.waitForTimeout(100);

    // After paste with insertChords, the pasted chords are inserted at chord 15
    const c0 = await getCellContent(page, pastePos.line, pastePos.chord, pastePos.string);
    expect(c0).toContain("1");
  });
});
