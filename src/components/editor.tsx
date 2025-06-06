import React, { useEffect, useState } from "react";
import { Position, Range, EMPTY_NOTE, DEFAULT_TUNING, NUM_STRINGS, BAR_DELIMITER, TabModel } from "../models/tab";
import { TabLines, useTabStore } from "@/services/tab-store";
import ResizingInput from "./resizing-input";
import { TuningInput } from "./tuning-input";

type SelectionDirection = "rightDown" | "leftUp";
type ClipboardData = { isNative: true; lines: TabLines; wholeLines: boolean };

type TabEditorProps = {
  className?: string;
};

const TabEditor: React.FC<TabEditorProps> = ({ className = "" }) => {
  let { currentTab, currentTabMetadata, saveCurrentTab, deleteCurrentTab, updateTabMetadata } = useTabStore();

  const [model, setModel] = useState(new TabModel(currentTab ?? { id: "", lines: [] }));
  useEffect(() => setModel(new TabModel(currentTab ?? { id: "", lines: [] })), [currentTab]);

  const updateTabLines = () => {
    // this saving model is very aggressive - it might be better to auto-save on a timer or on switching
    saveCurrentTab(model.lines);
    setModel(model.clone());
  };

  // editor state
  const [selection, setSelection] = useState(new Range());
  const [initialSelectionPosition, setInitialSelectionPosition] = useState(selection.start);
  const [isEditing, setIsEditing] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset delete confirmation when tab changes
  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [currentTab]);

  // event handlers
  const handleFocus = () => {
    // wait 100ms to try to let the mouse handlers go first and avoid flashing old position when clicking back in
    setTimeout(() => setHasFocus(true), 100);
  };

  const handleBlur = () => {
    setHasFocus(false);
  };

  const positionFromTarget = (target: HTMLElement): Position | null => {
    const tabCell = target.closest("[data-cell]");
    if (tabCell) {
      const lineIndex = parseInt(tabCell.getAttribute("data-line") || "0");
      const chordIndex = parseInt(tabCell.getAttribute("data-chord") || "0");
      const stringIndex = parseInt(tabCell.getAttribute("data-string") || "0");
      return new Position(lineIndex, chordIndex, stringIndex);
    }

    const textLineParent = target.closest("[data-text-line]");
    if (textLineParent) {
      const lineIndex = parseInt(textLineParent.getAttribute("data-text-line") || "0");
      return new Position(lineIndex, model.lines[lineIndex].length - 1, 0);
    }

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    commitEdit();
    const clickedPosition = positionFromTarget(e.target as HTMLElement);
    if (!clickedPosition) {
      return;
    }
    if (e.shiftKey) {
      updateSelectionWithPosition(clickedPosition);
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
    updateSelectionWithPosition(clickedPosition);
  };

  const updateSelectionWithPosition = (position: Position) => {
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
          newString = model.lines[newLine][0].length - 1;
        } else {
          newString = 0;
        }
      } else if (newString >= model.lines[from.line][0].length) {
        // Moving down past the last string
        if (newLine < model.lines.length - 1) {
          newLine++;
          newString = 0;
        } else {
          newString = model.lines[newLine][0].length - 1;
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
        newString = model.lines[newLine][0].length - 1;
      }
    }
    // don't wrap, just prevent it from moving past the edge
    const newChord = Math.max(0, Math.min(model.lines[newLine].length - 1, from.chord + dchord));

    return new Position(newLine, newChord, newString);
  };

  const updateSelectionWithMove = (dline: number, dchord: number, dstring: number) => {
    // if we are starting from regular cursor, special handling to just select the chord
    if (selection.isSinglePosition() && model.isStaffLine(selection.start.line)) {
      setSelection(
        new Range(
          new Position(selection.start.line, selection.start.chord, 0),
          new Position(selection.start.line, selection.start.chord, NUM_STRINGS - 1)
        )
      );
      return;
    }
    // partial line is selected, select the whole line before moving to new lines
    else if (
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
    // for other cases, we just re-use the existing position-based selection logic
    let selectionDirection: SelectionDirection;
    if (selection.start.line < initialSelectionPosition.line) {
      selectionDirection = "leftUp";
    } else if (selection.end.line > initialSelectionPosition.line) {
      selectionDirection = "rightDown";
    } else {
      selectionDirection = selection.start.chord < initialSelectionPosition.chord ? "leftUp" : "rightDown";
    }
    const effectivedline = dstring ? dstring : dline;
    // apply the delta to the moving edge of the selection
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
    }
    // simple cursor position update
    else {
      const newPosition = calculateCursorMove(selection.start, dline, dchord, dstring);
      setSelection(new Range(newPosition));
      setInitialSelectionPosition(newPosition);
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
            // move up if we are backspacing over a line
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
    }
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
          if (model.lines[selection.start.line].length === 1) {
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
        // currently doesn't do anything
        model.clearContent(selection);
      }
    }
    updateTabLines();
  };

  const handleCopySelection = (_: React.KeyboardEvent) => {
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

  const handlePasteSelection = async (_: React.KeyboardEvent) => {
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
    // Handle navigation and special keys
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Enter", "Backspace", "Delete", "Escape"].includes(e.key)) {
      handleNavigationKey(e);
      return;
    }

    // Handle copy/paste
    if (e.ctrlKey && (e.key === "c" || e.key === "v")) {
      e.preventDefault();
      if (e.key === "c") {
        handleCopySelection(e);
      } else {
        handlePasteSelection(e);
      }
      return;
    }

    // Handle insert text line
    if (e.ctrlKey && (e.key === "i" || e.key === "I")) {
      e.preventDefault();
      let newPosition: Position;
      if (e.shiftKey) {
        newPosition = model.insertTextLineBelow(selection.start);
      } else {
        newPosition = model.insertTextLineAbove(selection.start);
      }
      setSelection(new Range(newPosition));
      updateTabLines();
      return;
    }

    // Handle input keys (numbers, letters, and allowed special characters)
    if (/^[0-9a-z/\\\-()<>~\^\[\]| ]$/i.test(e.key)) {
      e.preventDefault();
      handleInputKey(e);
    }
  };

  const handleDeleteClick = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    deleteCurrentTab();
    setShowDeleteConfirm(false);
  };

  if (!currentTab) {
    return (
      <div className={`flex flex-col justify-center items-center text-xl ide-text-muted ${className}`}>
        Select a tab! 🎸
      </div>
    );
  }

  return (
    <div className={`flex flex-col justify-between overflow-hidden ${className}`}>
      <div className="flex flex-none justify-between gap-4 mb-2">
        <div className="flex justify-start overflow-hidden">
          <ResizingInput
            type="text"
            value={currentTabMetadata?.song ?? ""}
            onChange={(e) => {
              updateTabMetadata(currentTab.id, { song: e.target.value });
              setShowDeleteConfirm(false);
            }}
            placeholder="Song"
            minWidth="1rem"
            className="bg-transparent border-none outline-none text-ide-text placeholder-ide-text-muted overflow-x-auto overflow-y-hidden custom-scrollbar"
          />
          <span className="mr-2 ml-2 text-ide-text-muted flex-none">by</span>
          <ResizingInput
            type="text"
            value={currentTabMetadata?.artist ?? ""}
            onChange={(e) => {
              updateTabMetadata(currentTab.id, { artist: e.target.value });
              setShowDeleteConfirm(false);
            }}
            placeholder="Artist"
            className="bg-transparent border-none outline-none text-ide-text placeholder-ide-text-muted overflow-x-auto overflow-y-hidden custom-scrollbar"
          />
        </div>
        <div className="flex-none">
          <span className="text-ide-text-muted mr-1">Tuning:</span>
          <TuningInput
            value={currentTabMetadata?.tuning ?? DEFAULT_TUNING}
            onChange={(tuning) => {
              updateTabMetadata(currentTab.id, { tuning: tuning });
              setShowDeleteConfirm(false);
            }}
            className="bg-transparent border-none outline-none text-ide-text"
          ></TuningInput>
        </div>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden mb-2 text-ide-text custom-scrollbar">
        <div
          className="inline-block select-none font-mono outline-none "
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseDown={handleMouseDown}
          onMouseOver={handleMouseOver}
          onMouseUp={handleMouseUp}
        >
          {model.lines.map((tabLine, lineIndex) => {
            if (model.isStaffLine(lineIndex)) {
              return (
                <div key={`${lineIndex}`} className="flex flex-wrap mb-4">
                  <div>
                    {currentTabMetadata?.tuning.map((stringName, stringIndex) => (
                      // -2 relative to start of the actual tab
                      <div key={`${lineIndex}--2-${stringIndex}`} className="text-ide-text-muted">
                        {stringName}
                      </div>
                    ))}
                  </div>
                  <div>
                    {currentTabMetadata?.tuning.map((_, stringIndex) => (
                      // -1 relative to start of the actual tab
                      <div key={`${lineIndex}-1-${stringIndex}`}>|</div>
                    ))}
                  </div>
                  {tabLine.map((chord, chordIndex) => {
                    const maxChordLength = Math.max(...chord.map((str) => str.length));
                    return (
                      <div key={`${lineIndex}-${chordIndex}`}>
                        {chord.map((stringValue, stringIndex) => (
                          <div
                            key={`${lineIndex}-${chordIndex}-${stringIndex}`}
                            data-line={lineIndex}
                            data-chord={chordIndex}
                            data-string={stringIndex}
                            data-cell
                            className={`flex text-center flex-nowrap ${
                              selection.contains(new Position(lineIndex, chordIndex, stringIndex)) &&
                              hasFocus &&
                              !isEditing
                                ? "bg-ide-cursor"
                                : ""
                            }`}
                          >
                            <span className="relative">
                              {stringValue}
                              {isEditing &&
                                // can only be in editing mode if the selection is just one long
                                selection.start.equals(new Position(lineIndex, chordIndex, stringIndex)) &&
                                hasFocus && (
                                  <span className={`absolute top-0 w-[2px] h-5 bg-ide-cursor animate-blink right-0`} />
                                )}
                            </span>
                            {
                              // unless its a bar line, pad the end to match the chord + 1
                              stringValue === BAR_DELIMITER
                                ? ""
                                : "".padEnd(
                                    maxChordLength === 0 ? 2 : maxChordLength - stringValue.length + 1,
                                    EMPTY_NOTE
                                  )
                            }
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <div>
                    {currentTabMetadata?.tuning.map((_, stringIndex) => (
                      // +1 relative to length of the actual tab
                      <div key={`${lineIndex}-${tabLine.length}-${stringIndex}`}>|</div>
                    ))}
                  </div>
                </div>
              );
            } else {
              return (
                <div key={`${lineIndex}`} className="flex flex-wrap" data-text-line={lineIndex}>
                  {
                    // there should only be one line here, but we might expand it in the future
                    tabLine.map((chord, chordIndex) => (
                      <div key={`${lineIndex}-${chordIndex}`}>
                        {chord.map((stringValue, stringIndex) => (
                          <span
                            key={`${lineIndex}-${chordIndex}-${stringIndex}`}
                            data-line={lineIndex}
                            data-chord={chordIndex}
                            data-string={stringIndex}
                            data-cell
                            className={`flex text-center flex-nowrap relative ${
                              selection.contains(new Position(lineIndex, chordIndex, stringIndex)) && hasFocus
                                ? "bg-ide-cursor"
                                : ""
                            }`}
                          >
                            {
                              // use &nbsp to make selection state apparent
                              // TODO: need to make this work with actual data
                              stringValue === "" || stringValue === " " ? "\u00A0" : stringValue
                            }
                          </span>
                        ))}
                      </div>
                    ))
                  }
                </div>
              );
            }
          })}
        </div>
      </div>
      <div className="flex flex-none justify-end gap-4 ml-4 mr-4">
        <button onClick={() => alert("Not implemented yet 🦎")}>Export Tab</button>
        <button
          className={`${showDeleteConfirm ? "p-1 bg-ide-text-destructive text-white" : "text-ide-text-destructive"}`}
          onClick={handleDeleteClick}
        >
          {showDeleteConfirm ? "Click again to confirm" : "Delete Tab"}
        </button>
      </div>
    </div>
  );
};

export default TabEditor;
