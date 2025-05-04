import React, { useState, useEffect, useRef } from "react";

const NUM_STRINGS = 6;
const NUM_COLUMNS = 32;
const EMPTY_CELL = "--";
const STRING_NAMES = ["e", "B", "G", "D", "A", "E"];

type Position = { x: number; y: number; line: number };

const TabEditor: React.FC = () => {
  const [tabLines, setTabLines] = useState([
    Array.from({ length: NUM_STRINGS }, () =>
      Array.from({ length: NUM_COLUMNS }, () => EMPTY_CELL)
    ),
  ]);

  const [cursor, setCursor] = useState<Position>({ x: 0, y: 0, line: 0 });
  const [selectionStart, setSelectionStart] = useState<Position | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  const moveCursor = (dx: number, dy: number, dline: number, shift: boolean) => {
    setCursor((prev) => {
      const newCursor = {
        x: Math.max(0, Math.min(NUM_COLUMNS - 1, prev.x + dx)),
        y: Math.max(0, Math.min(NUM_STRINGS - 1, prev.y + dy)),
        line: Math.max(0, Math.min(tabLines.length - 1, prev.line + dline)),
      } as Position;
      if (shift) {
        if (!selectionStart) setSelectionStart(prev);
      } else {
        setSelectionStart(null);
      }
      return newCursor;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
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
            newLines.splice(cursor.line + 1, 0, 
              Array.from({ length: NUM_STRINGS }, () =>
                Array.from({ length: NUM_COLUMNS }, () => EMPTY_CELL)
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
        updateCell(cursor.x, cursor.y, cursor.line, e.key + "-");
        moveCursor(1, 0, 0, false);
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
    if (!selectionStart) return x === cursor.x && y === cursor.y && line === cursor.line;
    const x1 = Math.min(selectionStart.x, cursor.x);
    const x2 = Math.max(selectionStart.x, cursor.x);
    const y1 = Math.min(selectionStart.y, cursor.y);
    const y2 = Math.max(selectionStart.y, cursor.y);
    const line1 = Math.min(selectionStart.line, cursor.line);
    const line2 = Math.max(selectionStart.line, cursor.line);
    return x >= x1 && x <= x2 && y >= y1 && y <= y2 && line >= line1 && line <= line2;
  };

  return (
    <div
      className="outline-none inline-block font-mono bg-gray-900 p-4"
      tabIndex={0}
      ref={editorRef}
      onKeyDown={handleKeyDown}
    >
      {tabLines.map((tabLine, lineIndex) => (
        <div key={lineIndex} className="mb-4">
          {tabLine.map((row, y) => (
            <div className="flex" key={y}>
              <div className="text-right text-gray-400 pr-2">
                {STRING_NAMES[y]}
              </div>
              {row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`text-center text-gray-300 ${
                    x === cursor.x && y === cursor.y && lineIndex === cursor.line
                      ? "outline outline-1 outline-blue-400 bg-gray-800"
                      : ""
                  } ${isSelected(x, y, lineIndex) ? "bg-blue-900/50" : ""}`}
                >
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default TabEditor;
