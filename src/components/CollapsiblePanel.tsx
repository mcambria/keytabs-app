import React, { useState } from 'react';

interface CollapsiblePanelProps {
  title: string;
  children: React.ReactNode;
  defaultWidth?: string;
  collapsedWidth?: string;
  placement: CollapsiblePanelPlacement;
}

export enum CollapsiblePanelPlacement {
  LEFT = 'left',
  RIGHT = 'right'
}

const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  children,
  defaultWidth = 'w-64',
  collapsedWidth = 'w-12',
  placement
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getArrowButton = () => {
    const arrowIcon = placement === CollapsiblePanelPlacement.LEFT
      ? (isCollapsed ? '→' : '←')
      : (isCollapsed ? '←' : '→');

    return (
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="text-gray-400 hover:text-white transition-colors"
      >
        {arrowIcon}
      </button>
    );
  };

  return (
    <div className={`bg-gray-800 rounded-lg shadow-lg p-6 transition-all duration-200 ${isCollapsed ? collapsedWidth : defaultWidth}`}>
      <div className={`flex items-center mb-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {placement === CollapsiblePanelPlacement.RIGHT && getArrowButton()}
        {<h2 className={`text-xl font-semibold text-white transition-opacity duration-200 ${isCollapsed ? 'hidden' : ''}`}>
          {title}
        </h2>}
        {placement === CollapsiblePanelPlacement.LEFT && getArrowButton()}
      </div>
      {!isCollapsed && children}
    </div>
  );
};

export default CollapsiblePanel; 