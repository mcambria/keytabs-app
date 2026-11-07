import type { Chord, StaffEntry, TabData, TabEntry } from "@/services/tab-store";

export const DEFAULT_TUNING = ["e", "B", "G", "D", "A", "E"];
export const NUM_STRINGS = DEFAULT_TUNING.length;
export const INITIAL_NUM_COLUMNS = 32;
export const EMPTY_NOTE = "-";
export const BAR_DELIMITER = "|";
export const TAB_DATA_VERSION = 2 as const;
const BAR_LINE = Array.from({ length: NUM_STRINGS }, () => BAR_DELIMITER);

/**
 * Addresses a cell in the tab.
 *
 * - On a staff entry: `line` is the entry index, `chord` the chord index and
 *   `string` the guitar string.
 * - On a text entry: `line` is the entry index, `chord` is a character offset
 *   into the text (0..text.length, i.e. between characters) and `string` is 0.
 */
export class Position {
  line: number;
  chord: number;
  string: number;

  constructor();
  constructor(line: number, chord: number, string: number);
  constructor(line?: number, chord?: number, string?: number) {
    this.line = line ?? 0;
    this.chord = chord ?? 0;
    this.string = string ?? 0;
  }

  equals(position: Position): boolean {
    return this.line == position.line && this.chord == position.chord && this.string == position.string;
  }

  isChordGreaterThan(position: Position): boolean {
    if (this.line != position.line) {
      return this.line > position.line;
    }
    return this.chord > position.chord;
  }

  isChordGreaterThanOrEqualTo(position: Position): boolean {
    return this.equals(position) || this.isChordGreaterThan(position);
  }

  isGreaterThan(position: Position): boolean {
    if (this.line != position.line) {
      return this.line > position.line;
    }
    if (this.chord != position.chord) {
      return this.chord > position.chord;
    }
    return this.string > position.string;
  }

  isGreaterThanOrEqualTo(position: Position): boolean {
    return this.equals(position) || this.isGreaterThan(position);
  }

  isLessThanOrEqualTo(position: Position): boolean {
    return this.equals(position) || !this.isGreaterThan(position);
  }
}

/**
 * A selection. Ranges are either:
 * - within a single staff entry: chords start..end inclusive
 * - within a single text entry: character offsets [start, end) (end exclusive,
 *   like a textarea selection)
 * - across entries: always whole entries
 */
export class Range {
  start: Position;
  end: Position;

  constructor();
  constructor(start: Position);
  constructor(start: Position, end: Position);
  constructor(start?: Position, end?: Position) {
    this.start = start ?? new Position();
    this.end = end ?? this.start;
  }

  isSinglePosition(): boolean {
    return this.start.equals(this.end);
  }

  isSingleLine(): boolean {
    return this.start.line === this.end.line;
  }

  contains(position: Position) {
    return position.isGreaterThanOrEqualTo(this.start) && position.isLessThanOrEqualTo(this.end);
  }
}

// ---- Text helpers --------------------------------------------------------

/** Row and column of a character offset within multi-line text. */
export const rowColFromOffset = (text: string, offset: number): { row: number; col: number } => {
  const before = text.slice(0, Math.max(0, offset));
  const lastNewline = before.lastIndexOf("\n");
  let row = 0;
  for (const c of before) if (c === "\n") row++;
  return { row, col: before.length - (lastNewline + 1) };
};

/** Start (inclusive) and end (exclusive, at the "\n" or text end) offsets of a row. */
export const rowBounds = (text: string, row: number): { start: number; end: number } => {
  let start = 0;
  for (let r = 0; r < row; r++) {
    const nl = text.indexOf("\n", start);
    if (nl === -1) break;
    start = nl + 1;
  }
  const nl = text.indexOf("\n", start);
  return { start, end: nl === -1 ? text.length : nl };
};

export const rowCount = (text: string): number => text.split("\n").length;

/** Offset of (row, col), clamping both to the text's bounds. */
export const offsetFromRowCol = (text: string, row: number, col: number): number => {
  const clampedRow = Math.max(0, Math.min(rowCount(text) - 1, row));
  const { start, end } = rowBounds(text, clampedRow);
  return start + Math.max(0, Math.min(end - start, col));
};

// ---- Clipboard -----------------------------------------------------------

