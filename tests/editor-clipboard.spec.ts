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

test.describe("Cursor after paste", () => {
  const firstStaff = (page: import("@playwright/test").Page) =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem(`tab_${localStorage.getItem("current-tab-id")}`)!)
        .entries[1].slice(0, 8)
        .map((chord: string[]) => chord[0] || ".")
        .join("")
    );

  /** Enter "1" and "2" in chords 0-1 of the first staff and copy them. */
  const copyTwoChords = async (page: import("@playwright/test").Page) => {
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("2");
    await page.keyboard.press("Enter");
    await clickCell(page, 1, 0, 0);
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Control+c");
  };

  test("Pasting chords moves the cursor past them, so pasting again continues in order", async ({ page }) => {
    await copyTwoChords(page);
    await clickCell(page, 1, 4, 0);
    await page.keyboard.press("Control+v");
    await expect.poll(() => getCursorPosition(page)).toEqual({ line: 1, chord: 6, string: 0 });
    await page.keyboard.press("Control+v");
    await expect.poll(() => firstStaff(page)).toBe("12..1212");
    expect(await getCursorPosition(page)).toEqual({ line: 1, chord: 8, string: 0 });
  });

  test("Pasting chords over a chord selection replaces it", async ({ page }) => {
    await copyTwoChords(page);
    // select chords 4-6 and paste over them
    await clickCell(page, 1, 4, 0);
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Control+v");
    await expect.poll(() => firstStaff(page)).toBe("12..12..");
    const staffLength = await page.locator(`[data-cell][data-line="1"][data-string="0"]`).count();
    expect(staffLength).toBe(31);
    expect(await getCursorPosition(page)).toEqual({ line: 1, chord: 6, string: 0 });
  });

  test("Pasting a cell advances to the next chord", async ({ page }) => {
    await page.keyboard.press("4");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    await expect.poll(() => firstStaff(page)).toBe("4.......");
    expect(await getCursorPosition(page)).toEqual({ line: 1, chord: 1, string: 0 });
    await page.keyboard.press("Control+v");
    await expect.poll(() => firstStaff(page)).toBe("44......");
    expect(await getCursorPosition(page)).toEqual({ line: 1, chord: 2, string: 0 });
  });

  test("Pasting a staff onto a staff puts the cursor back on the original staff", async ({ page }) => {
    // select the whole first staff and copy it
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Control+c");
    await clickCell(page, 3, 5, 2);
    await page.keyboard.press("Control+v");
    // the pasted staff takes entry 3; the original moves down past it and its text
    await expect.poll(() => getCursorPosition(page)).toEqual({ line: 5, chord: 5, string: 2 });
  });
});
