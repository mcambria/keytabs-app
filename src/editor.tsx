import React, { useState, useEffect, useRef } from "react";

const NUM_STRINGS = 6;
const NUM_COLUMNS = 32;
const EMPTY_CELL = "--";

type Position = { x: number; y: number };

const TabEditor: React.FC = () => {
  const [tabData, setTabData] = useState(
    Array.from({ length: NUM_STRINGS }, () =>
      Array.from({ length: NUM_COLUMNS }, () => EMPTY_CELL)
    )
  );

  const [cursor, setCursor] = useState<Position>({ x: 0, y: 0 });
  const [selectionStart, setSelectionStart] = useState<Position | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  const moveCursor = (dx: number, dy: number, shift: boolean) => {
    setCursor((prev) => {
      const newCursor = {
        x: Math.max(0, Math.min(NUM_COLUMNS - 1, prev.x + dx)),
        y: Math.max(0, Math.min(NUM_STRINGS - 1, prev.y + dy)),
      };
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
        moveCursor(1, 0, e.shiftKey);
        e.preventDefault();
        break;
      case "ArrowLeft":
        moveCursor(-1, 0, e.shiftKey);
        e.preventDefault();
        break;
      case "ArrowDown":
        moveCursor(0, 1, e.shiftKey);
        e.preventDefault();
        break;
      case "ArrowUp":
        moveCursor(0, -1, e.shiftKey);
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
        updateCell(cursor.x, cursor.y, e.key + "-");
        moveCursor(1, 0, false);
        break;
    }
  };

  const updateCell = (x: number, y: number, value: string) => {
    setTabData((prev) => {
      const updated = prev.map((row) => [...row]);
      updated[y][x] = value;
      return updated;
    });
  };

  const isSelected = (x: number, y: number) => {
    if (!selectionStart) return x === cursor.x && y === cursor.y;
    const x1 = Math.min(selectionStart.x, cursor.x);
    const x2 = Math.max(selectionStart.x, cursor.x);
    const y1 = Math.min(selectionStart.y, cursor.y);
    const y2 = Math.max(selectionStart.y, cursor.y);
    return x >= x1 && x <= x2 && y >= y1 && y <= y2;
  };

  return (
    <div
      className="outline-none inline-block font-mono bg-black p-4"
      tabIndex={0}
      ref={editorRef}
      onKeyDown={handleKeyDown}
    >
      {tabData.map((row, y) => (
        <div className="flex" key={y}>
          {row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className={`w-8 text-center text-gray-300 border-r border-b border-gray-700 px-1 ${
                x === cursor.x && y === cursor.y ? "outline outline-1 outline-blue-400 bg-gray-900" : ""
              } ${isSelected(x, y) ? "bg-blue-800/70" : ""}`}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default TabEditor;
