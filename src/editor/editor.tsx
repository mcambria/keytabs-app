import React, { useState, useEffect } from "react";
import {
  TabModel,
  Position,
  EMPTY_NOTE,
  STRING_NAMES,
  NUM_STRINGS,
  BAR_DELIMITER,
} from "./tab-model";

const TabEditor: React.FC = () => {
  // Song model
  const [song, setSong] = useState(() => localStorage.getItem("tabSong") || "");
  const [artist, setArtist] = useState(
    () => localStorage.getItem("tabArtist") || ""
  );
  const [model] = useState(() => {
    const newModel = new TabModel();
    const saved = localStorage.getItem("tabLines");
    if (saved) {
      newModel.setLines(JSON.parse(saved));
    }
    return newModel;
  });
  const [tabLines, setTabLines] = useState(model.getLines());
  const updateTabLines = () => setTabLines(model.createMutableCopy());

  // Save state when it changes
  useEffect(() => {
    localStorage.setItem("tabSong", song);
  }, [song]);

  useEffect(() => {
    localStorage.setItem("tabArtist", artist);
  }, [artist]);

  useEffect(() => {
    localStorage.setItem("tabLines", JSON.stringify(tabLines));
  }, [tabLines]);

  const [cursor, setCursor] = useState<Position>({
    line: 0,
    chord: 0,
    string: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);

  const handleFocus = (e: React.FocusEvent) => {
    // Only set focus if we're not already handling it in a click
    if (!e.target?.closest("[data-cell]")) {
      setHasFocus(true);
    }
  };

  const handleBlur = () => {
    setHasFocus(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    console.log("handling click");
    const target = e.target as HTMLElement;
    const cell = target.closest("[data-cell]");
    if (cell) {
      const lineIndex = parseInt(cell.getAttribute("data-line") || "0");
      const chordIndex = parseInt(cell.getAttribute("data-chord") || "0");
      const stringIndex = parseInt(cell.getAttribute("data-string") || "0");
      setCursor({
        line: lineIndex,
        chord: chordIndex,
        string: stringIndex,
      });
      // Set focus after cursor position is updated
      setHasFocus(true);
    }
  };

  const moveCursor = (
    dline: number,
    dchord: number,
    dstring: number,
    shift: boolean
  ) => {
    commitEdit();
    setCursor((prev) => {
      let newLine = prev.line;
      let newString = prev.string + dstring;

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
          if (newLine < tabLines.length - 1) {
            newLine++;
            newString = 0;
          } else {
            newString = NUM_STRINGS - 1;
          }
        }
      }

      // Handle line movement
      newLine = Math.max(0, Math.min(tabLines.length - 1, newLine + dline));
      const newChord = Math.max(
        0,
        Math.min(tabLines[newLine].length - 1, prev.chord + dchord)
      );

      return {
        line: newLine,
        chord: newChord,
        string: newString,
      };
    });
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const commitEdit = () => {
    setIsEditing(false);
  };

  const handleInputKey = (e: React.KeyboardEvent) => {
    const key = e.key;
    if (key == "|") {
      if (!e.shiftKey) {
        return;
      }
      model.insertBarLine(cursor);
      updateTabLines();
      return;
    }

    let currentValue = "";
    if (isEditing) {
      currentValue = model.getStringValue(cursor);
    }

    const newValue = currentValue + key;
    model.setStringValue(cursor, newValue);
    updateTabLines();

    startEditing();
  };

  const handleNavigationKey = (e: React.KeyboardEvent) => {
    e.preventDefault();
    const currentValue = model.getStringValue(cursor);
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
          model.insertLine(cursor);
          updateTabLines();
        }
        if (e.shiftKey) {
          model.insertChord(cursor);
          updateTabLines();
        }
        else {
          commitEdit();
        }
        break;
      case "Backspace":
        if (isEditing) {
          const newValue = currentValue.slice(0, -1) || EMPTY_NOTE;
          model.setStringValue(cursor, newValue);
          updateTabLines();
        } else {
          if (currentValue == BAR_DELIMITER || e.shiftKey) {
            model.deleteChord(cursor);
          }
          else {
            model.setStringValue(cursor, EMPTY_NOTE);
          }
          updateTabLines();
          moveCursor(0, -1, 0, false);
        }
        break;
      case "Delete":
        if (isEditing) {
          const newValue = currentValue.slice(0, -1) || EMPTY_NOTE;
          model.setStringValue(cursor, newValue);
          updateTabLines();
        } else {
          if (currentValue == BAR_DELIMITER || e.shiftKey) {
            model.deleteChord(cursor);
          }
          else {
            model.setStringValue(cursor, EMPTY_NOTE);
          }
          model.setStringValue(cursor, EMPTY_NOTE);
          updateTabLines();
        }
        break;
      case "Escape":
        commitEdit();
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle navigation keys
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
      ].includes(e.key)
    ) {
      handleNavigationKey(e);
      return;
    }

    // Handle input keys (numbers and special characters)
    if (/^[0-9]$/.test(e.key) || ["|", "h", "p"].includes(e.key)) {
      e.preventDefault();
      handleInputKey(e);
    }
  };

  const isSelected = (line: number, chord: number, string: number) => {
    return false;
  };

  return (
    <div>
      <div className="flex justify-between gap-4 ml-4 mr-4 mb-4">
        <input
          type="text"
          value={song}
          onChange={(e) => setSong(e.target.value)}
          placeholder="Song"
          className="bg-transparent border-none outline-none text-ide-text placeholder-ide-text-muted"
        />
        <input
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist"
          className="bg-transparent border-none outline-none text-ide-text placeholder-ide-text-muted text-right"
        />
      </div>
      <div
        className="outline-none inline-block font-mono text-ide-text"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
      >
        {tabLines.map((tabLine, lineIndex) => (
          <div key={`${lineIndex}`} className="flex mb-4">
            <div className="flex-col">
              {STRING_NAMES.map((stringName, stringIndex) => (
                // -2 relative to start of the actual tab
                <div
                  key={`${lineIndex}--2-${stringIndex}`}
                  className="flex text-right text-ide-text-muted select-none"
                >
                  {stringName}
                </div>
              ))}
            </div>
            <div className="flex-col">
              {STRING_NAMES.map((_, stringIndex) => (
                // -1 relative to start of the actual tab
                <div
                  key={`${lineIndex}-1-${stringIndex}`}
                  className="flex text-center"
                >
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
                    className={`flex text-center ${
                      lineIndex === cursor.line &&
                      chordIndex === cursor.chord &&
                      stringIndex === cursor.string &&
                      hasFocus // TODO: should I use an insert style cursor for edit mode, and a block style cursor for not?
                        ? "bg-pink-600"
                        : ""
                    }`}
                  >
                    {stringValue + (stringValue === BAR_DELIMITER ? '' : EMPTY_NOTE)}
                  </div>
                ))}
              </div>
            ))}
            <div className="flex-col">
              {STRING_NAMES.map((_, stringIndex) => (
                // +1 relative to length of the actual tab
                <div
                  key={`${lineIndex}-${tabLine.length}-${stringIndex}`}
                  className="flex text-center"
                >
                  |
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabEditor;
