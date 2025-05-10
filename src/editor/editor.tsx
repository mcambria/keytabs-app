import React, { useState, useEffect, useRef } from "react";

const EMPTY_CELL = "--";
const STRING_NAMES = ["e", "B", "G", "D", "A", "E"];
const NUM_STRINGS = STRING_NAMES.length;
const INITIAL_NUM_COLUMNS = 32;

type Position = { line: number; chord: number; string: number };

const TabEditor: React.FC = () => {
  // Song model
  const [song, setSong] = useState("");
  const [artist, setArtist] = useState("");
  const [tabLines, setTabLines] = useState([
    Array.from({ length: INITIAL_NUM_COLUMNS }, () =>
      Array.from({ length: NUM_STRINGS }, () => EMPTY_CELL)
    ),
  ]);

  const [cursor, setCursor] = useState<Position>({ line: 0, chord: 0, string: 0 });
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  const moveCursor = (
    dline: number,
    dchord: number,
    dstring: number,
    shift: boolean, //TODO: just leaving as scaffolding for now
  ) => {
    setCursor((prev) => {
      const newCursor = {
        line: Math.max(0, Math.min(tabLines.length - 1, prev.line + dline)),
        chord: Math.max(0, Math.min(INITIAL_NUM_COLUMNS - 1, prev.chord + dchord)),
        string: Math.max(0, Math.min(NUM_STRINGS - 1, prev.string + dstring)),
      } as Position;
      return newCursor;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Backspace":
        // block firefox backspace to go back a page
        e.preventDefault();
        updateCell(cursor.line, cursor.chord, cursor.string, EMPTY_CELL);
        moveCursor(0, -1, 0, false); // TODO: should this really go back in chord
        break;
      case "Delete":
        updateCell(cursor.line, cursor.chord, cursor.string, EMPTY_CELL);
        break;
      case "ArrowRight":
        moveCursor(0, 1, 0, e.shiftKey);
        e.preventDefault();
        break;
      case "ArrowLeft":
        moveCursor(0, -1, 0, e.shiftKey);
        e.preventDefault();
        break;
      case "ArrowDown":
        moveCursor(0, 0, 1, e.shiftKey);
        e.preventDefault();
        break;
      case "ArrowUp":
        moveCursor(0, 0, -1, e.shiftKey);
        e.preventDefault();
        break;
      case "Enter":
        if (e.shiftKey) {
          // Create a new line
          setTabLines((prev) => {
            const newLines = [...prev];
            newLines.splice(
              cursor.line + 1,
              0,
              Array.from({ length: INITIAL_NUM_COLUMNS }, () =>
                Array.from({ length: NUM_STRINGS }, () => EMPTY_CELL)
              )
            );
            return newLines;
          });
          moveCursor(1, 0, 0, false);
        }
        e.preventDefault();
        break;
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
      case "0":
        // TOOD: other keys here
        // TODO: also handle entering multiple chars in a single cell, e.g. track the current cell and reset when it moves
        updateCell(cursor.line, cursor.chord, cursor.string, e.key + "-");
        break;
    }
  };

  const updateCell = (line: number, chord: number, string: number, value: string) => {
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
                // +1 relative to start of the actual tab
                <div key={`${lineIndex}-${tabLine.length}-${stringIndex}`} className="flex text-center">
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