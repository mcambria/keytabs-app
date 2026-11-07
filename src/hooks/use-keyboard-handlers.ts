import React from "react";
import {
  Position,
  Range,
  NUM_STRINGS,
  isClipboardPayload,
  rowBounds,
  rowColFromOffset,
} from "../models/tab";
import { EditorState } from "./use-editor-state";

export function useKeyboardHandlers(
  state: EditorState,
  moveCursor: (dline: number, dchord: number, dstring: number, shift?: boolean) => void,
  setCursor: (position: Position) => void,
  selectTo: (position: Position) => void
) {
  const { model, updateEntries, undo, redo, selection, setSelection, isEditing, startEditing, commitEdit } = state;
  const cursor = selection.start;

  const handleInputKey = (e: React.KeyboardEvent) => {
    const key = e.key;

    if (model.isText(cursor.line)) {
      setCursor(model.replaceTextSelection(selection, key));
      updateEntries(`text:${cursor.line}`);
      return;
    }

    setSelection(new Range(cursor));
    if (key === " ") {
      return;
    }
    if (key === "|") {
      model.insertBarLine(cursor);
      moveCursor(0, 2, 0);
      updateEntries();
      return;
    }

    // bar lines span the whole chord and can't be typed over
    if (model.isBarLine(cursor)) {
      return;
    }

    const currentValue = isEditing ? model.getStringValue(cursor) : "";
    model.setStringValue(cursor, currentValue + key);
    startEditing();
    updateEntries(`cell:${cursor.line}:${cursor.chord}:${cursor.string}`);
  };

  /** Backspace / Delete. */
  const removeContent = (backspace: boolean, shift: boolean, control: boolean) => {
    // a range: text is deleted, whole entries are deleted, a partial staff
    // range is cleared (keeping later bars in place) unless Shift/Ctrl is held
    if (!selection.isSinglePosition()) {
      commitEdit();
      if (model.isTextRange(selection)) {
        model.clearContent(selection);
        setCursor(selection.start);
      } else if (control || model.isWholeEntryRange(selection)) {
        setCursor(model.deleteEntries(selection.start.line, selection.end.line));
      } else if (shift) {
        setCursor(model.deleteChords(selection));
      } else {
        model.clearContent(selection);
        setCursor(new Position(selection.start.line, selection.start.chord, 0));
      }
      updateEntries();
      return;
    }

    if (model.isText(cursor.line)) {
      if (control) {
        setCursor(model.deleteTextRow(cursor));
      } else if (backspace) {
        if (cursor.chord > 0) {
          model.deleteTextRange(cursor.line, cursor.chord - 1, cursor.chord);
          setCursor(new Position(cursor.line, cursor.chord - 1, 0));
        }
      } else {
        model.deleteTextRange(cursor.line, cursor.chord, cursor.chord + 1);
      }
      updateEntries();
      return;
    }

    // staff
    if (isEditing) {
      model.setStringValue(cursor, model.getStringValue(cursor).slice(0, -1));
      updateEntries();
      return;
    }

    if (control) {
      setCursor(model.deleteEntry(cursor));
    } else if (model.isBarLine(cursor) || shift) {
      model.deleteChord(cursor);
      moveCursor(0, backspace ? -1 : 0, 0);
    } else if (backspace && cursor.chord > 0 && model.isBarLine(new Position(cursor.line, cursor.chord - 1, 0))) {
      // backspace acts on the chord before the cursor: a bar there goes as a whole
      model.deleteChord(new Position(cursor.line, cursor.chord - 1, 0));
      moveCursor(0, -1, 0);
    } else if (backspace) {
      if (cursor.chord > 0) {
        model.setStringValue(new Position(cursor.line, cursor.chord - 1, cursor.string), "");
      }
      moveCursor(0, -1, 0);
    } else {
      model.setStringValue(cursor, "");
    }
    updateEntries();
  };

  const handleNavigationKey = (e: React.KeyboardEvent) => {
    e.preventDefault();
    switch (e.key) {
      case "ArrowRight":
        moveCursor(0, e.ctrlKey ? 8 : 1, 0, e.shiftKey);
        break;
      case "ArrowLeft":
        moveCursor(0, e.ctrlKey ? -8 : -1, 0, e.shiftKey);
        break;
      case "ArrowDown":
        if (e.ctrlKey) {
          moveCursor(1, 0, 0, e.shiftKey);
        } else {
          moveCursor(0, 0, 1, e.shiftKey);
        }
        break;
      case "ArrowUp":
        if (e.ctrlKey) {
          moveCursor(-1, 0, 0, e.shiftKey);
        } else {
          moveCursor(0, 0, -1, e.shiftKey);
        }
        break;
      case "Enter":
        if (e.ctrlKey) {
          model.insertStaffBelow(cursor);
          updateEntries();
        } else if (e.shiftKey) {
          model.insertChordAfter(cursor);
          updateEntries();
        } else if (model.isText(cursor.line)) {
          setCursor(model.replaceTextSelection(selection, "\n"));
          updateEntries();
        } else if (isEditing) {
          moveCursor(0, 0, 0);
          commitEdit();
        } else {
          startEditing();
        }
        break;
      case "Backspace":
        removeContent(true, e.shiftKey, e.ctrlKey);
        break;
      case "Delete":
        removeContent(false, e.shiftKey, e.ctrlKey);
        break;
      case "Escape":
        commitEdit();
        setSelection(new Range(cursor));
        break;
      case "Home":
      case "End": {
        const line = selection.end.line;
        let target: Position;
        if (model.isText(line)) {
          const text = model.getText(line);
          const { start, end } = rowBounds(text, rowColFromOffset(text, selection.end.chord).row);
          target = new Position(line, e.key === "Home" ? start : end, 0);
        } else {
          const chord = e.key === "Home" ? 0 : model.entryLength(line) - 1;
          target = new Position(line, chord, cursor.string);
        }
        if (e.shiftKey) {
          selectTo(target);
        } else {
          setCursor(target);
        }
        break;
      }
    }
  };

  const handleCopySelection = (_?: React.KeyboardEvent) => {
    const payload = model.copy(selection);
    if (payload.kind === "text") {
      // plain text so it pastes naturally anywhere
      if (payload.text !== "") {
        navigator.clipboard.writeText(payload.text);
      }
      return;
    }
    navigator.clipboard.writeText(JSON.stringify(payload));
  };

  const handlePasteSelection = async (_?: React.KeyboardEvent) => {
    const text = await navigator.clipboard.readText();
    if (!text) {
      return;
    }

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // not ours
    }

    let newCursor: Position | null = null;
    if (isClipboardPayload(parsed)) {
      newCursor = model.paste(selection, parsed);
    } else if (model.isText(cursor.line)) {
      newCursor = model.replaceTextSelection(selection, text.replace(/\r\n?/g, "\n"));
    } else {
      console.log(`Tried to paste non-native content: ${text}`);
      return;
    }
    if (newCursor) {
      setCursor(newCursor);
    }
    updateEntries();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Enter", "Backspace", "Delete", "Escape", "Home", "End"].includes(
        e.key
      )
    ) {
      handleNavigationKey(e);
      return;
    }

    if (e.ctrlKey && (e.key === "c" || e.key === "v")) {
      e.preventDefault();
      if (e.key === "c") {
        handleCopySelection(e);
      } else {
        handlePasteSelection(e);
      }
      return;
    }

    if ((e.ctrlKey && e.key === "a") || e.key === "A") {
      const last = model.entries.length - 1;
      setSelection(new Range(new Position(0, 0, 0), new Position(last, model.entryLength(last) - 1, NUM_STRINGS)));
      e.preventDefault();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && ["z", "y"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      if (e.key.toLowerCase() === "y" || e.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }

    // unhandled Ctrl/Cmd combos must not be typed as characters
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    if (/^[0-9a-z/\\\-()<>~\^\[\]| ]$/i.test(e.key)) {
      e.preventDefault();
      handleInputKey(e);
    }
  };

  return {
    handleKeyDown,
    handleCopySelection,
    handlePasteSelection,
  };
}