type NativeClipboard<T> = { isNative: true; version: typeof TAB_DATA_VERSION } & T;
export type ClipboardPayload =
  | NativeClipboard<{ kind: "cell"; value: string }>
  | NativeClipboard<{ kind: "chords"; chords: Chord[] }>
  | NativeClipboard<{ kind: "text"; text: string }>
  | NativeClipboard<{ kind: "entries"; entries: TabEntry[] }>;

export const isClipboardPayload = (value: unknown): value is ClipboardPayload => {
  const v = value as Partial<ClipboardPayload> | null;
  return !!v && v.isNative === true && v.version === TAB_DATA_VERSION && typeof v.kind === "string";
};

const clipboard = <T,>(payload: T) => ({ isNative: true as const, version: TAB_DATA_VERSION, ...payload });

// ---- Defaults ------------------------------------------------------------

export const defaultChord = (): Chord => Array.from({ length: NUM_STRINGS }, () => "");
export const defaultStaff = (): StaffEntry => Array.from({ length: INITIAL_NUM_COLUMNS }, () => defaultChord());

export const defaultTabEntries = (): TabEntry[] =>
  normalizeEntries(["[Verse]", defaultStaff(), defaultStaff(), "[Chorus]", defaultStaff(), defaultStaff()]);

const cloneEntry = (entry: TabEntry): TabEntry =>
  typeof entry === "string" ? entry : entry.map((chord) => [...chord]);

/**
 * Enforce the entry invariant: text and staff entries strictly alternate,
 * starting and ending with text. Adjacent text entries are merged with "\n"
 * (an empty side is dropped rather than adding a blank row), and empty text
 * entries are inserted between adjacent staffs.
 */
export function normalizeEntries(entries: TabEntry[]): TabEntry[] {
  const out: TabEntry[] = [];
  for (const entry of entries) {
    const prev = out[out.length - 1];
    if (typeof entry === "string") {
      if (typeof prev === "string") {
        out[out.length - 1] = prev === "" ? entry : entry === "" ? prev : `${prev}\n${entry}`;
      } else {
        out.push(entry);
      }
    } else {
      if (prev === undefined || typeof prev !== "string") {
        out.push("");
      }
      out.push(entry.length > 0 ? entry : [defaultChord()]);
    }
  }
  if (out.length === 0 || typeof out[out.length - 1] !== "string") {
    out.push("");
  }
  return out;
}

/**
 * Convert the v1 storage format, where every line was a string[][][] and text
 * lines stored one character per single-element "chord", into entries.
 */
export function migrateLegacyLines(lines: string[][][]): TabEntry[] {
  const entries: TabEntry[] = lines.map((line) => {
    if (line?.[0]?.length === NUM_STRINGS) {
      return line.map((chord) => [...chord]);
    }
    return (line ?? []).map((cell) => cell?.[0] ?? "").join("").trimEnd();
  });
  // merge consecutive text lines with "\n" (normalizeEntries would drop empty
  // lines here, but blank lines inside a v1 text run are intentional)
  const merged: TabEntry[] = [];
  for (const entry of entries) {
    const prev = merged[merged.length - 1];
    if (typeof entry === "string" && typeof prev === "string") {
      merged[merged.length - 1] = `${prev}\n${entry}`;
    } else {
      merged.push(entry);
    }
  }
  return normalizeEntries(merged);
}

/** v1 format: every line is string[][][], text lines hold one character per cell. */
export type LegacyTabData = {
  id: string;
  lines: string[][][];
};

/**
 * Parse a stored tab, migrating the v1 format if needed. Returns null when the
 * stored value can't be understood.
 */
export const deserializeTab = (id: string, raw: string): { tab: TabData; migrated: boolean } | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<TabData> & Partial<LegacyTabData>;
    if (parsed.version === TAB_DATA_VERSION && Array.isArray(parsed.entries)) {
      return { tab: { id, version: TAB_DATA_VERSION, entries: normalizeEntries(parsed.entries) }, migrated: false };
    }
    if (parsed.version === undefined && Array.isArray(parsed.lines)) {
      return { tab: { id, version: TAB_DATA_VERSION, entries: migrateLegacyLines(parsed.lines) }, migrated: true };
    }
  } catch (e) {
    console.error(`Failed to parse tab ${id}`, e);
  }
  return null;
};

// ---- Model ---------------------------------------------------------------

export class TabModel {
  id: string;
  entries: TabEntry[];

  constructor(data: Partial<TabData> | null) {
    this.id = data?.id ?? crypto.randomUUID();
    this.entries = normalizeEntries(data?.entries ?? []);
  }

