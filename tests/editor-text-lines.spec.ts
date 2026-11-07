import { test, expect, Page } from "@playwright/test";
import {
  resetEditor,
  createNewTab,
  getCell,
  getCursorPosition,
  getHighlightedCells,
  goToFirstStaffLine,
  clickCell,
} from "./helpers";

// Default tab entries: 0 "[Verse]", 1 staff, 2 "", 3 staff, 4 "[Chorus]", 5 staff, 6 "", 7 staff, 8 ""

const rows = (page: Page, entry: number) => page.locator(`[data-text-block="${entry}"] [data-text-row]`);

const storedTab = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem(`tab_${localStorage.getItem("current-tab-id")}`) ?? "null"));

/** Click the end of the given text row. */
const clickRowEnd = async (page: Page, entry: number, row = 0) => {
  const rowEnd = await rows(page, entry).nth(row).getAttribute("data-row-end");
  await clickCell(page, entry, Number(rowEnd), 0);
};

test.describe("Text blocks", () => {
  test.beforeEach(async ({ page }) => {
    await resetEditor(page);
    await createNewTab(page);
  });

  test("Enter splits a block into rows and is stored as one string", async ({ page }) => {
    await clickRowEnd(page, 0);
    await page.keyboard.press("Enter");
    await page.keyboard.type("la la");

    await expect(rows(page, 0)).toHaveCount(2);
    await expect(rows(page, 0).nth(1)).toContainText("la");
    expect((await storedTab(page)).entries[0]).toBe("[Verse]\nla la");
  });

  test("Backspace at the start of a row joins it with the previous row", async ({ page }) => {
    await clickRowEnd(page, 0);
    await page.keyboard.press("Enter");
    await page.keyboard.type("x");
    await page.keyboard.press("Home");
    await page.keyboard.press("Backspace");

    await expect(rows(page, 0)).toHaveCount(1);
    expect((await storedTab(page)).entries[0]).toBe("[Verse]x");
  });

  test("ArrowDown from the last row moves to the staff below", async ({ page }) => {
    await clickCell(page, 0, 2, 0);
    await page.keyboard.press("ArrowDown");
    expect(await getCursorPosition(page)).toEqual({ line: 1, chord: 2, string: 0 });
    // and back up lands on the block's last row
    await page.keyboard.press("ArrowUp");
    expect(await getCursorPosition(page)).toEqual({ line: 0, chord: 2, string: 0 });
  });

  test("Shift+Arrows select characters within a block, across rows", async ({ page }) => {
    await clickRowEnd(page, 0);
    await page.keyboard.press("Enter");
    await page.keyboard.type("abc");
    // cursor at offset 1 of "[Verse]"
    await clickCell(page, 0, 1, 0);
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    let highlighted = await getHighlightedCells(page);
    expect(highlighted.map((c) => c.chord)).toEqual([1, 2]);

    await page.keyboard.press("Shift+ArrowDown");
    highlighted = await getHighlightedCells(page);
    // offsets 1..10 ("Verse]" + "\n" + "abc"), all in the text block
    expect(highlighted.every((c) => c.line === 0)).toBe(true);
    expect(highlighted.map((c) => c.chord)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("Shift+Down past the last row snaps to whole entries", async ({ page }) => {
    await clickCell(page, 0, 2, 0);
    await page.keyboard.press("Shift+ArrowDown");
    const highlighted = await getHighlightedCells(page);
    const lines = new Set(highlighted.map((c) => c.line));
    expect([...lines].sort()).toEqual([0, 1]);
    // the whole text entry and the whole staff (32 chords x 6 strings)
    expect(highlighted.filter((c) => c.line === 0)).toHaveLength("[Verse]".length + 1);
    expect(highlighted.filter((c) => c.line === 1)).toHaveLength(32 * 6);
  });

  test("Typing replaces a selection", async ({ page }) => {
    await clickCell(page, 0, 1, 0);
    await page.keyboard.press("Shift+End");
    await page.keyboard.type("X");
    expect((await storedTab(page)).entries[0]).toBe("[X");
  });

  test("Ctrl+I is ignored rather than typed", async ({ page }) => {
    await goToFirstStaffLine(page);
    await page.keyboard.press("Control+i");
    await expect(getCell(page, 1, 0, 0)).not.toContainText("i");
    expect((await storedTab(page)).entries.slice(0, 3)).toEqual(["[Verse]", expect.anything(), ""]);
  });

  test("Deleting a staff merges the text blocks around it", async ({ page }) => {
    // put some text in the empty block below the first staff
    await clickRowEnd(page, 2);
    await page.keyboard.type("after");
    // Ctrl+Backspace on the staff above deletes it
    await goToFirstStaffLine(page);
    await page.keyboard.press("Control+Backspace");

    await expect(rows(page, 0)).toHaveCount(2);
    expect((await storedTab(page)).entries[0]).toBe("[Verse]\nafter");
  });
});

test.describe("Clipboard in text blocks", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await resetEditor(page);
    await createNewTab(page);
  });

  test("Copy and paste a text selection", async ({ page }) => {
    await clickCell(page, 0, 1, 0);
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Control+c");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Ve");

    await clickRowEnd(page, 4);
    await page.keyboard.press("Control+v");
    await expect.poll(async () => (await storedTab(page)).entries[4]).toBe("[Chorus]Ve");
  });
});

test.describe("Migration from v1 storage", () => {
  test("A v1 tab is converted on load", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      const staff = () => Array.from({ length: 4 }, () => ["", "", "", "", "", ""]);
      const text = (s: string) => [...s.split("").map((c) => [c]), [""]];
      localStorage.setItem(
        "tab_legacy",
        JSON.stringify({ id: "legacy", lines: [text("[Intro]"), staff(), text("line one"), text("line two"), staff(), [[""]]] })
      );
      localStorage.setItem(
        "tab-metadata",
        JSON.stringify([{ id: "legacy", song: "Old", artist: "", tuning: ["e", "B", "G", "D", "A", "E"], lastModified: 0 }])
      );
      localStorage.setItem("current-tab-id", "legacy");
    });
    await page.reload();

    await expect(rows(page, 2)).toHaveCount(2);
    await expect(rows(page, 2).nth(1)).toContainText("line two");
    const stored = await storedTab(page);
    expect(stored.version).toBe(2);
    expect(stored.lines).toBeUndefined();
    expect(stored.entries.filter((e: unknown) => typeof e === "string")).toEqual(["[Intro]", "line one\nline two", ""]);
  });
});
