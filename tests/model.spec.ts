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

  test("deleteEntries removes a span and merges the text around it", () => {
    const m = new TabModel({ id: "t", entries: ["a", staff("1"), "b", staff("2"), "c"] });
    // staff, text, staff: cursor ends at the end of "a"
    expect(m.deleteEntries(1, 3)).toEqual(new Position(0, 1, 0));
    expect(m.entries).toEqual(["a\nc"]);
  });

  test("deleteEntries starting on text keeps the staff before it", () => {
    const m = new TabModel({ id: "t", entries: ["a", staff("1"), "b", staff("2"), "c"] });
    expect(m.deleteEntries(2, 3)).toEqual(new Position(2, 0, 0));
    expect(m.entries).toEqual(["a", staff("1"), "c"]);
  });

  test("deleteEntries of everything leaves an empty text entry", () => {
    const m = model();
    expect(m.deleteEntries(0, 2)).toEqual(new Position(0, 0, 0));
    expect(m.entries).toEqual([""]);
  });

  test("deleteChords removes a partial range, or the whole staff when all are selected", () => {
    const m = model();
    expect(m.deleteChords(new Range(new Position(1, 0, 0), new Position(1, 1, 5)))).toEqual(new Position(1, 0, 0));
    expect(m.getStaff(1)).toEqual(staff("3"));
    m.deleteChords(new Range(new Position(1, 0, 0), new Position(1, 0, 5)));
    expect(m.entries).toEqual(["one\ntwo\nthree"]);
  });

  test("isWholeEntryRange", () => {
    const m = model();
    const r = (a: Position, b: Position) => m.isWholeEntryRange(new Range(a, b));
    expect(r(new Position(1, 0, 0), new Position(1, 2, 5))).toBe(true);
    expect(r(new Position(1, 0, 0), new Position(1, 1, 5))).toBe(false);
    expect(r(new Position(0, 0, 0), new Position(1, 2, 6))).toBe(true);
    expect(r(new Position(0, 0, 0), new Position(0, 7, 0))).toBe(false);
    expect(r(new Position(1, 0, 0), new Position(1, 0, 0))).toBe(false);
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
    // paste at the start of "two": the cursor stays on "two", after the paste
    expect(m.paste(new Range(new Position(0, 4, 0)), payload)).toEqual(new Position(2, 6, 0));
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

  test.describe("paste leaves the cursor after the pasted content", () => {
    const entries = () => ["one\ntwo", staff("1", "2", "3"), "three"];
    const chords = (...v: string[]) => ({ isNative: true, version: 2, kind: "chords", chords: staff(...v) }) as const;
    const pasteEntries = { isNative: true, version: 2, kind: "entries", entries: [staff("9")] } as const;

    test("chords: cursor stays on the chord it was on, so repeated pastes are in order", () => {
      const m = new TabModel({ id: "t", entries: entries() });
      let cursor = m.paste(new Range(new Position(1, 1, 2)), chords("a", "b"))!;
      expect(cursor).toEqual(new Position(1, 3, 2));
      cursor = m.paste(new Range(cursor), chords("a", "b"))!;
      expect(m.getStaff(1)).toEqual(staff("1", "a", "b", "a", "b", "2", "3"));
      expect(cursor).toEqual(new Position(1, 5, 2));
    });

    test("chords replace a chord selection", () => {
      const m = new TabModel({ id: "t", entries: entries() });
      const cursor = m.paste(new Range(new Position(1, 0, 0), new Position(1, 1, 5)), chords("a"));
      expect(m.getStaff(1)).toEqual(staff("a", "3"));
      expect(cursor).toEqual(new Position(1, 1, 0));
    });

    test("a cell overwrites and advances; not onto a bar", () => {
      const m = new TabModel({ id: "t", entries: ["", [...staff("1", "2"), ["|", "|", "|", "|", "|", "|"]], ""] });
      const cell = { isNative: true, version: 2, kind: "cell", value: "7" } as const;
      expect(m.paste(new Range(new Position(1, 0, 3)), cell)).toEqual(new Position(1, 1, 3));
      expect(m.getStaff(1)[0][3]).toBe("7");
      expect(m.paste(new Range(new Position(1, 2, 3)), cell)).toBeNull();
    });

    test("entries on a staff go before it and the cursor stays on the staff", () => {
      const m = new TabModel({ id: "t", entries: entries() });
      expect(m.paste(new Range(new Position(1, 2, 4)), pasteEntries)).toEqual(new Position(3, 2, 4));
      expect(m.entries).toEqual(["one\ntwo", staff("9"), "", staff("1", "2", "3"), "three"]);
    });

    test("entries mid-row split the row; on an empty row they replace it", () => {
      const m = new TabModel({ id: "t", entries: ["abcd"] });
      expect(m.paste(new Range(new Position(0, 2, 0)), pasteEntries)).toEqual(new Position(2, 0, 0));
      expect(m.entries).toEqual(["ab", staff("9"), "cd"]);

      const e = new TabModel({ id: "t", entries: ["one\n\ntwo"] });
      expect(e.paste(new Range(new Position(0, 4, 0)), pasteEntries)).toEqual(new Position(2, 0, 0));
      expect(e.entries).toEqual(["one", staff("9"), "two"]);
    });

    test("entries replace a whole-entry selection", () => {
      const m = new TabModel({ id: "t", entries: entries() });
      const cursor = m.paste(new Range(new Position(1, 0, 0), new Position(1, 2, 5)), pasteEntries);
      expect(m.entries).toEqual(["one\ntwo", staff("9"), "three"]);
      expect(cursor).toEqual(new Position(2, 0, 0));
    });
  });

  test("toPlainText renders text rows and staffs", () => {
    const m = new TabModel({ id: "t", entries: ["Intro  \nline", [defaultChord(), ["3", "", "", "", "", ""]]] });
    expect(m.toPlainText()).toBe(
      ["Intro", "line", "e|--3-|", "B|----|", "G|----|", "D|----|", "A|----|", "E|----|"].join("\n") + "\n"
    );
  });
});
