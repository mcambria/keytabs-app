import React from "react";
import { Position, Range, NUM_STRINGS, BAR_DELIMITER } from "../models/tab";
import { TabLines } from "@/services/tab-store";
import { EditorState } from "./use-editor-state";

type ClipboardData = { isNative: true; lines: TabLines; wholeLines: boolean };

export function useKeyboardHandlers(
  state: EditorState,
  moveCursor: (dline: number, dchord: number, dstring: number, shift?: boolean) => void
) {
  const {
    model,
    updateTabLines,
    selection,
    setSelection,
    isEditing,
    startEditing,
    commitEdit,
  } = state;

  const handleInputKey = (e: React.KeyboardEvent) => {
    setSelection(new Range(selection.start));
    const key = e.key;

    if (model.isStaffLine(selection.start.line)) {
      if (key === " ") {
        return;
      }
      if (key === "|") {
        model.insertBarLine(selection.start);
        moveCursor(0, 2, 0);
        updateTabLines();
        return;
      }

      let currentValue = "";
      if (isEditing) {
        currentValue = model.getStringValue(selection.start);
      }

      const newValue = currentValue + key;
      model.setStringValue(selection.start, newValue);
      startEditing();
    } else {
      model.insertTextValue(selection.start, key);
      moveCursor(0, 1, 0);
    }
    updateTabLines();
  };

  const removeContent = (currentValue: string, backspace: boolean, shift: boolean, control: boolean) => {
    if (isEditing) {
      const newValue = currentValue.slice(0, -1);
      model.setStringValue(selection.start, newValue);
    } else {
      if (selection.isSinglePosition()) {
        if (model.isStaffLine(selection.start.line)) {
          if (currentValue == BAR_DELIMITER || shift) {
            model.deleteChord(selection.start);
          } else if (control) {
            model.deleteLine(selection.start);
          } else if (backspace) {
            model.setStringValue(
              new Position(selection.start.line, selection.start.chord - 1, selection.start.string),
              ""
            );
          } else {
            model.setStringValue(selection.start, "");
          }
        } else {
          if (control || model.lines[selection.start.line].length === 1) {
            model.deleteTextLine(selection.start);
          } else if (backspace) {
            model.deleteTextValue(
              new Position(selection.start.line, Math.max(0, selection.start.chord - 1), selection.start.string)
            );
          } else {
            model.deleteTextValue(selection.start);
          }
        }
      } else {
        model.clearContent(selection);
      }
    }
    updateTabLines();
  };

  const handleNavigationKey = (e: React.KeyboardEvent) => {
    e.preventDefault();
    const currentValue = model.getStringValue(selection.start);
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
          model.insertEmptyLine(selection.start);
          updateTabLines();
        } else if (e.shiftKey) {
          model.insertChordAfter(selection.start);
          updateTabLines();
        } else {
          if (model.isStaffLine(selection.start.line)) {
            if (isEditing) {
              moveCursor(0, 0, 0);
              commitEdit();
            } else {
              startEditing();
            }
          } else {
            model.insertTextLineBelow(selection.start);
            moveCursor(1, 0, 0);
            updateTabLines();
          }
        }
        break;
      case "Backspace":
        removeContent(currentValue, true, e.shiftKey, e.ctrlKey);
        if (!isEditing) {
          if (model.isStaffLine(selection.start.line)) {
            moveCursor(0, -1, 0);
          } else if (selection.start.chord === 0) {
            moveCursor(-1, 0, 0);
          } else {
            moveCursor(0, -1, 0);
          }
        }
        break;
      case "Delete":
        if (model.isStaffLine(selection.start.line) || model.getStringValue(selection.start) !== "") {
          removeContent(currentValue, false, e.shiftKey, e.ctrlKey);
        }
        if (!isEditing) {
          moveCursor(0, 0, 0);
        }
        break;
      case "Escape":
        commitEdit();
        setSelection(new Range(selection.start));
        break;
      case "Home":
        setSelection(new Range(new Position(selection.start.line, 0, selection.start.string)));
        break;
      case "End":
        setSelection(
          new Range(
            new Position(selection.end.line, model.lines[selection.end.line].length - 1, selection.start.string)
          )
        );
        break;
    }
  };

  const handleCopySelection = (_?: React.KeyboardEvent) => {
    const selectedContent = model.getContent(selection);
    const clipboardData: ClipboardData = {
      isNative: true,
      lines: selectedContent,
      wholeLines: selectedContent.length > 1 || selectedContent[0].length === model.lines[selection.start.line].length,
    };
    navigator.clipboard.writeText(JSON.stringify(clipboardData));
  };

  const handlePasteSelection = async (_?: React.KeyboardEvent) => {
    const text = await navigator.clipboard.readText();
    if (!text) {
      return;
    }
    try {
      const clipboardData = JSON.parse(text);
      if (clipboardData.isNative && clipboardData.lines) {
        model.insertContent(selection, clipboardData.lines, clipboardData.wholeLines);
        updateTabLines();
      }
    } catch (e) {
      console.log(`Tried to paste non-native content: ${text}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      [
        "ArrowRight",
        "ArrowLeft",
        "ArrowUp",
        "ArrowDown",
        "Enter",
        "Backspace",
        "Delete",
        "Escape",
        "Home",
        "End",
      ].includes(e.key)
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
      setSelection(
        new Range(
          new Position(0, 0, 0),
          new Position(model.lines.length - 1, model.lines[model.lines.length - 1].length - 1, NUM_STRINGS - 1)
        )
      );
      e.preventDefault();
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
