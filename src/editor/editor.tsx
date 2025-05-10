import React, { useState, useEffect, useRef } from "react";

const EMPTY_CELL = "--";
const STRING_NAMES = ["e", "B", "G", "D", "A", "E"];
const NUM_STRINGS = STRING_NAMES.length;
const INITIAL_NUM_COLUMNS = 32;

interface Position {
  line: number;
  chord: number;
  string: number;
}

type TabLines = string[][][];

const defaultLine = () =>
  Array.from({ length: INITIAL_NUM_COLUMNS }, () =>
    Array.from({ length: NUM_STRINGS }, () => EMPTY_CELL)
  );

const TabEditor: React.FC = () => {
  // Song model
  const [song, setSong] = useState("");
  const [artist, setArtist] = useState("");
  const [tabLines, setTabLines] = useState<TabLines>([defaultLine()]);

  const [cursor, setCursor] = useState<Position>({
    line: 0,
    chord: 0,
    string: 0,
  });
  const [isEditing, setIsEditing] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    editorRef.current?.focus();
  }, []);

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
  const handleInputKey = (key: string) => {
    if (!isEditing) {
      startEditing();
    }
    // setCurrentEditValue((prev) => prev + key);
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
          // move down 1 line
          moveCursor(1, 0, 0, e.shiftKey);
        } else {
          moveCursor(0, 0, 1, e.shiftKey);
        }
        break;
      case "ArrowUp":
        if (e.ctrlKey) {
          // move down 1 line
          moveCursor(-1, 0, 0, e.shiftKey);
        } else {
          moveCursor(0, 0, -1, e.shiftKey);
        }
        break;
      case "Enter":
        if (e.shiftKey) {
          // Create a new line
          setTabLines((prev) => {
            const newLines = [...prev];
            newLines.splice(cursor.line + 1, 0, defaultLine());
            return newLines;
          });
          moveCursor(1, 0, 0, false);
        } else {
          commitEdit();
        }
        break;
      case "Backspace":
        if (isEditing) {
          // setCurrentEditValue((prev) => prev.slice(0, -1));
        } else {
          updateCell(cursor.line, cursor.chord, cursor.string, EMPTY_CELL);
          moveCursor(0, -1, 0, false);
        }
        break;
      case "Delete":
        if (isEditing) {
          // setCurrentEditValue("");
        } else {
          updateCell(cursor.line, cursor.chord, cursor.string, EMPTY_CELL);
        }
        break;
      case "Escape":
        setIsEditing(false);
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

    // Handle input keys (numbers)
    // TODO: add other keys for notation stuff
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      handleInputKey(e.key);
    }
  };

  const updateCell = (
    line: number,
    chord: number,
    string: number,
    value: string
  ) => {
    setTabLines((prev) => {
      const updated = prev.map((tabLine, lineIndex) => {
        if (lineIndex === line) {
          return tabLine.map((chordData, chordIndex) => {
            if (chordIndex === chord) {
              return chordData.map((stringValue, stringIndex) => {
                if (stringIndex === string) {
                  return value;
                }
                return stringValue;
              });
            }
            return chordData;
          });
        }
        return tabLine;
      });
      return updated;
    });
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
        ref={editorRef}
        onKeyDown={handleKeyDown}
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
                    className={`flex text-center ${
                      lineIndex === cursor.line &&
                      chordIndex === cursor.chord &&
                      stringIndex === cursor.string
                        ? "bg-ide-highlight"
                        : ""
                    }`}
                  >
                    {stringValue}
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
