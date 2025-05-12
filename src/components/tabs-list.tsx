import React, { useState, useEffect } from "react";
import CollapsiblePanel from "./collapsible-panel";
import { CollapsiblePanelPlacement } from "./collapsible-panel";
import { TabsListService, TabMetadata } from "../services/tabs-list-service";
import { TabService } from "../services/tab-service";

const TabsList: React.FC = () => {
  const [tabs, setTabs] = useState<TabMetadata[]>([]);

  useEffect(() => {
    // Load tabs on component mount
    setTabs(TabsListService.getTabsList());
  }, []);

  const handleNewTab = () => {
    const id = TabService.createNewTab();
    setTabs(TabsListService.getTabsList());
  };

  const handleDeleteTab = (id: string) => {
    TabService.deleteTab(id);
    setTabs(TabsListService.getTabsList());
  };

  return (
    <CollapsiblePanel title="My Tabs" placement={CollapsiblePanelPlacement.LEFT}>
      <div className="p-4">
        <button
          onClick={handleNewTab}
          className="w-full mb-4 px-4 py-2 bg-ide-highlight text-ide-text rounded hover:bg-ide-highlight-hover transition-colors"
        >
          New Tab
        </button>
        {tabs.length === 0 ? (
          <p className="text-sm italic text-gray-300">No tabs saved yet</p>
        ) : (
          <div className="space-y-2">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center justify-between p-2 bg-ide-bg-hover rounded hover:bg-ide-bg-hover-hover transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ide-text truncate">{tab.song || "Untitled"}</p>
                  <p className="text-xs text-ide-text-muted truncate">{tab.artist || "Unknown Artist"}</p>
                </div>
                <button
                  onClick={() => handleDeleteTab(tab.id)}
                  className="ml-2 p-1 text-ide-text-muted hover:text-ide-text transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
};

export default TabsList;
