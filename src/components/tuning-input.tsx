import { DEFAULT_TUNING } from "@/models/tab";
import { Tuning } from "@/services/tab-store";
import React, { ChangeEvent, useState } from "react";

interface TuningInputProps {
  value: Tuning;
  onChange: (value: Tuning) => void;
  className?: string;
}

export const TuningInput: React.FC<TuningInputProps> = ({ value, onChange, className = "" }) => {
  // reverse the input from how its stored in the array
  const [inputValue, setInputValue] = useState([...value].reverse());

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    input = input.replace(/[^a-g]/gi, "");

    // Limit to 6 characters
    if (input.length > 6) {
      input = input.slice(0, 5);
      return;
    }

    const splitValue = input.split("");
    if (input.length == 6) {
      onChange([...splitValue].reverse());
    }
    setInputValue(splitValue);
  };

  return (
    <input
      type="text"
      value={inputValue.join("")}
      onChange={handleChange}
      className={`w-16 ${className}`}
      placeholder={[...DEFAULT_TUNING].reverse().join("")}
      maxLength={DEFAULT_TUNING.length}
      onBlur={() => setInputValue(value.reverse())}
    />
  );
};
