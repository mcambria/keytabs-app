import React, { useEffect, useState } from "react";
import { Position, Range, EMPTY_NOTE, STRING_NAMES, NUM_STRINGS, BAR_DELIMITER, TabModel } from "../models/tab";
import { TabLines, useTabStore } from "@/services/tab-store";
import { newTabButton } from "./new-tab-button";

type SelectionDirection = "rightDown" | "leftUp";
type ClipboardData = { isNative: true; lines: TabLines; wholeLines: boolean };

const TabEditor: React.FC = () => {
  let { currentTab, currentTabMetadata, setCurrentTab, saveCurrentTab, deleteCurrentTab, updateTabMetadata } =
    useTabStore();

  // this empty tab model will never be used
  // but React doesn't like it when you short-circuit creating a different amount of hooks each render
  const [model, setModel] = useState(new TabModel(currentTab ?? { id: "", lines: [] }));
  useEffect(() => setModel(new TabModel(currentTab ?? { id: "", lines: [] })), [currentTab]);

  const updateTabLines = () => {
    // this saving model is very aggressive
    // TODO: implement an on-switch and timer based auto-saving model, potentially version control would be cool
    saveCurrentTab(model.lines);
    setModel(model.clone());
  };

  // editor state
  const [selection, setSelection] = useState(new Range());
  const [initialSelectionPosition, setInitialSelectionPosition] = useState(selection.start);
  const [currentSelectionDirection, setCurrentSelectionDirection] = useState("rightDown" as SelectionDirection);
  const [isEditing, setIsEditing] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  // event handlers
  const handleFocus = () => {
    // wait 100ms to try to let the mouse handlers go first and avoid flashing old position when clicking back in
    setTimeout(() => setHasFocus(true), 100);
  };

  const handleBlur = () => {
    setHasFocus(false);
  };

  const positionFromTarget = (target: HTMLElement): Position | null => {
    const cell = target.closest("[data-cell]");
    if (!cell) {
      return null;
    }

    const lineIndex = parseInt(cell.getAttribute("data-line") || "0");
    const chordIndex = parseInt(cell.getAttribute("data-chord") || "0");
    const stringIndex = parseInt(cell.getAttribute("data-string") || "0");
    return new Position(lineIndex, chordIndex, stringIndex);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    commitEdit();
    const clickedPosition = positionFromTarget(e.target as HTMLElement);
    if (!clickedPosition) {
      return;
    }
    if (e.shiftKey) {
      updateSelection(clickedPosition);
    } else {
      setSelection(new Range(clickedPosition));
      setInitialSelectionPosition(clickedPosition);
      setIsSelecting(true);
    }
  };

  const handleMouseOver = (e: React.MouseEvent) => {
    if (!isSelecting) {
      return;
    }
    const clickedPosition = positionFromTarget(e.target as HTMLElement);
    if (!clickedPosition) {
      return;
    }
    updateSelection(clickedPosition);
  };

  const updateSelection = (position: Position) => {
    // if we are on the same cell, just select that cell
    if (position.equals(initialSelectionPosition)) {
      setSelection(new Range(position));
    }
    // if we are on the same line, select chords within that line
    else if (position.line === initialSelectionPosition.line) {
      // selecting left to right
      if (position.isChordGreaterThanOrEqualTo(initialSelectionPosition)) {
        setSelection(
          new Range(
            new Position(initialSelectionPosition.line, initialSelectionPosition.chord, 0),
            new Position(position.line, position.chord, NUM_STRINGS - 1)
          )
        );
      }
      // selecting right to left
      else {
        setSelection(
          new Range(
            new Position(position.line, position.chord, 0),
            new Position(initialSelectionPosition.line, initialSelectionPosition.chord, NUM_STRINGS - 1)
          )
        );
      }
    }
    // we are selecting entire lines
    else {
      // selecting top to bottom
      if (position.line > initialSelectionPosition.line) {
        setSelection(
          new Range(
            new Position(initialSelectionPosition.line, 0, 0),
            new Position(position.line, model.lines[position.line].length - 1, NUM_STRINGS)
          )
        );
      }
      // bottom to top
      else {
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

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const calculateCursorMove = (from: Position, dline: number, dchord: number, dstring: number) => {
    let newLine = from.line + dline;
    let newString = from.string + dstring;

    // Handle string movement that would cross line boundaries
    if (dstring !== 0) {
      if (newString < 0) {
        // Moving up past the first string
        if (newLine > 0) {
          newLine--;
          newString = NUM_STRINGS - 1;
        } else {
          newString = 0;
        }
      } else if (newString >= NUM_STRINGS) {
        // Moving down past the last string
        if (newLine < model.lines.length - 1) {
          newLine++;
          newString = 0;
        } else {
          newString = NUM_STRINGS - 1;
        }
      }
    }

    // Handle line movement that would reach the edge
    if (dline !== 0) {
      if (newLine < 0) {
        newLine = 0;
        newString = 0;
      } else if (newLine > model.lines.length - 1) {
        newLine = model.lines.length - 1;
        newString = NUM_STRINGS - 1;
      }
    }
    // don't wrap, just prevent it from moving past the edge
    const newChord = Math.max(0, Math.min(model.lines[newLine].length - 1, from.chord + dchord));

    return new Position(newLine, newChord, newString);
  };

  const moveCursor = (dline: number, dchord: number, dstring: number, shift: boolean = false) => {
    commitEdit();

    const prev = selection;

    if (shift) {
      // if we are starting from regular cursor, special handling to just select the chord
      if (prev.isSinglePosition()) {
        const initialPosition = new Position(prev.start.line, prev.start.chord, 0);
        setSelection(new Range(initialPosition, new Position(prev.start.line, prev.start.chord, NUM_STRINGS - 1)));
        setInitialSelectionPosition(initialPosition);
        setCurrentSelectionDirection(dline < 0 || dchord < 0 || dstring < 0 ? "leftUp" : "rightDown");
      } else {
        let newPosition = calculateCursorMove(
          currentSelectionDirection === "leftUp" ? prev.start : prev.end,
          dline,
          dchord,
          dstring
        );
        // check for flipping directions
        if (currentSelectionDirection === "leftUp" && newPosition.isChordGreaterThan(initialSelectionPosition)) {
          setCurrentSelectionDirection("rightDown");
        } else if (currentSelectionDirection === "rightDown" && newPosition.isChordLessThan(initialSelectionPosition)) {
          setCurrentSelectionDirection("leftUp");
        }
        updateSelection(newPosition);
      }
    }
    // simple cursor position update
    else {
      setSelection(new Range(calculateCursorMove(prev.start, dline, dchord, dstring)));
    }
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const commitEdit = () => {
    setIsEditing(false);
  };

  const handleInputKey = (e: React.KeyboardEvent) => {
    // if they start inputting, revert to inputting into start position
    setSelection(new Range(selection.start));

    const key = e.key;
    if (key == "|") {
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
    updateTabLines();

    startEditing();
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
          // move down 1 line
          moveCursor(1, 0, 0, e.shiftKey);
        } else {
          moveCursor(0, 0, 1, e.shiftKey);
        }
        break;
      case "ArrowUp":
        if (e.ctrlKey) {
          // move up 1 line
          moveCursor(-1, 0, 0, e.shiftKey);
        } else {
          moveCursor(0, 0, -1, e.shiftKey);
        }
        break;
      case "Enter":
        if (e.ctrlKey) {
          // Create a new line
          model.insertEmptyLine(selection.start);
          updateTabLines();
        } else if (e.shiftKey) {
          model.insertChord(selection.start);
          updateTabLines();
        } else {
          if (isEditing) {
            moveCursor(0, 0, 0);
            commitEdit();
          } else {
            startEditing();
          }
        }
        break;
      case "Backspace":
        if (isEditing) {
          const newValue = currentValue.slice(0, -1) || EMPTY_NOTE;
          model.setStringValue(selection.start, newValue);
          updateTabLines();
        } else {
          if (currentValue == BAR_DELIMITER || e.shiftKey) {
            model.deleteChord(selection.start);
          } else {
            model.setStringValue(selection.start, EMPTY_NOTE);
          }
          updateTabLines();
          moveCursor(0, -1, 0);
        }
        break;
      case "Delete":
        if (isEditing) {
          const newValue = currentValue.slice(0, -1) || EMPTY_NOTE;
          model.setStringValue(selection.start, newValue);
          updateTabLines();
        } else {
          if (currentValue == BAR_DELIMITER || e.shiftKey) {
            model.deleteChord(selection.start);
          } else if (e.ctrlKey) {
            model.deleteLine(selection.start);
            moveCursor(0, 0, 0);
          } else {
            model.setStringValue(selection.start, EMPTY_NOTE);
          }
          model.setStringValue(selection.start, EMPTY_NOTE);
          updateTabLines();
        }
        break;
      case "Escape":
        commitEdit();
        break;

      case "c":
        if (e.ctrlKey) {
          handleCopySelection(e);
        }
        break;
      case "v":
        if (e.ctrlKey) {
          handlePasteSelection(e);
        }
        break;
    }
  };

  const handleCopySelection = (e: React.KeyboardEvent) => {
    if (!hasFocus) {
      return;
    }
    const selectedContent = model.getContent(selection);
    const clipboardData: ClipboardData = {
      isNative: true,
      lines: selectedContent,
      wholeLines: selectedContent.length > 1 || selectedContent[0].length === model.lines[selection.start.line].length,
    };
    navigator.clipboard.writeText(JSON.stringify(clipboardData));
  };

  const handlePasteSelection = async (e: React.KeyboardEvent) => {
    if (!hasFocus) {
      return;
    }
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
      // TODO: could totally add support for converting copied string into TabLines and insert it,
      // will really only work for characters or lines though
    } catch (e) {
      console.log(`Tried to paste non-native content: ${text}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle navigation keys
    if (
      ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Enter", "Backspace", "Delete", "Escape", "c", "v"].includes(
        e.key
      )
    ) {
      handleNavigationKey(e);
      return;
    }

    // Handle input keys (numbers and special characters)
    if (/^[0-9]$/.test(e.key) || ["|", "h", "p", "/", "-", "(", ")", "<", ">"].includes(e.key)) {
      e.preventDefault();
      handleInputKey(e);
    }
  };

  if (!currentTab) {
    return <div>{newTabButton(setCurrentTab)}</div>;
  }

  return (
    <div>
      <div className="flex justify-between gap-4 ml-4 mr-4 mb-4">
        <input
          type="text"
          value={currentTabMetadata?.song ?? ""}
          onChange={(e) => {
            updateTabMetadata(currentTab.id, { song: e.target.value });
          }}
          placeholder="Song"
          className="bg-transparent border-none outline-none text-ide-text placeholder-ide-text-muted"
        />
        <input
          type="text"
          value={currentTabMetadata?.artist ?? ""}
          onChange={(e) => {
            updateTabMetadata(currentTab.id, { artist: e.target.value });
          }}
          placeholder="Artist"
          className="bg-transparent border-none outline-none text-ide-text placeholder-ide-text-muted text-right"
        />
      </div>
      <div
        className="outline-none inline-block font-mono text-ide-text select-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseDown={handleMouseDown}
        onMouseOver={handleMouseOver}
        onMouseUp={handleMouseUp}
      >
        {model.lines.map((tabLine, lineIndex) => (
          <div key={`${lineIndex}`} className="flex mb-4">
            <div className="flex-col flex-wrap">
              {STRING_NAMES.map((stringName, stringIndex) => (
                // -2 relative to start of the actual tab
                <div key={`${lineIndex}--2-${stringIndex}`} className="flex text-right text-ide-text-muted select-none">
                  {stringName}
                </div>
              ))}
            </div>
            <div className="flex-col">
              {STRING_NAMES.map((_, stringIndex) => (
                // -1 relative to start of the actual tab
                <div key={`${lineIndex}-1-${stringIndex}`} className="flex text-center">
                  |
                </div>
              ))}
            </div>
            {tabLine.map((chord, chordIndex) => (
              <div key={`${lineIndex}-${chordIndex}`} className="flex-col">
                {chord.map((stringValue, stringIndex) => (
                  <div
                    key={`${lineIndex}-${chordIndex}-${stringIndex}`}
                    data-line={lineIndex}
                    data-chord={chordIndex}
                    data-string={stringIndex}
                    data-cell
                    className={`flex text-center flex-nowrap ${
                      selection.contains(new Position(lineIndex, chordIndex, stringIndex)) && hasFocus && !isEditing
                        ? "bg-pink-600"
                        : ""
                    }`}
                  >
                    <span className="relative">
                      {stringValue}
                      {isEditing &&
                        // can only be in editing mode if the selection is just one long
                        selection.start.equals(new Position(lineIndex, chordIndex, stringIndex)) &&
                        hasFocus && (
                          <span
                            className={`absolute top-0 w-[2px] h-5 bg-pink-600 animate-blink ${
                              stringValue === EMPTY_NOTE ? "left-0" : ""
                            }`}
                          />
                        )}
                      {stringValue === BAR_DELIMITER ? "" : EMPTY_NOTE}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <div className="flex-col">
              {STRING_NAMES.map((_, stringIndex) => (
                // +1 relative to length of the actual tab
                <div key={`${lineIndex}-${tabLine.length}-${stringIndex}`} className="flex text-center">
                  |
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-4 ml-4 mr-4">
        {/* <button onClick={() => saveCurrentTab(model.lines)}>Save Tab</button> */}
        <button onClick={() => alert("Not implemented yet 🦎")}>Export Tab</button>
        <button onClick={() => deleteCurrentTab()}>Delete Tab</button>
      </div>
    </div>
  );
};

export default TabEditor;
