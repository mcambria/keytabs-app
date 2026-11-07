import { Position, Range, NUM_STRINGS, rowColFromOffset, rowCount, offsetFromRowCol } from "../models/tab";
import { EditorState } from "./use-editor-state";

type Edge = "top" | "bottom";

export function useCursorNavigation(state: EditorState) {
  const { model, selection, setSelection, initialSelectionPosition, setInitialSelectionPosition, commitEdit } = state;

  /** Position when entering `line` from above ("top") or below ("bottom") at a given column. */
  const enterEntry = (line: number, column: number, edge: Edge, string?: number): Position => {
    if (model.isText(line)) {
      const text = model.getText(line);
      const row = edge === "top" ? 0 : rowCount(text) - 1;
      return new Position(line, offsetFromRowCol(text, row, column), 0);
    }
    const chord = Math.max(0, Math.min(model.entryLength(line) - 1, column));
    return new Position(line, chord, string ?? (edge === "top" ? 0 : NUM_STRINGS - 1));
  };

  /** Column of a position: the chord on a staff, the column in the row on text. */
  const columnOf = (position: Position): number =>
    model.isText(position.line) ? rowColFromOffset(model.getText(position.line), position.chord).col : position.chord;

  const calculateCursorMove = (from: Position, dline: number, dchord: number, dstring: number): Position => {
    const lastLine = model.entries.length - 1;

    // up/down by string (staff) or row (text), moving between entries at the edges
    if (dstring !== 0) {
      const direction = Math.sign(dstring);
      if (model.isText(from.line)) {
        const text = model.getText(from.line);
        const { row, col } = rowColFromOffset(text, from.chord);
        const newRow = row + direction;
        if (newRow >= 0 && newRow < rowCount(text)) {
          return new Position(from.line, offsetFromRowCol(text, newRow, col), 0);
        }
        const target = from.line + direction;
        if (target < 0 || target > lastLine) return from;
        return enterEntry(target, col, direction > 0 ? "top" : "bottom");
      }

      const newString = from.string + direction;
      if (newString >= 0 && newString < NUM_STRINGS) {
        return new Position(from.line, from.chord, newString);
      }
      const target = from.line + direction;
      if (target < 0 || target > lastLine) return from;
      return enterEntry(target, from.chord, direction > 0 ? "top" : "bottom");
    }

    // whole entries
    if (dline !== 0) {
      const target = Math.max(0, Math.min(lastLine, from.line + dline));
      if (target === from.line) return from;
      return enterEntry(
        target,
        columnOf(from),
        dline > 0 ? "top" : "bottom",
        model.isStaff(from.line) ? from.string : undefined
      );
    }

    // left/right by chord (staff) or character (text)
    const chord = Math.max(0, Math.min(model.entryLength(from.line) - 1, from.chord + dchord));
    return new Position(from.line, chord, model.isText(from.line) ? 0 : from.string);
  };

  /** Extend the selection from the anchor (initialSelectionPosition) to a position. */
  const updateSelectionWithPosition = (position: Position) => {
    const anchor = initialSelectionPosition;
    if (position.equals(anchor)) {
      setSelection(new Range(position));
      return;
    }

    if (position.line === anchor.line) {
      if (model.isText(position.line)) {
        // character range, end exclusive
        const [start, end] = [anchor.chord, position.chord].sort((a, b) => a - b);
        setSelection(new Range(new Position(position.line, start, 0), new Position(position.line, end, 0)));
        return;
      }
      // chord range, inclusive, all strings
      const [start, end] = position.isChordGreaterThanOrEqualTo(anchor) ? [anchor, position] : [position, anchor];
      setSelection(
        new Range(new Position(start.line, start.chord, 0), new Position(end.line, end.chord, NUM_STRINGS - 1))
      );
      return;
    }

    // across entries: always whole entries
    const [first, last] = position.line > anchor.line ? [anchor.line, position.line] : [position.line, anchor.line];
    setSelection(
      new Range(new Position(first, 0, 0), new Position(last, model.entryLength(last) - 1, NUM_STRINGS))
    );
  };

  const updateSelectionWithMove = (dline: number, dchord: number, dstring: number) => {
    const line = selection.start.line;

    // first shift+move from a staff cursor selects that whole chord
    if (selection.isSinglePosition() && model.isStaff(line)) {
      setSelection(
        new Range(new Position(line, selection.start.chord, 0), new Position(line, selection.start.chord, NUM_STRINGS - 1))
      );
      return;
    }

    // a vertical move from a partial staff selection first selects the whole staff
    if (
      model.isStaff(line) &&
      selection.isSingleLine() &&
      selection.end.chord - selection.start.chord < model.entryLength(line) - 1 &&
      (dline !== 0 || dstring !== 0)
    ) {
      setSelection(
        new Range(new Position(line, 0, 0), new Position(line, model.entryLength(line) - 1, NUM_STRINGS - 1))
      );
      return;
    }

    // the anchor must be one end of the selection; reset it if it isn't
    let anchor = initialSelectionPosition;
    const anchorIsStart = anchor.line === selection.start.line && anchor.chord === selection.start.chord;
    const anchorIsEnd = anchor.line === selection.end.line && anchor.chord === selection.end.chord;
    if (selection.isSingleLine() && !anchorIsStart && !anchorIsEnd) {
      anchor = selection.start;
      setInitialSelectionPosition(anchor);
    }

    // the moving end ("focus") is whichever end isn't the anchor
    let focus: Position;
    if (!selection.isSingleLine()) {
      focus = selection.start.line < anchor.line ? selection.start : selection.end;
    } else if (model.isText(line)) {
      focus = anchor.chord === selection.start.chord ? selection.end : selection.start;
    } else {
      focus = selection.start.chord < anchor.chord ? selection.start : selection.end;
    }

    const vertical = dstring !== 0 ? dstring : dline;
    let newPosition: Position;
    if (model.isText(focus.line) && selection.isSingleLine()) {
      // text selections move by character/row like the textarea would
      newPosition = calculateCursorMove(focus, 0, dchord, vertical);
    } else {
      newPosition = calculateCursorMove(focus, vertical, dchord, 0);
    }

    if (newPosition.line === anchor.line) {
      updateSelectionWithPosition(newPosition);
    } else {
      // leaving the anchor's entry snaps to whole entries
      const [first, last] = newPosition.line > anchor.line ? [anchor.line, newPosition.line] : [newPosition.line, anchor.line];
      setSelection(
        new Range(new Position(first, 0, 0), new Position(last, model.entryLength(last) - 1, NUM_STRINGS))
      );
    }
  };

  const setCursor = (position: Position) => {
    setSelection(new Range(position));
    setInitialSelectionPosition(position);
  };

  const moveCursor = (dline: number, dchord: number, dstring: number, shift: boolean = false) => {
    commitEdit();
    if (shift) {
      updateSelectionWithMove(dline, dchord, dstring);
    } else {
      setCursor(calculateCursorMove(selection.start, dline, dchord, dstring));
    }
  };

  return {
    moveCursor,
    setCursor,
    updateSelectionWithPosition,
  };
}
