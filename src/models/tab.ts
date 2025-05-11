export const STRING_NAMES = ["e", "B", "G", "D", "A", "E"];
export const NUM_STRINGS = STRING_NAMES.length;
export const INITIAL_NUM_COLUMNS = 32;
export const EMPTY_NOTE = "-";
export const BAR_DELIMITER = "|";
const BAR_LINE = Array.from({ length: NUM_STRINGS }, () => BAR_DELIMITER);

export interface IPosition {
  line: number,
  chord: number,
  string: number
}

export class Position implements IPosition {
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

export type TabLines = string[][][];
export type Chord = string[];

const defaultLine = () => Array.from({ length: INITIAL_NUM_COLUMNS }, () => defaultChord());

const defaultChord = () => Array.from({ length: NUM_STRINGS }, () => EMPTY_NOTE);

const normalizeChordLength = (chord: Chord) => {
  // TODO: this is going to have a problem with - in front
  const stripped = chord.map((str) => str.replace(/-/g, ""));

  // Find the maximum number of non-dash characters
  const maxLength = Math.max(Math.max(...stripped.map((str) => str.length)), 1);

  // Pad each string to that length, counting only real characters
  return stripped.map((str) => str.padEnd(maxLength, "-"));
};

export class TabModel {
  private lines: TabLines;
  private song: string;
  private artist: string;

  constructor() {
    this.lines = [defaultLine()];
    this.song = "";
    this.artist = "";
  }

  getLines(): TabLines {
    return this.lines;
  }

  setLines(lines: TabLines): void {
    this.lines = lines;
  }

  getSong(): string {
    return this.song;
  }

  setSong(song: string): void {
    this.song = song;
  }

  getArtist(): string {
    return this.artist;
  }

  setArtist(artist: string): void {
    this.artist = artist;
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
    this.lines.splice(position.line + 1, 0, defaultLine());
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

  createMutableCopy(): TabLines {
    return this.lines.map((line) => line.map((chord) => [...chord]));
  }
}
