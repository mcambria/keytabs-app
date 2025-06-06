import React from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onCopy, onPaste }) => {
  // Close the menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      onClose();
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      className="fixed bg-ide-panel border border-ide-highlight rounded-sm shadow-lg py-1 z-50 min-w-[150px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className={`w-full px-4 py-1 text-left hover:bg-ide-bg-hover transition-colors text-ide-text`}
        onClick={onCopy}
      >
        Copy
      </button>
      <button
        className={`w-full px-4 py-1 text-left hover:bg-ide-bg-hover transition-colors text-ide-text`}
        onClick={onPaste}
      >
        Paste
      </button>
    </div>
  );
};

export default ContextMenu;
