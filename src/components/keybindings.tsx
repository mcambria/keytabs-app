import React from "react";
import CollapsiblePanel from "./collapsible-panel";
import { CollapsiblePanelPlacement } from "./collapsible-panel";

type KeyBindingsProps = {
  className?: string;
}

const Keybindings: React.FC<KeyBindingsProps> = ({
  className = ""
}) => {
  return (
    <CollapsiblePanel
      title="Keybindings"
      placement={CollapsiblePanelPlacement.RIGHT}
      preferenceKey="keybindingsCollapsed"
      className={className}
    >
      <div className="text-ide-text overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-ide-text">Navigation</h3>
          <ul className="space-y-2">
            <li className="flex justify-between">
              <span>Move Left</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text">←</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Right</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text">→</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Up</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text">↑</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Down</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text">↓</kbd>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2 text-ide-text">Editing</h3>
          <ul className="space-y-2">
            <li className="flex justify-between">
              <span>New Line</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text">Shift + Enter</kbd>
            </li>
            <li className="flex justify-between">
              <span>Delete</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text">Backspace</kbd>
            </li>
          </ul>
        </div>
      </div>
    </CollapsiblePanel>
  );
};

export default Keybindings;
