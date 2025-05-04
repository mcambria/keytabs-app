import React from 'react';
import CollapsiblePanel from '../components/CollapsiblePanel';
import { CollapsiblePanelPlacement } from '../components/CollapsiblePanel';

const Keybindings: React.FC = () => {
  return (
    <CollapsiblePanel title="Keybindings" placement={CollapsiblePanelPlacement.RIGHT}>
      <div className="text-[#a9b7c6]">
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-[#ffc66d]">Navigation</h3>
          <ul className="space-y-2">
            <li className="flex justify-between">
              <span>Move Left</span>
              <kbd className="px-2 py-1 bg-[#2b2b2b] rounded text-[#a9b7c6]">←</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Right</span>
              <kbd className="px-2 py-1 bg-[#2b2b2b] rounded text-[#a9b7c6]">→</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Up</span>
              <kbd className="px-2 py-1 bg-[#2b2b2b] rounded text-[#a9b7c6]">↑</kbd>
            </li>
            <li className="flex justify-between">
              <span>Move Down</span>
              <kbd className="px-2 py-1 bg-[#2b2b2b] rounded text-[#a9b7c6]">↓</kbd>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2 text-[#ffc66d]">Editing</h3>
          <ul className="space-y-2">
            <li className="flex justify-between">
              <span>New Line</span>
              <kbd className="px-2 py-1 bg-[#2b2b2b] rounded text-[#a9b7c6]">Shift + Enter</kbd>
            </li>
            <li className="flex justify-between">
              <span>Delete</span>
              <kbd className="px-2 py-1 bg-[#2b2b2b] rounded text-[#a9b7c6]">Backspace</kbd>
            </li>
          </ul>
        </div>
      </div>
    </CollapsiblePanel>
  );
};

export default Keybindings; 