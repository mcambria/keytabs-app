import React from "react";
import CollapsiblePanel from "./collapsible-panel";
import { CollapsiblePanelPlacement } from "./collapsible-panel";

const TabsList: React.FC = () => {
  return (
    <CollapsiblePanel title="My Tabs" placement={CollapsiblePanelPlacement.LEFT}>
      <div className="text-gray-300">
        <p className="text-sm italic">No tabs saved yet</p>
      </div>
    </CollapsiblePanel>
  );
};

export default TabsList;
