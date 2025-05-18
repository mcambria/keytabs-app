import React from "react";
import CollapsiblePanel from "./collapsible-panel";
import { CollapsiblePanelPlacement } from "./collapsible-panel";
import { useTabStore } from "@/services/tab-store";
import { newTabButton } from "./new-tab-button";

const TabsList: React.FC = () => {
  const { tabList, setCurrentTab } = useTabStore();

  return (
    <CollapsiblePanel title="My Tabs" placement={CollapsiblePanelPlacement.LEFT}>
      <div className="p-4">
       {newTabButton(setCurrentTab)}
        {tabList.length === 0 ? (
          <p className="text-sm italic text-gray-300">No tabs saved yet</p>
        ) : (
          <div className="space-y-2">
            {tabList.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center justify-between p-2 bg-ide-bg-hover cursor-pointer rounded hover:bg-ide-bg-hover-hover transition-colors"
                onClick={() => setCurrentTab(tab.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ide-text truncate" title={tab.song || "Draft"}>{tab.song || "Draft"}</p>
                  <p className="text-ide-text-muted truncate min-h-4" title={tab.artist}>{tab.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
};

export default TabsList;
