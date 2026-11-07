import { test, expect } from "@playwright/test";
import { resetEditor, createNewTab, getCell, getCellContent, goToFirstStaffLine } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetEditor(page);
  await createNewTab(page);
});

const textLines = (page: import("@playwright/test").Page) => page.locator("[data-text-line]");

test.describe("Insert text lines", () => {
  test("Ctrl+I on a staff line inserts a text line above it", async ({ page }) => {
    await goToFirstStaffLine(page);
    const before = await textLines(page).count();

    await page.keyboard.press("Control+i");

    await expect(textLines(page)).toHaveCount(before + 1);
    // The new text line takes index 1, pushing the staff line down to index 2
    await expect(page.locator('[data-text-line="1"]')).toHaveCount(1);
    await expect(getCell(page, 2, 0, 0)).toBeVisible();
    // The shortcut must not be treated as typing "i" into the staff
    expect(await getCellContent(page, 2, 0, 0)).not.toContain("i");
  });

  test("Ctrl+Shift+I on a staff line inserts a text line below it", async ({ page }) => {
    await goToFirstStaffLine(page);
    const before = await textLines(page).count();

    await page.keyboard.press("Control+Shift+I");

    await expect(textLines(page)).toHaveCount(before + 1);
    // Staff line stays at index 1, new text line directly below it
    await expect(getCell(page, 1, 0, 0)).toBeVisible();
    await expect(page.locator('[data-text-line="2"]')).toHaveCount(1);
  });

  test("Ctrl+I works while the cursor is on a text line", async ({ page }) => {
    await page.locator('[data-text-line="0"]').click();
    await page.waitForTimeout(150);
    const before = await textLines(page).count();

    await page.keyboard.press("Control+i");

    await expect(textLines(page)).toHaveCount(before + 1);
    // Staff line pushed from index 1 to index 2
    await expect(getCell(page, 2, 0, 0)).toBeVisible();
  });
});
