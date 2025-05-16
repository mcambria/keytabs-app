import React from "react";
import CollapsiblePanel from "./collapsible-panel";
import { CollapsiblePanelPlacement } from "./collapsible-panel";
import { useTabStore } from "@/services/use-tabs";

const TabsList: React.FC = () => {
  const { tabList, setCurrentTabId, createTabMetadata, deleteTabMetadata: deleteTab } = useTabStore();

  return (
    <CollapsiblePanel title="My Tabs" placement={CollapsiblePanelPlacement.LEFT}>
      <div className="p-4">
        <button
          onClick={() => {
            createTabMetadata();
          }}
          className="w-full mb-4 px-4 py-2 bg-ide-highlight text-ide-text rounded hover:bg-ide-highlight-hover transition-colors"
        >
          New Tab
        </button>
        {tabList.length === 0 ? (
          <p className="text-sm italic text-gray-300">No tabs saved yet</p>
        ) : (
          <div className="space-y-2">
            {tabList.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center justify-between p-2 bg-ide-bg-hover rounded hover:bg-ide-bg-hover-hover transition-colors"
                onClick={() => setCurrentTabId(tab.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ide-text truncate">{tab.song || "Draft"}</p>
                  <p className="text-xs text-ide-text-muted truncate">{tab.artist}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    deleteTab(tab.id);
                  }}
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
