import React from "react";
import CollapsiblePanel from "./collapsible-panel";
import { CollapsiblePanelPlacement } from "./collapsible-panel";
import { useTabStore } from "@/services/tab-store";
import { NewTabButton } from "./new-tab-button";

type TabsListProps = {
  className?: string;
};

const TabsList: React.FC<TabsListProps> = ({ className = "" }) => {
  const { tabList, setCurrentTab, currentTab } = useTabStore();

  return (
    <CollapsiblePanel
      title="My Tabs"
      placement={CollapsiblePanelPlacement.LEFT}
      preferenceKey="tabsListCollapsed"
      className={`p-4 ${className}`}
    >
      <NewTabButton className="flex-none"></NewTabButton>
      {tabList.length === 0 ? (
        <p className="text-sm italic text-gray-300">No tabs saved yet</p>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
          {tabList.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center justify-between p-2 cursor-pointer rounded transition-colors ${
                tab.id === currentTab?.id
                  ? "bg-ide-bg-hover text-ide-text-accent"
                  : "bg-ide-panel hover:bg-ide-bg-hover"
              }`}
              onClick={() => setCurrentTab(tab.id)}
            >
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium truncate ${
                    tab.id === currentTab?.id ? "text-ide-text-accent" : "text-ide-text"
                  }`}
                  title={tab.song || "Draft"}
                >
                  {tab.song || "Draft"}
                </p>
                <p className="text-ide-text-muted truncate min-h-4" title={tab.artist}>
                  {tab.artist}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </CollapsiblePanel>
  );
};

export default TabsList;
