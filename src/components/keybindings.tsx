import React from "react";
import CollapsiblePanel from "./collapsible-panel";
import { CollapsiblePanelPlacement } from "./collapsible-panel";

type KeyBindingsProps = {
  className?: string;
};

type KeybindingItemProps = {
  label: string;
  keybinding: string;
};

const KeybindingItem: React.FC<KeybindingItemProps> = ({ label, keybinding }) => (
  <li className="flex justify-between">
    <span>{label}</span>
    <kbd className="px-2 py-1 bg-ide-kbd rounded text-ide-text-accent-subtle">{keybinding}</kbd>
  </li>
);

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
            <KeybindingItem label="Move Left" keybinding="←" />
            <KeybindingItem label="Move Right" keybinding="→" />
            <KeybindingItem label="Move Up" keybinding="↑" />
            <KeybindingItem label="Move Down" keybinding="↓" />
            <KeybindingItem label="Move Left (8 chords)" keybinding="Ctrl + ←" />
            <KeybindingItem label="Move Right (8 chords)" keybinding="Ctrl + →" />
            <KeybindingItem label="Move Up (1 staff)" keybinding="Ctrl + ↑" />
            <KeybindingItem label="Move Down (1 staff)" keybinding="Ctrl + ↓" />
          </ul>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-ide-text-accent-primary">Editing</h3>
          <ul className="space-y-2">
            <KeybindingItem label="Insert Bar Line" keybinding="|" />
            <KeybindingItem label="Toggle Cell Edit" keybinding="Enter" />
            <KeybindingItem label="Insert Chord" keybinding="Shift + Enter" />
            <KeybindingItem label="Insert Staff" keybinding="Ctrl + Enter" />
            <KeybindingItem label="Insert Text Line Above" keybinding="Ctrl + I" />
            <KeybindingItem label="Insert Text Line Below" keybinding="Ctrl + Shift + I" />
            <KeybindingItem label="Delete Backward" keybinding="Backspace" />
            <KeybindingItem label="Delete" keybinding="Delete" />
            <KeybindingItem label="Delete Chord" keybinding="Shift + Backspace" />
            <KeybindingItem label="Delete Staff" keybinding="Ctrl + Backspace" />
          </ul>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-ide-text-accent-primary">Selection</h3>
          <ul className="space-y-2">
            <KeybindingItem label="Extend Selection" keybinding="Shift + Arrow Keys" />
            <KeybindingItem label="Copy Selection" keybinding="Ctrl + C" />
            <KeybindingItem label="Paste" keybinding="Ctrl + V" />
          </ul>
        </div>
      </div>
    </CollapsiblePanel>
  );
};

export default Keybindings;
