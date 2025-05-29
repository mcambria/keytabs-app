import { DEFAULT_TUNING } from "@/models/tab";
import { Tuning } from "@/services/tab-store";
import React, { ChangeEvent, useState, useEffect } from "react";

interface TuningInputProps {
  value: Tuning;
  onChange: (value: Tuning) => void;
  className?: string;
}

const PLACEHOLDER = [...DEFAULT_TUNING].reverse().join("");

export const TuningInput: React.FC<TuningInputProps> = ({ value, onChange, className = "" }) => {
  // reverse the input from how its stored in the array

  const initialInputValue = [...value].reverse().join("");
  const [inputValue, setInputValue] = useState(initialInputValue);

  const updateInputValue = (value: string[]) =>
  {
    const reversed = [...value].reverse().join("");
    setInputValue(reversed);
  }

  useEffect(() => {
    updateInputValue(value);
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    input = input.replace(/[^a-g]/gi, "");

    // Limit to 6 characters
    if (input.length > 6) {
      input = input.slice(0, 5);
      return;
    }

    if (input.length == 6) {
      onChange(input.split("").reverse());
    }
    setInputValue(input);
  };

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleChange}
      className={`w-[4.25rem] ${className}`}
      placeholder={PLACEHOLDER}
      maxLength={DEFAULT_TUNING.length}
      onBlur={() => updateInputValue(value)}
    />
  );
};
