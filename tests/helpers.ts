import { Page, Locator, expect } from "@playwright/test";

/**
 * Click the editor div to focus it and wait for focus to register.
 * The app has a 100ms setTimeout on focus, so we wait a bit extra.
 */
export async function focusEditor(page: Page): Promise<void> {
  const editor = page.locator(".font-mono[tabindex='0']");
  await editor.click();
  // App has 100ms setTimeout in handleFocus
  await page.waitForTimeout(150);
}

/** Get the editor container element. */
export function getEditor(page: Page): Locator {
  return page.locator(".font-mono[tabindex='0']");
}

/** Get a specific cell by line, chord, and string indices. */
export function getCell(page: Page, line: number, chord: number, string: number): Locator {
  return page.locator(`[data-line="${line}"][data-chord="${chord}"][data-string="${string}"][data-cell]`);
}

/** Read the text content of a specific cell. */
export async function getCellContent(page: Page, line: number, chord: number, string: number): Promise<string> {
  const cell = getCell(page, line, chord, string);
  const text = await cell.textContent();
  return text?.trim() ?? "";
}

/** Get all cells that currently have the cursor/selection highlight class. */
export async function getHighlightedCells(page: Page): Promise<{ line: number; chord: number; string: number }[]> {
  const cells = page.locator("[data-cell].bg-ide-cursor");
  const count = await cells.count();
  const result: { line: number; chord: number; string: number }[] = [];
  for (let i = 0; i < count; i++) {
    const cell = cells.nth(i);
    const line = parseInt((await cell.getAttribute("data-line")) ?? "0");
    const chord = parseInt((await cell.getAttribute("data-chord")) ?? "0");
    const string = parseInt((await cell.getAttribute("data-string")) ?? "0");
    result.push({ line, chord, string });
  }
  return result;
}

/**
 * Get the cursor position (the single highlighted cell, or the start of selection).
 * Returns the position of the first highlighted cell.
 */
export async function getCursorPosition(page: Page): Promise<{ line: number; chord: number; string: number }> {
  const cells = await getHighlightedCells(page);
  expect(cells.length).toBeGreaterThan(0);
  return cells[0];
}

/**
 * Ensure a fresh editor state by clearing localStorage and reloading.
 */
export async function resetEditor(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
}

/**
 * Click the "New" button to create a new tab, then focus the editor.
 * Returns after the editor is focused and ready for input.
 */
export async function createNewTab(page: Page): Promise<void> {
  // Click the "Create New Tab" button in the sidebar
  await page.getByText("Create New Tab").click();
  await focusEditor(page);
}

/**
 * Click on a specific cell to position the cursor there.
 */
export async function clickCell(page: Page, line: number, chord: number, string: number): Promise<void> {
  const cell = getCell(page, line, chord, string);
  await cell.click();
  await page.waitForTimeout(150);
}

/**
 * Navigate cursor to the first staff line (line index 1 in default layout).
 * Default tab starts with a text line at index 0, staff line at index 1.
 */
export async function goToFirstStaffLine(page: Page): Promise<void> {
  // Click on line 1, chord 0, string 0 (first staff line)
  await clickCell(page, 1, 0, 0);
}
