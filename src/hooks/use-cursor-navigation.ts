import { Position, Range, NUM_STRINGS } from "../models/tab";
import { EditorState } from "./use-editor-state";

type SelectionDirection = "rightDown" | "leftUp";

export function useCursorNavigation(state: EditorState) {
  const {
    model,
    selection,
    setSelection,
    initialSelectionPosition,
    setInitialSelectionPosition,
    commitEdit,
  } = state;

  const calculateCursorMove = (from: Position, dline: number, dchord: number, dstring: number) => {
    let newLine = from.line + dline;
    let newString = from.string + dstring;

    if (dstring !== 0) {
      if (newString < 0) {
        if (newLine > 0) {
          newLine--;
          newString = model.lines[newLine][0].length - 1;
        } else {
          newString = 0;
        }
      } else if (newString >= model.lines[from.line][0].length) {
        if (newLine < model.lines.length - 1) {
          newLine++;
          newString = 0;
        } else {
          newString = model.lines[newLine][0].length - 1;
        }
      }
    }

    if (dline !== 0) {
      if (newLine < 0) {
        newLine = 0;
        newString = 0;
      } else if (newLine > model.lines.length - 1) {
        newLine = model.lines.length - 1;
        newString = model.lines[newLine][0].length - 1;
      }
    }
    const newChord = Math.max(0, Math.min(model.lines[newLine].length - 1, from.chord + dchord));

    return new Position(newLine, newChord, newString);
  };

  const updateSelectionWithPosition = (position: Position) => {
    if (position.equals(initialSelectionPosition)) {
      setSelection(new Range(position));
    } else if (position.line === initialSelectionPosition.line) {
      if (position.isChordGreaterThanOrEqualTo(initialSelectionPosition)) {
        setSelection(
          new Range(
            new Position(initialSelectionPosition.line, initialSelectionPosition.chord, 0),
            new Position(position.line, position.chord, NUM_STRINGS - 1)
          )
        );
      } else {
        setSelection(
          new Range(
            new Position(position.line, position.chord, 0),
            new Position(initialSelectionPosition.line, initialSelectionPosition.chord, NUM_STRINGS - 1)
          )
        );
      }
    } else {
      if (position.line > initialSelectionPosition.line) {
        setSelection(
          new Range(
            new Position(initialSelectionPosition.line, 0, 0),
            new Position(position.line, model.lines[position.line].length - 1, NUM_STRINGS)
          )
        );
      } else {
        setSelection(
          new Range(
            new Position(position.line, 0, 0),
            new Position(
              initialSelectionPosition.line,
              model.lines[initialSelectionPosition.line].length - 1,
              NUM_STRINGS
            )
          )
        );
      }
    }
  };

  const updateSelectionWithMove = (dline: number, dchord: number, dstring: number) => {
    if (selection.isSinglePosition() && model.isStaffLine(selection.start.line)) {
      setSelection(
        new Range(
          new Position(selection.start.line, selection.start.chord, 0),
          new Position(selection.start.line, selection.start.chord, NUM_STRINGS - 1)
        )
      );
      return;
    } else if (
      selection.start.line === selection.end.line &&
      selection.end.chord - selection.start.chord < model.lines[selection.start.line].length - 1
    ) {
      if (dline !== 0 || dstring !== 0) {
        setSelection(
          new Range(
            new Position(selection.start.line, 0, 0),
            new Position(selection.start.line, model.lines[selection.start.line].length - 1, NUM_STRINGS - 1)
          )
        );
        return;
      }
    }

    let selectionDirection: SelectionDirection;
    if (selection.start.line < initialSelectionPosition.line) {
      selectionDirection = "leftUp";
    } else if (selection.end.line > initialSelectionPosition.line) {
      selectionDirection = "rightDown";
    } else {
      selectionDirection = selection.start.chord < initialSelectionPosition.chord ? "leftUp" : "rightDown";
    }
    const effectivedline = dstring ? dstring : dline;
    let newPosition = calculateCursorMove(
      selectionDirection === "leftUp" ? selection.start : selection.end,
      effectivedline,
      dchord,
      0
    );
    updateSelectionWithPosition(newPosition);
  };

  const moveCursor = (dline: number, dchord: number, dstring: number, shift: boolean = false) => {
    commitEdit();
    if (shift) {
      updateSelectionWithMove(dline, dchord, dstring);
    } else {
      const newPosition = calculateCursorMove(selection.start, dline, dchord, dstring);
      setSelection(new Range(newPosition));
      setInitialSelectionPosition(newPosition);
    }
  };

  return {
    moveCursor,
    updateSelectionWithPosition,
  };
}