  isText(line: number): boolean {
    return typeof this.entries[line] === "string";
  }

  isStaff(line: number): boolean {
    return Array.isArray(this.entries[line]);
  }

  getText(line: number): string {
    const entry = this.entries[line];
    return typeof entry === "string" ? entry : "";
  }

  getStaff(line: number): StaffEntry {
    const entry = this.entries[line];
    return Array.isArray(entry) ? entry : [];
  }

  /**
   * Number of addressable positions in an entry: chords for a staff,
   * text.length + 1 cursor positions for text.
   */
  entryLength(line: number): number {
    const entry = this.entries[line];
    if (entry === undefined) return 0;
    return typeof entry === "string" ? entry.length + 1 : entry.length;
  }

  /** Whether a range is a selection inside a single text entry. */
  isTextRange(range: Range): boolean {
    return range.isSingleLine() && this.isText(range.start.line);
  }

  /**
   * Whether a range covers whole entries: it spans several entries, or all the
   * chords of one staff.
   */
  isWholeEntryRange(range: Range): boolean {
    if (!range.isSingleLine()) return true;
    if (!this.isStaff(range.start.line) || range.isSinglePosition()) return false;
    return range.start.chord === 0 && range.end.chord >= this.entryLength(range.start.line) - 1;
  }

  /** Range containment that respects end-exclusive text selections. */
  rangeContains(range: Range, position: Position): boolean {
    if (this.isTextRange(range)) {
      return (
        position.line === range.start.line &&
        position.chord >= range.start.chord &&
        position.chord < range.end.chord
      );
    }
    return range.contains(position);
  }

  // ---- staff operations ----

  getStringValue(position: Position): string {
    const entry = this.entries[position.line];
    if (typeof entry === "string") return entry[position.chord] ?? "";
    return entry?.[position.chord]?.[position.string] ?? "";
  }

  /**
   * Whether the chord at a position is a bar line. Bar lines span the whole
   * chord; any "|" cell counts so a bar left partly broken by older versions
   * is still treated (and deleted) as one.
   */
  isBarLine(position: Position): boolean {
    const chord = this.getStaff(position.line)[position.chord];
    return !!chord && chord.some((value) => value === BAR_DELIMITER);
  }

  /** Set one cell of a staff. Cells of a bar line can't be changed individually. */
  setStringValue(position: Position, value: string): void {
    const chord = this.getStaff(position.line)[position.chord];
    if (!chord || this.isBarLine(position)) return;
    chord[position.string] = value;
  }

  insertBarLine(position: Position): void {
    if (!this.isStaff(position.line)) return;
    this.getStaff(position.line).splice(position.chord + 1, 0, [...BAR_LINE]);
  }

  deleteChord(position: Position): void {
    const staff = this.getStaff(position.line);
    if (staff.length <= 1) return;
    staff.splice(position.chord, 1);
  }

  insertChordAfter(position: Position, value: Chord = defaultChord()): void {
    if (!this.isStaff(position.line)) return;
    this.getStaff(position.line).splice(position.chord + 1, 0, value);
  }

  insertChords(position: Position, values: Chord[]): void {
    if (!this.isStaff(position.line)) return;
    this.getStaff(position.line).splice(position.chord, 0, ...values.map((c) => [...c]));
  }

  /**
   * Insert a new staff below the cursor. On text, the block is split after the
   * current row so the staff appears directly below it.
   */
  insertStaffBelow(position: Position): void {
    if (this.isText(position.line)) {
      const text = this.getText(position.line);
      const { end } = rowBounds(text, rowColFromOffset(text, position.chord).row);
      const before = text.slice(0, end);
      const after = text.slice(end + 1);
      this.entries.splice(position.line, 1, before, defaultStaff(), after);
    } else {
      this.entries.splice(position.line + 1, 0, defaultStaff());
    }
    this.normalize();
  }

  /** Delete a whole entry (used for staffs). Returns where the cursor should go. */
  deleteEntry(position: Position): Position {
    return this.deleteEntries(position.line, position.line);
  }

  /**
   * Delete entries first..last (inclusive). Text left on either side merges.
   * Returns where the cursor should go: the end of the text before the
   * deleted entries, or the start of the text after them.
   */
  deleteEntries(first: number, last: number): Position {
    const prevLine = first - 1;
    const prevIsText = this.isText(prevLine);
    const prevText = this.getText(prevLine);
    this.entries.splice(first, last - first + 1);
    this.normalize();
    if (prevLine < 0) return new Position(0, 0, 0);
    // by the entry invariant, a staff is always followed by text
    const line = Math.min(prevIsText ? prevLine : prevLine + 1, this.entries.length - 1);
    return new Position(line, prevIsText ? prevText.length : 0, 0);
  }

