import React from "react";
import CollapsiblePanel from "./collapsible-panel";
import { CollapsiblePanelPlacement } from "./collapsible-panel";

type KeyBindingsProps = {
  className?: string;
};

const Keybindings: React.FC<KeyBindingsProps> = ({ className = "" }) => {
  return (
    <CollapsiblePanel
      title="Keybindings"
      placement={CollapsiblePanelPlacement.RIGHT}
      preferenceKey="keybindingsCollapsed"
      className={className}
    >
      <div className="text-ide-text overflow-y-auto custom-scrollbar pr-2">
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-ide-text-accent-primary">Navigation</h3>
          <ul className="space-y-2">
            <li className="flex justify-between">
              <span>Move Left</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">←</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Right</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">→</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Up</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">↑</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Down</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">↓</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Left (8 chords)</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Ctrl + ←</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Right (8 chords)</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Ctrl + →</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Up (1 line)</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Ctrl + ↑</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Down (1 line)</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Ctrl + ↓</kbd>
            </li>
          </ul>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-ide-text-accent-primary">Editing</h3>
          <ul className="space-y-2">
            <li className="flex justify-between">
              <span>Insert Bar Line</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">|</kbd>
            </li>
            <li className="flex justify-between">
              <span>Toggle Cell Edit</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Enter</kbd>
            </li>
            <li className="flex justify-between">
              <span>Insert Chord</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Shift + Enter</kbd>
            </li>
            <li className="flex justify-between">
              <span>Insert Line</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Ctrl + Enter</kbd>
            </li>
            <li className="flex justify-between">
              <span>Delete Backward</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Backspace</kbd>
            </li>
            <li className="flex justify-between">
              <span>Delete</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Delete</kbd>
            </li>
            <li className="flex justify-between">
              <span>Delete Chord</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Shift + Backspace</kbd>
            </li>
            <li className="flex justify-between">
              <span>Delete Line</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Ctrl + Backspace</kbd>
            </li>
          </ul>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-ide-text-accent-primary">Selection</h3>
          <ul className="space-y-2">
            <li className="flex justify-between">
              <span>Extend Selection</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Shift + Arrow Keys</kbd>
            </li>
            <li className="flex justify-between">
              <span>Copy Selection</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Ctrl + C</kbd>
            </li>
            <li className="flex justify-between">
              <span>Paste</span>
              <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">Ctrl + V</kbd>
            </li>
          </ul>
        </div>
      </div>
    </CollapsiblePanel>
  );
};

export default Keybindings;
