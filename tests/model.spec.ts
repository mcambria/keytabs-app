import { test, expect } from "@playwright/test";
import {
  TabModel,
  Position,
  Range,
  normalizeEntries,
  migrateLegacyLines,
  rowColFromOffset,
  offsetFromRowCol,
  rowBounds,
  defaultChord,
} from "../src/models/tab";
import { deserializeTab } from "../src/models/tab";

// Model-level tests: no browser page needed.

const staff = (...values: string[]) => values.map((v) => [v, "", "", "", "", ""]);

test.describe("text helpers", () => {
  const text = "ab\n\ncde";

  test("rowColFromOffset", () => {
    expect(rowColFromOffset(text, 0)).toEqual({ row: 0, col: 0 });
    expect(rowColFromOffset(text, 2)).toEqual({ row: 0, col: 2 });
    expect(rowColFromOffset(text, 3)).toEqual({ row: 1, col: 0 });
    expect(rowColFromOffset(text, 4)).toEqual({ row: 2, col: 0 });
    expect(rowColFromOffset(text, 7)).toEqual({ row: 2, col: 3 });
  });

  test("offsetFromRowCol clamps column and row", () => {
    expect(offsetFromRowCol(text, 1, 5)).toBe(3);
    expect(offsetFromRowCol(text, 2, 1)).toBe(5);
    expect(offsetFromRowCol(text, 9, 9)).toBe(7);
  });

  test("rowBounds", () => {
    expect(rowBounds(text, 0)).toEqual({ start: 0, end: 2 });
    expect(rowBounds(text, 1)).toEqual({ start: 3, end: 3 });
    expect(rowBounds(text, 2)).toEqual({ start: 4, end: 7 });
  });
});

test.describe("normalizeEntries", () => {
  test("alternates text and staff, starting and ending with text", () => {
    const s = staff("1");
    expect(normalizeEntries([s, s])).toEqual(["", s, "", s, ""]);
    expect(normalizeEntries([])).toEqual([""]);
  });

  test("merges adjacent text entries, dropping empty sides", () => {
    expect(normalizeEntries(["a", "b"])).toEqual(["a\nb"]);
    expect(normalizeEntries(["a", ""])).toEqual(["a"]);
    expect(normalizeEntries(["", "b"])).toEqual(["b"]);
  });
});

test.describe("v1 migration", () => {
  // v1 default tab layout, including its quirks: "[Verse]" has no trailing
  // [""] cell and "[Chorus]" has a multi-character cell.
  const v1Staff = () => Array.from({ length: 4 }, () => ["", "", "", "", "", ""]);
  const v1Lines: string[][][] = [
    [["["], ["V"], ["e"], ["r"], ["s"], ["e"], ["]"]],
    v1Staff(),
    [[""]],
    v1Staff(),
    [["["], ["C"], ["h"], ["o"], ["r"], ["u"], ["s"], ["]  "]],
    [["l"], ["a"], [""]],
    [[""]],
    [["l"], ["b"], [""]],
    v1Staff(),
    [[""]],
  ];

  test("converts text lines to text entries", () => {
    expect(migrateLegacyLines(v1Lines)).toEqual([
      "[Verse]",
      v1Staff(),
      "",
      v1Staff(),
      "[Chorus]\nla\n\nlb",
      v1Staff(),
      "",
    ]);
  });

  test("deserializeTab migrates v1 and reads v2", () => {
    const v1 = deserializeTab("x", JSON.stringify({ id: "x", lines: v1Lines }));
    expect(v1?.migrated).toBe(true);
    expect(v1?.tab.version).toBe(2);

    const v2 = deserializeTab("x", JSON.stringify(v1!.tab));
    expect(v2?.migrated).toBe(false);
    expect(v2?.tab.entries).toEqual(v1?.tab.entries);

    expect(deserializeTab("x", "not json")).toBeNull();
    expect(deserializeTab("x", JSON.stringify({ something: "else" }))).toBeNull();
  });
});

test.describe("TabModel editing", () => {
  const model = () => new TabModel({ id: "t", entries: ["one\ntwo", staff("1", "2", "3"), "three"] });

  test("deleteTextRow removes the current row", () => {
    const m = model();
    expect(m.deleteTextRow(new Position(0, 1, 0))).toEqual(new Position(0, 0, 0));
    expect(m.getText(0)).toBe("two");
  });

  test("deleting a staff merges the surrounding text", () => {
    const m = model();
    m.deleteEntry(new Position(1, 0, 0));
    expect(m.entries).toEqual(["one\ntwo\nthree"]);
  });

  test("insertStaffBelow on text splits the block after the current row", () => {
    const m = model();
    m.insertStaffBelow(new Position(0, 1, 0));
    expect(m.entries[0]).toBe("one");
    expect(m.isStaff(1)).toBe(true);
    expect(m.entries[2]).toBe("two");
  });

  test("text ranges are end-exclusive", () => {
    const m = model();
    const range = new Range(new Position(0, 1, 0), new Position(0, 3, 0));
    expect(m.rangeContains(range, new Position(0, 1, 0))).toBe(true);
    expect(m.rangeContains(range, new Position(0, 2, 0))).toBe(true);
    expect(m.rangeContains(range, new Position(0, 3, 0))).toBe(false);
  });

  test("clearContent on a text range deletes across rows", () => {
    const m = model();
    m.clearContent(new Range(new Position(0, 2, 0), new Position(0, 5, 0)));
    expect(m.getText(0)).toBe("onwo");
  });

  test("copy and paste text", () => {
    const m = model();
    const payload = m.copy(new Range(new Position(0, 4, 0), new Position(0, 7, 0)));
    expect(payload).toMatchObject({ kind: "text", text: "two" });
    expect(m.paste(new Range(new Position(2, 5, 0)), payload)).toEqual(new Position(2, 8, 0));
    expect(m.getText(2)).toBe("threetwo");
  });

  test("copy and paste whole entries into the middle of a block", () => {
    const m = model();
    const payload = m.copy(new Range(new Position(1, 0, 0), new Position(2, 5, 6)));
    expect(payload).toMatchObject({ kind: "entries" });
    // paste at the start of "two"
    m.paste(new Range(new Position(0, 4, 0)), payload);
    expect(m.entries).toEqual(["one", staff("1", "2", "3"), "three\ntwo", staff("1", "2", "3"), "three"]);
  });

  test("copy of a partial staff gives chords", () => {
    const m = model();
    const payload = m.copy(new Range(new Position(1, 0, 0), new Position(1, 1, 5)));
    expect(payload).toMatchObject({ kind: "chords", chords: staff("1", "2") });
    m.paste(new Range(new Position(1, 3, 0)), payload);
    expect(m.getStaff(1)).toEqual(staff("1", "2", "3", "1", "2"));
    expect(m.getStaff(1)[3]).not.toBe(m.getStaff(1)[0]);
  });

  test("toPlainText renders text rows and staffs", () => {
    const m = new TabModel({ id: "t", entries: ["Intro  \nline", [defaultChord(), ["3", "", "", "", "", ""]]] });
    expect(m.toPlainText()).toBe(
      ["Intro", "line", "e|--3-|", "B|----|", "G|----|", "D|----|", "A|----|", "E|----|"].join("\n") + "\n"
    );
  });
});
