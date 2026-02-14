import { useEffect, useState } from "react";
import { Range, TabModel } from "../models/tab";
import { useTabStore } from "@/services/tab-store";

export function useEditorState() {
  const { currentTab, currentTabMetadata, saveCurrentTab, deleteCurrentTab, updateTabMetadata } = useTabStore();

  const [model, setModel] = useState(new TabModel(currentTab ?? { id: "", lines: [] }));
  useEffect(() => setModel(new TabModel(currentTab ?? { id: "", lines: [] })), [currentTab]);

  const updateTabLines = () => {
    saveCurrentTab(model.lines);
    setModel(model.clone());
  };

  const [selection, setSelection] = useState(new Range());
  const [initialSelectionPosition, setInitialSelectionPosition] = useState(selection.start);
  const [isEditing, setIsEditing] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [currentTab]);

  const startEditing = () => setIsEditing(true);
  const commitEdit = () => setIsEditing(false);

  return {
    // store data
    currentTab,
    currentTabMetadata,
    deleteCurrentTab,
    updateTabMetadata,
    // model
    model,
    updateTabLines,
    // selection
    selection,
    setSelection,
    initialSelectionPosition,
    setInitialSelectionPosition,
    // editing
    isEditing,
    startEditing,
    commitEdit,
    // focus
    hasFocus,
    setHasFocus,
    // mouse selection
    isSelecting,
    setIsSelecting,
    // delete confirm
    showDeleteConfirm,
    setShowDeleteConfirm,
    // context menu
    contextMenu,
    setContextMenu,
  };
}

export type EditorState = ReturnType<typeof useEditorState>;
