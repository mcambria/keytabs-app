import React, { useRef, useEffect } from "react";

interface ResizingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: string;
  maxHeight?: string;
}

export default function ResizingTextarea({
  className,
  value,
  placeholder,
  minHeight = "2.5rem",
  maxHeight = "6rem",
  ...props
}: ResizingTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // Resize on value change
  useEffect(() => {
    resize();
  }, [value]);

  // Resize on mount
  useEffect(() => {
    resize();
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      className={`m-1 p-2 bg-ide-panel rounded text-ide-text placeholder-ide-text-muted resize-none custom-scrollbar focus:outline focus:outline-1 focus:outline-ide-text-muted ${className}`}
      style={{ minHeight, maxHeight }}
      placeholder={placeholder}
      rows={1}
      {...props}
    />
  );
}
