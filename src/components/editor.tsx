import React, { useRef } from "react";
import { Position, Range } from "../models/tab";
import { useEditorState } from "@/hooks/use-editor-state";
import { useCursorNavigation } from "@/hooks/use-cursor-navigation";
import { useKeyboardHandlers } from "@/hooks/use-keyboard-handlers";
import StaffLine from "./editor/staff-line";
import TextLine from "./editor/text-line";
import EditorHeader from "./editor/editor-header";
import EditorFooter from "./editor/editor-footer";
import ContextMenu from "./context-menu";

type TabEditorProps = {
  className?: string;
};

const TabEditor: React.FC<TabEditorProps> = ({ className = "" }) => {
  const state = useEditorState();
  const {
    currentTab,
    currentTabMetadata,
    deleteCurrentTab,
    updateTabMetadata,
    model,
    selection,
    setSelection,
    setInitialSelectionPosition,
    isEditing,
    commitEdit,
    hasFocus,
    setHasFocus,
    isSelecting,
    setIsSelecting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    contextMenu,
    setContextMenu,
  } = state;

  const { moveCursor, updateSelectionWithPosition } = useCursorNavigation(state);
  const { handleKeyDown, handleCopySelection, handlePasteSelection } = useKeyboardHandlers(state, moveCursor);

  const editorRef = useRef<HTMLDivElement>(null);

  // event handlers
  const handleFocus = () => {
    setTimeout(() => setHasFocus(true), 100);
  };

  const handleBlur = () => {
    setHasFocus(false);
  };

  const positionFromTarget = (target: HTMLElement): Position | null => {
    const tabCell = target.closest("[data-cell]");
    if (tabCell) {
      const lineIndex = parseInt(tabCell.getAttribute("data-line") || "0");
      const chordIndex = parseInt(tabCell.getAttribute("data-chord") || "0");
      const stringIndex = parseInt(tabCell.getAttribute("data-string") || "0");
      return new Position(lineIndex, chordIndex, stringIndex);
    }

    const textLineParent = target.closest("[data-text-line]");
    if (textLineParent) {
      const lineIndex = parseInt(textLineParent.getAttribute("data-text-line") || "0");
      return new Position(lineIndex, model.lines[lineIndex].length - 1, 0);
    }

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) {
      return;
    }
    commitEdit();
    const clickedPosition = positionFromTarget(e.target as HTMLElement);
    if (!clickedPosition) {
      return;
    }
    if (e.shiftKey) {
      updateSelectionWithPosition(clickedPosition);
    } else {
      setSelection(new Range(clickedPosition));
      setInitialSelectionPosition(clickedPosition);
      setIsSelecting(true);
    }
  };

  const handleMouseOver = (e: React.MouseEvent) => {
    if (e.buttons !== 1) {
      return;
    }
    if (!isSelecting) {
      return;
    }
    const clickedPosition = positionFromTarget(e.target as HTMLElement);
    if (!clickedPosition) {
      return;
    }
    updateSelectionWithPosition(clickedPosition);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 0) {
      return;
    }
    setIsSelecting(false);
  };

  const handleDeleteClick = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    deleteCurrentTab();
    setShowDeleteConfirm(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const clickedPosition = positionFromTarget(e.target as HTMLElement);
    if (!clickedPosition) {
      return;
    }

    if (!selection.contains(clickedPosition)) {
      setSelection(new Range(clickedPosition));
      setInitialSelectionPosition(clickedPosition);
    }

    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleContextMenuCopy = () => {
    editorRef.current?.focus();
    setHasFocus(true);
    setTimeout(() => handleCopySelection(), 0);
    handleContextMenuClose();
  };

  const handleContextMenuPaste = async () => {
    editorRef.current?.focus();
    setHasFocus(true);
    setTimeout(async () => await handlePasteSelection(), 0);
    handleContextMenuClose();
  };

  if (!currentTab) {
    return (
      <div className={`flex flex-col justify-center items-center text-xl ide-text-muted ${className}`}>
        Select a tab! 🎸
      </div>
    );
  }

  return (
    <div className={`flex flex-col justify-between overflow-hidden ${className}`}>
      <EditorHeader
        tabId={currentTab.id}
        metadata={currentTabMetadata}
        updateTabMetadata={updateTabMetadata}
        onInteraction={() => setShowDeleteConfirm(false)}
      />
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden mb-2 text-ide-text custom-scrollbar">
        <div
          ref={editorRef}
          className="inline-block select-none font-mono outline-none"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseDown={handleMouseDown}
          onMouseOver={handleMouseOver}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
        >
          {model.lines.map((tabLine, lineIndex) => {
            if (model.isStaffLine(lineIndex)) {
              return (
                <StaffLine
                  key={lineIndex}
                  lineIndex={lineIndex}
                  tabLine={tabLine}
                  tuning={currentTabMetadata?.tuning ?? []}
                  selection={selection}
                  hasFocus={hasFocus}
                  isEditing={isEditing}
                />
              );
            } else {
              return (
                <TextLine
                  key={lineIndex}
                  lineIndex={lineIndex}
                  tabLine={tabLine}
                  selection={selection}
                  hasFocus={hasFocus}
                />
              );
            }
          })}
        </div>
      </div>
      <EditorFooter
        showDeleteConfirm={showDeleteConfirm}
        onDelete={handleDeleteClick}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleContextMenuClose}
          onCopy={handleContextMenuCopy}
          onPaste={handleContextMenuPaste}
        />
      )}
    </div>
  );
};

export default TabEditor;