  /** Remove the chords of a single-staff range. Returns where the cursor should go. */
  deleteChords(range: Range): Position {
    const staff = this.getStaff(range.start.line);
    const start = Math.min(range.start.chord, range.end.chord);
    const end = Math.max(range.start.chord, range.end.chord);
    if (start === 0 && end >= staff.length - 1) {
      return this.deleteEntries(range.start.line, range.start.line);
    }
    staff.splice(start, end - start + 1);
    return new Position(range.start.line, Math.min(start, staff.length - 1), 0);
  }

  // ---- text operations ----

  setText(line: number, text: string): void {
    if (!this.isText(line)) return;
    this.entries[line] = text;
  }

  /** Insert text at a position and return the position after it. */
  insertText(position: Position, value: string): Position {
    const text = this.getText(position.line);
    const offset = Math.min(position.chord, text.length);
    this.setText(position.line, text.slice(0, offset) + value + text.slice(offset));
    return new Position(position.line, offset + value.length, 0);
  }

  deleteTextRange(line: number, from: number, to: number): void {
    const text = this.getText(line);
    const start = Math.max(0, Math.min(from, to));
    const end = Math.min(text.length, Math.max(from, to));
    this.setText(line, text.slice(0, start) + text.slice(end));
  }

  /** Delete the row containing the position. Returns the new cursor position. */
  deleteTextRow(position: Position): Position {
    const rows = this.getText(position.line).split("\n");
    const { row } = rowColFromOffset(this.getText(position.line), position.chord);
    rows.splice(row, 1);
    const text = rows.join("\n");
    this.setText(position.line, text);
    return new Position(position.line, offsetFromRowCol(text, Math.min(row, rowCount(text) - 1), 0), 0);
  }

  // ---- range operations ----

  copy(range: Range): ClipboardPayload {
    if (range.isSingleLine()) {
      const line = range.start.line;
      if (this.isText(line)) {
        return clipboard({ kind: "text" as const, text: this.getText(line).slice(range.start.chord, range.end.chord) });
      }
      if (range.isSinglePosition()) {
        return clipboard({ kind: "cell" as const, value: this.getStringValue(range.start) });
      }
      const staff = this.getStaff(line);
      const chords = staff.slice(range.start.chord, range.end.chord + 1).map((c) => [...c]);
      if (chords.length === staff.length) {
        return clipboard({ kind: "entries" as const, entries: [chords] });
      }
      return clipboard({ kind: "chords" as const, chords });
    }
    return clipboard({
      kind: "entries" as const,
      entries: this.entries.slice(range.start.line, range.end.line + 1).map(cloneEntry),
    });
  }

  /**
   * Paste clipboard content, behaving like a text field: a selection the
   * content can replace is replaced, and the returned cursor is just after the
   * pasted content. Returns null when the content can't be pasted here.
   */
  paste(range: Range, payload: ClipboardPayload): Position | null {
    const start = range.start;
    const onText = this.isText(start.line);
    switch (payload.kind) {
      case "text":
        return onText ? this.replaceTextSelection(range, payload.text) : null;

      case "cell": {
        if (onText) return this.replaceTextSelection(range, payload.value);
        if (this.isBarLine(start)) return null;
        // cells overwrite (the grid keeps its timing), then advance like typing
        this.setStringValue(start, payload.value);
        return new Position(start.line, Math.min(start.chord + 1, this.entryLength(start.line) - 1), start.string);
      }

      case "chords": {
        if (onText) return null;
        const staff = this.getStaff(start.line);
        if (range.isSingleLine() && !range.isSinglePosition()) {
          staff.splice(start.chord, range.end.chord - start.chord + 1);
        }
        this.insertChords(start, payload.chords);
        const after = Math.min(start.chord + payload.chords.length, staff.length - 1);
        return new Position(start.line, after, start.string);
      }

      case "entries": {
        let at = start;
        if (this.isTextRange(range) && !range.isSinglePosition()) {
          this.deleteTextRange(start.line, start.chord, range.end.chord);
        } else if (!range.isSinglePosition() && this.isWholeEntryRange(range)) {
          at = this.deleteEntries(start.line, range.end.line);
        }
        return this.insertEntriesAt(at, payload.entries);
      }
    }
  }

