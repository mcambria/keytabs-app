import { TabData, Chord, TabLines } from "@/services/use-tab-content";

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

export const defaultChord = () => Array.from({ length: NUM_STRINGS }, () => EMPTY_NOTE);
export const defaultTabLine = () => Array.from({ length: INITIAL_NUM_COLUMNS }, () => defaultChord());
export const defaultTabLines = (): TabLines => [defaultTabLine()];

const normalizeChordLength = (chord: Chord) => {
  // TODO: this is going to have a problem with - in front
  const stripped = chord.map((str) => str.replace(/-/g, ""));

  // Find the maximum number of non-dash characters
  const maxLength = Math.max(Math.max(...stripped.map((str) => str.length)), 1);
  
  // TODO: this is causing the enter button to pad to here
  // need to just pad it in the UI and then on export
  // Pad each string to that length, counting only real characters
  return stripped.map((str) => str.padEnd(maxLength, "-"));
};

export class TabModel {
  id: string;
  lines: TabLines;

  constructor(data: TabData) {
    this.id = data?.id ?? crypto.randomUUID();
    this.lines = data?.lines ?? [defaultTabLine()];
  }

  getStringValue(position: Position): string {
    return this.lines[position.line]?.[position.chord]?.[position.string] ?? EMPTY_NOTE;
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
    value = normalizeChordLength(value);
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

  insertLine(position: Position): void {
    this.lines.splice(position.line + 1, 0, defaultTabLine());
  }

  deleteLine(position: Position): void {
    if (this.lines.length == 1) {
      return;
    }
    this.lines.splice(position.line, 1);
  }

  insertChord(position: Position, value: Chord = defaultChord()): void {
    value = normalizeChordLength(value);
    this.lines[position.line].splice(position.chord + 1, 0, value);
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
