import { useRef, useEffect } from "react";

interface ResizingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  minWidth?: string;
  maxWidth?: string;
}

export default function ResizingInput({ className, value, placeholder, minWidth, maxWidth, ...props }: ResizingInputProps) {
  const testSpanRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (testSpanRef.current && inputRef.current) {
      inputRef.current.style.width = testSpanRef.current.offsetWidth + "px";
    }
  }, [value, placeholder]);

  return (
    <div className={`relative inline-block ${className}`} title={String(value) || placeholder}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        className={`border-none bg-transparent focus:outline-none`}
        placeholder={placeholder}
        {...props}
      />
      <span ref={testSpanRef} className="absolute invisible whitespace-pre left-0">
        {value || placeholder || "&nbsp"}
      </span>
    </div>
  );
}
