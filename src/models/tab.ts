import { TabData, Chord, TabLines } from "@/services/tab-store";

export const STRING_NAMES = ["e", "B", "G", "D", "A", "E"];
export const NUM_STRINGS = STRING_NAMES.length;
export const INITIAL_NUM_COLUMNS = 32;
export const EMPTY_NOTE = "-";
export const BAR_DELIMITER = "|";
const BAR_LINE = Array.from({ length: NUM_STRINGS }, () => BAR_DELIMITER);

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

  isChordLessThan(position: Position): boolean {
    return !this.isGreaterThanOrEqualTo(position);
  }

  isChordGreaterThanOrEqualTo(position: Position): boolean {
    return this.equals(position) || this.isChordGreaterThan(position);
  }

  isChordLessThanOrEqualTo(position: Position): boolean {
    return this.equals(position) || !this.isChordGreaterThan(position);
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

export class Range {
  start: Position;
  end: Position;

  constructor();
  // single position constructor
  constructor(start: Position);
  constructor(start: Position, end: Position);
  constructor(start?: Position, end?: Position) {
    this.start = start ?? new Position();
    this.end = end ?? this.start;
  }

  isSinglePosition(): boolean {
    return this.start.equals(this.end);
  }

  contains(position: Position) {
    return position.isGreaterThanOrEqualTo(this.start) && position.isLessThanOrEqualTo(this.end);
  }
}

export const defaultChord = () => Array.from({ length: NUM_STRINGS }, () => "");
export const defaultTabLine = () => Array.from({ length: INITIAL_NUM_COLUMNS }, () => defaultChord());
export const defaultTabLines = (): TabLines => [defaultTabLine()];

const normalizeChord = (chord: Chord) => {
  return chord
  // remove any trailing -
  // return chord.map(str => str.replace(/-+$/, ""));
  // this won't work, we need to reimplement the write buffer and then we could re-enable this
  // otherwise it just immediately throws it out
};

export class TabModel {
  id: string;
  lines: TabLines;

  constructor(data: TabData) {
    this.id = data?.id ?? crypto.randomUUID();
    this.lines = data?.lines ?? [defaultTabLine()];
  }

  getStringValue(position: Position): string {
    return this.lines[position.line]?.[position.chord]?.[position.string] ?? "";
  }

  getChordValue(position: Position): Chord {
    return this.lines[position.line][position.chord];
  }

  setStringValue(position: Position, value: string): void {
    let chord = this.lines[position.line][position.chord];
    chord[position.string] = value;

    this.setChordValue(position, chord);
  }

  setChordValue(position: Position, value: Chord): void {
    value = normalizeChord(value);
    this.lines[position.line][position.chord] = value;
  }

  insertBarLine(position: Position): void {
    // copied to skip normalization, bar line is special
    this.lines[position.line].splice(position.chord + 1, 0, BAR_LINE);
  }

  deleteChord(position: Position): void {
    if (this.lines[position.line].length == 1) {
      return;
    }
    const line = this.lines[position.line];
    line.splice(position.chord, 1);
  }

  insertEmptyLine(position: Position): void {
    this.insertLines(position, [defaultTabLine()]);
  }

  insertLines(position: Position, lines: TabLines): void {
    this.lines.splice(position.line + 1, 0, ...lines);
  }

  deleteLine(position: Position): void {
    if (this.lines.length == 1) {
      return;
    }
    this.lines.splice(position.line, 1);
  }

  insertChord(position: Position, value: Chord = defaultChord()): void {
    this.insertChords(position, [value]);
  }

  insertChords(position: Position, values: Chord[]): void {
    const normalized = values.map(v => normalizeChord(v));
    this.lines[position.line].splice(position.chord + 1, 0, ...normalized);
  }

  getContent(range: Range): TabLines {
    const linesInRange = this.lines.filter((_, lineIndex) => lineIndex >= range.start.line && lineIndex <= range.end.line);
    if (linesInRange.length !== 1) {
      // bit of a shortcut, but ranges are enforced to always be one line or all the chords in multiple lines
      return linesInRange
    }

    const chordsInRange = linesInRange[0].filter((_, chordIndex) => chordIndex >= range.start.chord && chordIndex <= range.end.chord);
    if (chordsInRange.length !== 1 || chordsInRange[0].length === NUM_STRINGS) {
      // same idea here
      return [chordsInRange];
    }

    // just selecting one note
    return [[[chordsInRange[0][range.start.string]]]];
  }

  insertContent(selectedRange: Range, lines: TabLines, wholeLines: boolean) {
    // one character is copied
    if (lines.length === 1 && lines[0].length === 1 && lines[0][0].length === 1) {
      this.setStringValue(selectedRange.start, lines[0][0][0]);
    }
    // can't know whether the whole line was selected or just chords just from the data
    else if (lines.length === 1 && !wholeLines) {
      this.insertChords(selectedRange.start, lines[0]);
    }
    else {
      this.insertLines(selectedRange.start, lines);
    }
  }

  clone(): TabModel {
    // TODO: consider using structuredClone window api instead
    // TODO: consider marking lines as dirty and only making new copies of those since 
    return new TabModel(this.toData());
  }

  toData(): TabData {
    return { id: this.id, lines: [...this.lines] };
  }
}
