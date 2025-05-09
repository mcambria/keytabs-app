import React, { useState, useEffect, useRef } from "react";

const EMPTY_CELL = "--";
const STRING_NAMES = ["e", "B", "G", "D", "A", "E"];
const NUM_STRINGS = STRING_NAMES.length;
const INITIAL_NUM_COLUMNS = 32;

type Position = { x: number; y: number; line: number };

const TabEditor: React.FC = () => {
  // Song model
  const [song, setSong] = useState("");
  const [artist, setArtist] = useState("");
  const [tabLines, setTabLines] = useState([
    Array.from({ length: NUM_STRINGS }, () =>
      Array.from({ length: INITIAL_NUM_COLUMNS }, () => EMPTY_CELL)
    ),
  ]);

  const [cursor, setCursor] = useState<Position>({ x: 0, y: 0, line: 0 });
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  const moveCursor = (
    dx: number,
    dy: number,
    dline: number,
    shift: boolean, //TODO: just leaving as scaffolding for now
  ) => {
    setCursor((prev) => {
      const newCursor = {
        x: Math.max(0, Math.min(INITIAL_NUM_COLUMNS - 1, prev.x + dx)),
        y: Math.max(0, Math.min(NUM_STRINGS - 1, prev.y + dy)),
        line: Math.max(0, Math.min(tabLines.length - 1, prev.line + dline)),
      } as Position;
      return newCursor;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      // block firefox backspace to go back a page
      case "Backspace":
        e.preventDefault();
        break;
      case "ArrowRight":
        moveCursor(1, 0, 0, e.shiftKey);
        e.preventDefault();
        break;
      case "ArrowLeft":
        moveCursor(-1, 0, 0, e.shiftKey);
        e.preventDefault();
        break;
      case "ArrowDown":
        moveCursor(0, 1, 0, e.shiftKey);
        e.preventDefault();
        break;
      case "ArrowUp":
        moveCursor(0, -1, 0, e.shiftKey);
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
              Array.from({ length: NUM_STRINGS }, () =>
                Array.from({ length: INITIAL_NUM_COLUMNS }, () => EMPTY_CELL)
              )
            );
            return newLines;
          });
          moveCursor(0, 0, 1, false);
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
        updateCell(cursor.x, cursor.y, cursor.line, e.key + "-");
        break;
    }
  };

  const updateCell = (x: number, y: number, line: number, value: string) => {
    setTabLines((prev) => {
      const updated = prev.map((tabLine, lineIndex) => {
        if (lineIndex === line) {
          return tabLine.map((row, rowIndex) => {
            if (rowIndex === y) {
              return [...row.slice(0, x), value, ...row.slice(x + 1)];
            }
            return row;
          });
        }
        return tabLine;
      });
      return updated;
    });
  };

  const isSelected = (x: number, y: number, line: number) => {
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
          <div key={`${lineIndex}`} className="mb-4">
            {tabLine.map((row, y) => (
              <div className="flex" key={y}>
                <div className="text-right text-ide-text-muted pr-2 select-none">
                  {STRING_NAMES[y]}
                </div>
                |
                {row.map((cell, x) => (
                  <div
                    key={`${x}-${y}`}
                    className={`text-center ${
                      x === cursor.x &&
                      y === cursor.y &&
                      lineIndex === cursor.line
                        ? "bg-ide-highlight"
                        : ""
                    } ${
                      isSelected(x, y, lineIndex) ? "bg-ide-highlight/50" : ""
                    }`}
                  >
                    {cell}
                  </div>
                ))}
                |
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabEditor;
