import { TabData, Chord, TabLines } from "@/services/tab-store";

export const DEFAULT_TUNING = ["e", "B", "G", "D", "A", "E"];
export const NUM_STRINGS = DEFAULT_TUNING.length;
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
export const defaultTextLine = () => Array.from({ length: 1 }, () => Array.from({ length: 1 }, () => ""));
export const verseLabelLine = () => [["["], ["V"], ["e"], ["r"], ["s"], ["e"], ["]"]];
export const chorusLabelLine = () => [["["], ["C"], ["h"], ["o"], ["r"], ["u"], ["s"], ["]  "]];

export const defaultTabLines = (): TabLines => [
  verseLabelLine(),
  defaultTabLine(),
  defaultTabLine(),
  chorusLabelLine(),
  defaultTabLine(),
  defaultTabLine(),
];

export class TabModel {
  id: string;
  lines: TabLines;

  constructor(data: TabData) {
    this.id = data?.id ?? crypto.randomUUID();
    this.lines = data?.lines ?? [defaultTabLine()];
    this.ensureTextLinesBetweenStaffLines();
  }

  isStaffLine(line: number): boolean {
    return this.lines[line][0].length === NUM_STRINGS;
  }

  getStringValue(position: Position): string {
    return this.lines[position.line]?.[position.chord]?.[position.string] ?? "";
  }

  getChordValue(position: Position): Chord {
    return this.lines[position.line][position.chord];
  }

  setStringValue(position: Position, value: string): void {
    this.lines[position.line][position.chord][position.string] = value;
  }

  insertTextValue(position: Position, value: string) {
    this.insertTextValues(position, [value]);
  }

  insertTextValues(position: Position, values: string[]) {
    const asChords = values.map(v => [v])
    this.lines[position.line].splice(position.chord, 0, ...asChords);
  }

  deleteTextValue(position: Position) {
    this.lines[position.line].splice(position.chord, 1);
  }

  deleteTextLine(position: Position) {
    this.lines.splice(position.line, 1);
    this.ensureTextLinesBetweenStaffLines();
  }

  setChordValue(position: Position, value: Chord): void {
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
    this.insertLinesBelow(position, [defaultTabLine()]);
    this.ensureTextLinesBetweenStaffLines();
  }

  insertTextLineAbove(position: Position): Position {
    this.insertLinesAbove(position, [defaultTextLine()]);
    return new Position(position.line, 0, 0);
  }

  insertTextLineBelow(position: Position): Position {
    this.insertLinesBelow(position, [defaultTextLine()]);
    return new Position(position.line + 1, 0, 0);
  }
  insertLinesAbove(position: Position, lines: TabLines): void {
    this.lines.splice(position.line, 0, ...lines);
    this.ensureTextLinesBetweenStaffLines();
  }

  insertLinesBelow(position: Position, lines: TabLines): void {
    this.lines.splice(position.line + 1, 0, ...lines);
    this.ensureTextLinesBetweenStaffLines();
  }

  deleteLine(position: Position): void {
    if (this.lines.length == 1) {
      return;
    }
    this.lines.splice(position.line, 1);
    this.ensureTextLinesBetweenStaffLines();
  }

  insertChordAfter(position: Position, value: Chord = defaultChord()): void {
    this.insertChordsAfter(position, [value]);
  }

  insertChords(position: Position, values: Chord[]): void {
    this.lines[position.line].splice(position.chord, 0, ...values);
  }

  insertChordsAfter(position: Position, values: Chord[]): void {
    this.lines[position.line].splice(position.chord + 1, 0, ...values);
  }

  getContent(range: Range): TabLines {
    if (range.isSinglePosition()) {
      return [[[this.getStringValue(range.start)]]];
    }

    const linesInRange = this.lines.filter((_, lineIndex) => lineIndex >= range.start.line && lineIndex <= range.end.line);
    if (linesInRange.length !== 1) {
      // bit of a shortcut, but ranges are enforced to always be one line or all the chords in multiple lines
      return linesInRange
    }

    const chordsInRange = linesInRange[0].filter((_, chordIndex) => chordIndex >= range.start.chord && chordIndex <= range.end.chord);
    return [chordsInRange];
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
      this.insertLinesAbove(selectedRange.start, lines);
    }
    this.ensureTextLinesBetweenStaffLines();
  }

  clearContent(range: Range) {
    if (range.isSinglePosition()) {
      if (this.isStaffLine(range.start.line)) {
        this.setStringValue(range.start, "");
      } else {
        this.deleteTextValue(range.start);
      }
      return;
    }

    for (let lineIndex = range.start.line; lineIndex <= range.end.line; lineIndex++) {
      if (this.isStaffLine(lineIndex)) {
        const startChord = lineIndex === range.start.line ? range.start.chord : 0;
        const endChord = lineIndex === range.end.line ? range.end.chord : this.lines[lineIndex].length - 1;
        
        for (let chordIndex = startChord; chordIndex <= endChord; chordIndex++) {
          for (let stringIndex = 0; stringIndex < NUM_STRINGS; stringIndex++) {
            this.setStringValue(new Position(lineIndex, chordIndex, stringIndex), "");
          }
        }
      } else {
        const startChord = lineIndex === range.start.line ? range.start.chord : 0;
        const endChord = lineIndex === range.end.line ? range.end.chord : this.lines[lineIndex].length - 1;
        
        for (let chordIndex = endChord; chordIndex >= startChord; chordIndex--) {
          this.deleteTextValue(new Position(lineIndex, chordIndex, 0));
        }
      }
    }
  }

  clone(): TabModel {
    // TODO: consider using structuredClone window api instead
    // TODO: consider marking lines as dirty and only making new copies of those since 
    return new TabModel(this.toData());
  }

  ensureTextLinesBetweenStaffLines(): void {
    let i = 0;
    while (i < this.lines.length) {
      if (this.isStaffLine(i)) {
        // Check if there's a text line after this staff line
        if (i + 1 < this.lines.length && this.isStaffLine(i + 1)) {
          // Two staff lines in a row, insert text line between them
          this.lines.splice(i + 1, 0, defaultTextLine());
        } else if (i + 1 >= this.lines.length) {
          // Staff line at the end, add text line after it
          this.lines.splice(i + 1, 0, defaultTextLine());
        }
        i += 2; // Skip the text line we just ensured exists
      } else {
        i += 1;
      }
    }
    
    // Ensure there's a text line at the beginning if we start with a staff line
    if (this.lines.length > 0 && this.isStaffLine(0)) {
      this.lines.splice(0, 0, defaultTextLine());
    }
  }

  toData(): TabData {
    return { id: this.id, lines: [...this.lines] };
  }
}