  /** Replace a text selection (or insert at a cursor) with text. */
  replaceTextSelection(range: Range, value: string): Position {
    if (!this.isTextRange(range)) {
      return this.insertText(range.start, value);
    }
    this.deleteTextRange(range.start.line, range.start.chord, range.end.chord);
    return this.insertText(range.start, value);
  }

  /**
   * Insert whole entries at a position and return the position just after
   * them (on the content the cursor was on, which they push down).
   *
   * - On a staff, they go before it.
   * - On text, the block is split at the cursor. Splitting at the start or end
   *   of a row doesn't leave an extra blank row, and pasting onto an empty row
   *   replaces it.
   */
  insertEntriesAt(position: Position, entries: TabEntry[]): Position {
    const copies = entries.map(cloneEntry);
    if (copies.length === 0) return position;

    if (!this.isText(position.line)) {
      const staff = this.entries[position.line];
      this.entries.splice(position.line, 0, ...copies);
      this.normalize();
      return new Position(this.entries.indexOf(staff), position.chord, position.string);
    }

    const text = this.getText(position.line);
    const offset = Math.min(position.chord, text.length);
    let before = text.slice(0, offset);
    let after = text.slice(offset);
    if (before.endsWith("\n")) before = before.slice(0, -1);
    if (after.startsWith("\n")) after = after.slice(1);

    // the entries before and after this text are staffs, so only `before`
    // and `after` can merge with the pasted entries
    const head = normalizeEntries([before, ...copies]);
    const last = head[head.length - 1] as string;
    const merged = last === "" ? after : after === "" ? last : `${last}\n${after}`;
    const cursorOffset = last === "" ? 0 : after === "" ? last.length : last.length + 1;
    this.entries.splice(position.line, 1, ...head.slice(0, -1), merged);
    this.normalize();
    return new Position(position.line + head.length - 1, cursorOffset, 0);
  }

  clearContent(range: Range): void {
    if (this.isTextRange(range)) {
      const { line, chord } = range.start;
      if (range.isSinglePosition()) {
        this.deleteTextRange(line, chord, chord + 1);
      } else {
        this.deleteTextRange(line, chord, range.end.chord);
      }
      return;
    }

    for (let line = range.start.line; line <= range.end.line; line++) {
      if (this.isText(line)) {
        this.setText(line, "");
        continue;
      }
      const staff = this.getStaff(line);
      if (range.isSinglePosition()) {
        this.setStringValue(range.start, "");
        continue;
      }
      const startChord = line === range.start.line ? range.start.chord : 0;
      const endChord = line === range.end.line ? Math.min(range.end.chord, staff.length - 1) : staff.length - 1;
      for (let chord = startChord; chord <= endChord; chord++) {
        staff[chord] = defaultChord();
      }
    }
  }

  // ---- whole model ----

  normalize(): void {
    this.entries = normalizeEntries(this.entries);
  }

  clone(): TabModel {
    return new TabModel(this.toData());
  }

  /**
   * Render the tab as plain text that lines up in a monospace font, mirroring
   * the column layout used by the editor's staff lines.
   */
  toPlainText(tuning: string[] = DEFAULT_TUNING): string {
    const nameWidth = Math.max(0, ...tuning.map((name) => name.length));
    const out: string[] = [];

    for (const entry of this.entries) {
      if (typeof entry === "string") {
        out.push(...entry.split("\n").map((row) => row.trimEnd()));
        continue;
      }

      const rows = Array.from(
        { length: NUM_STRINGS },
        (_, stringIndex) => (tuning[stringIndex] ?? "").padEnd(nameWidth, " ") + BAR_DELIMITER
      );
      for (const chord of entry) {
        const maxChordLength = Math.max(...chord.map((str) => str.length));
        chord.forEach((stringValue, stringIndex) => {
          const padding =
            stringValue === BAR_DELIMITER
              ? ""
              : "".padEnd(maxChordLength === 0 ? 2 : maxChordLength - stringValue.length + 1, EMPTY_NOTE);
          rows[stringIndex] += stringValue + padding;
        });
      }
      out.push(...rows.map((row) => row + BAR_DELIMITER));
    }

    return out.join("\n").replace(/\s+$/, "") + "\n";
  }

  toData(): TabData {
    return { id: this.id, version: TAB_DATA_VERSION, entries: this.entries.map(cloneEntry) };
  }
}
