import { useEffect, useState } from "react";
import { Range, TabModel } from "../models/tab";
import { useTabStore } from "@/services/tab-store";

export function useEditorState() {
  const { currentTab, currentTabMetadata, saveCurrentTab, deleteCurrentTab, updateTabMetadata } = useTabStore();

  const [model, setModel] = useState(() => new TabModel(currentTab));
  useEffect(() => setModel(new TabModel(currentTab)), [currentTab]);

  /** Persist the (mutated) model and re-render with a fresh copy. */
  const updateEntries = () => {
    saveCurrentTab(model.entries);
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

  const setTextEntry = (line: number, text: string) => {
    model.setText(line, text);
    updateEntries();
  };

  return {
    // store data
    currentTab,
    currentTabMetadata,
    deleteCurrentTab,
    updateTabMetadata,
    // model
    model,
    updateEntries,
    // selection
    selection,
    setSelection,
    initialSelectionPosition,
    setInitialSelectionPosition,
    // editing
    isEditing,
    startEditing,
    commitEdit,
    setTextEntry,
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
