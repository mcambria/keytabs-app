import React from "react";
import { Position, Range } from "../../models/tab";

type TextBlockProps = {
  lineIndex: number;
  text: string;
  selection: Range;
  /** Whether the given text position is inside the (non-cursor) selection. */
  isSelected: (position: Position) => boolean;
  hasFocus: boolean;
};

/**
 * Renders a text entry as rows of characters. Every cursor position
 * (0..text.length) has exactly one cell: each character, plus a trailing cell
 * at the end of each row standing in for its "\n" (or the end of the text).
 */
const TextBlock: React.FC<TextBlockProps> = ({ lineIndex, text, selection, isSelected, hasFocus }) => {
  const showCursor = hasFocus && selection.isSinglePosition() && selection.start.line === lineIndex;
  const rows = text.split("\n");

  let rowStart = 0;
  return (
    <div data-text-block={lineIndex}>
      {rows.map((row, rowIndex) => {
        const start = rowStart;
        rowStart += row.length + 1;
        const cells = [...row, ""];
        return (
          <div
            key={rowIndex}
            className="flex flex-wrap"
            data-text-row={rowIndex}
            data-line={lineIndex}
            data-row-end={start + row.length}
          >
            {cells.map((char, i) => {
              const offset = start + i;
              const isCursorHere = showCursor && selection.start.chord === offset;
              const highlighted = hasFocus && !showCursor && isSelected(new Position(lineIndex, offset, 0));
              return (
                <span
                  key={i}
                  data-line={lineIndex}
                  data-chord={offset}
                  data-string={0}
                  data-cell
                  {...(isCursorHere ? { "data-cursor": "" } : {})}
                  className={`relative whitespace-pre ${highlighted ? "bg-ide-cursor" : ""}`}
                >
                  {isCursorHere && <span className="absolute top-0 left-0 w-[2px] h-5 bg-ide-cursor animate-blink" />}
                  {char === "" || char === " " ? " " : char}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default TextBlock;
