import React from "react";
import { Position, Range } from "../../models/tab";

type TextLineProps = {
  lineIndex: number;
  tabLine: string[][];
  selection: Range;
  hasFocus: boolean;
};

const TextLine: React.FC<TextLineProps> = ({
  lineIndex,
  tabLine,
  selection,
  hasFocus,
}) => {
  return (
    <div key={`${lineIndex}`} className="flex flex-wrap" data-text-line={lineIndex}>
      {tabLine.map((chord, chordIndex) => (
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
              {stringValue === "" || stringValue === " " ? "\u00A0" : stringValue}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

export default TextLine;
