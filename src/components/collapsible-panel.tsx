import React, { useState, useEffect } from "react";
import { useUserStore } from "@/services/user-store";

type CollapsiblePanelProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultWidth?: string;
  collapsedWidth?: string;
  placement: CollapsiblePanelPlacement;
  preferenceKey: "tabsListCollapsed" | "keybindingsCollapsed";
};

export enum CollapsiblePanelPlacement {
  LEFT = "left",
  RIGHT = "right",
}

const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  children,
  className = "",
  defaultWidth = "w-1/5",
  collapsedWidth = "w-12",
  placement,
  preferenceKey,
}) => {
  const { currentUser, updatePreferences } = useUserStore();
  const [isCollapsed, setIsCollapsed] = useState(currentUser.preferences[preferenceKey]);

  useEffect(() => {
    setIsCollapsed(currentUser.preferences[preferenceKey]);
  }, [currentUser.preferences[preferenceKey]]);

  const handleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    updatePreferences({ [preferenceKey]: newCollapsedState });
  };

  const getArrowButton = () => {
    const arrowIcon =
      placement === CollapsiblePanelPlacement.LEFT ? (isCollapsed ? "→" : "←") : isCollapsed ? "←" : "→";

    return (
      <button
        onClick={handleCollapse}
        className="text-ide-text-muted hover:text-ide-text-accent-secondary transition-colors text-3xl"
      >
        {arrowIcon}
      </button>
    );
  };

  return (
    <div
      className={`bg-ide-panel rounded-lg shadow-lg p-4 transition-all duration-200 flex flex-col ${className ?? ""} ${
        isCollapsed ? collapsedWidth : defaultWidth
      }`}
    >
      <div className={`flex items-center mb-4 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {placement === CollapsiblePanelPlacement.RIGHT && getArrowButton()}
        {
          <h2
            className={`text-xl font-semibold text-ide-text-accent-primary transition-opacity duration-200 ${
              isCollapsed ? "hidden" : ""
            }`}
          >
            {title}
          </h2>
        }
        {placement === CollapsiblePanelPlacement.LEFT && getArrowButton()}
      </div>
      {!isCollapsed && children}
    </div>
  );
};

export default CollapsiblePanel;
