import React from "react";
import { Position, Range } from "../../models/tab";

type TextLineProps = {
  lineIndex: number;
  tabLine: string[][];
  selection: Range;
  hasFocus: boolean;
  isTextCursor: boolean;
};

const TextLine: React.FC<TextLineProps> = ({
  lineIndex,
  tabLine,
  selection,
  hasFocus,
  isTextCursor,
}) => {
  const showCursor = isTextCursor && selection.start.line === lineIndex && selection.isSinglePosition();
  const cursorChord = selection.start.chord;

  return (
    <div key={`${lineIndex}`} className="flex flex-wrap" data-text-line={lineIndex}>
      {tabLine.map((chord, chordIndex) => {
        const isCursorHere = showCursor && chordIndex === cursorChord;
        return (
          <div key={`${lineIndex}-${chordIndex}`}>
            {chord.map((stringValue, stringIndex) => (
              <span
                key={`${lineIndex}-${chordIndex}-${stringIndex}`}
                data-line={lineIndex}
                data-chord={chordIndex}
                data-string={stringIndex}
                data-cell
                {...(isCursorHere ? { "data-cursor": "" } : {})}
                className={`flex text-center flex-nowrap relative ${
                  selection.contains(new Position(lineIndex, chordIndex, stringIndex)) && hasFocus && !showCursor
                    ? "bg-ide-cursor"
                    : ""
                }`}
              >
                {isCursorHere && (
                  <span className="absolute top-0 left-0 w-[2px] h-5 bg-ide-cursor animate-blink" />
                )}
                {stringValue === "" || stringValue === " " ? "\u00A0" : stringValue}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default TextLine;
