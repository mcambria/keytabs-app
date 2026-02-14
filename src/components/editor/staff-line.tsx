import React from "react";
import { Position, Range, EMPTY_NOTE, BAR_DELIMITER } from "../../models/tab";
import { Tuning } from "@/services/tab-store";

type StaffLineProps = {
  lineIndex: number;
  tabLine: string[][];
  tuning: Tuning;
  selection: Range;
  hasFocus: boolean;
  isEditing: boolean;
};

const StaffLine: React.FC<StaffLineProps> = ({
  lineIndex,
  tabLine,
  tuning,
  selection,
  hasFocus,
  isEditing,
}) => {
  return (
    <div key={`${lineIndex}`} className="flex flex-wrap">
      <div>
        {tuning.map((stringName, stringIndex) => (
          <div key={`${lineIndex}--2-${stringIndex}`} className="text-ide-text-muted">
            {stringName}
          </div>
        ))}
      </div>
      <div>
        {tuning.map((_, stringIndex) => (
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
                    selection.start.equals(new Position(lineIndex, chordIndex, stringIndex)) &&
                    hasFocus && (
                      <span className={`absolute top-0 w-[2px] h-5 bg-ide-cursor animate-blink right-0`} />
                    )}
                </span>
                {stringValue === BAR_DELIMITER
                  ? ""
                  : "".padEnd(
                      maxChordLength === 0 ? 2 : maxChordLength - stringValue.length + 1,
                      EMPTY_NOTE
                    )}
              </div>
            ))}
          </div>
        );
      })}
      <div>
        {tuning.map((_, stringIndex) => (
          <div key={`${lineIndex}-${tabLine.length}-${stringIndex}`}>|</div>
        ))}
      </div>
    </div>
  );
};

export default StaffLine;
