import { useEffect, useRef, useState } from "react";
import { Range, TabModel } from "../models/tab";
import { TabEntry, useTabStore } from "@/services/tab-store";

const MAX_HISTORY = 200;
/** Consecutive edits with the same coalesce key within this window are one undo step. */
const COALESCE_MS = 1000;

type Snapshot = { entries: TabEntry[]; selection: Range };

type History = {
  undo: Snapshot[];
  redo: Snapshot[];
  /** Entries as of the last save, i.e. the state the next edit starts from. */
  current: TabEntry[];
  lastKey: string | null;
  lastTime: number;
};

const freshHistory = (model: TabModel): History => ({
  undo: [],
  redo: [],
  current: model.toData().entries,
  lastKey: null,
  lastTime: 0,
});

export function useEditorState() {
  const { currentTab, currentTabMetadata, saveCurrentTab, deleteCurrentTab, updateTabMetadata } = useTabStore();

  const [model, setModel] = useState(() => new TabModel(currentTab));
  useEffect(() => setModel(new TabModel(currentTab)), [currentTab]);

  const [selection, setSelection] = useState(new Range());
  const [initialSelectionPosition, setInitialSelectionPosition] = useState(selection.start);
  const [isEditing, setIsEditing] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Undo history is per tab: App keys the editor by tab id, so switching tabs
  // remounts it and starts a fresh history.
  const history = useRef<History>(freshHistory(model));

  /**
   * Persist the (mutated) model and re-render with a fresh copy, recording the
   * previous state for undo. Edits sharing a `coalesceKey` in quick succession
   * (e.g. typing in one text block) are merged into a single undo step.
   */
  const updateEntries = (coalesceKey?: string) => {
    const h = history.current;
    const now = Date.now();
    const coalesce = coalesceKey !== undefined && coalesceKey === h.lastKey && now - h.lastTime < COALESCE_MS;
    if (!coalesce) {
      h.undo.push({ entries: h.current, selection });
      if (h.undo.length > MAX_HISTORY) h.undo.shift();
    }
    h.redo = [];
    h.lastKey = coalesceKey ?? null;
    h.lastTime = now;

    const next = model.clone();
    h.current = next.toData().entries;
    saveCurrentTab(model.entries);
    setModel(next);
  };

  const restore = (from: Snapshot[], to: Snapshot[]) => {
    const h = history.current;
    const snapshot = from.pop();
    if (!snapshot) return;
    to.push({ entries: h.current, selection });
    h.current = snapshot.entries;
    h.lastKey = null;

    const next = new TabModel({ id: model.id, entries: snapshot.entries });
    saveCurrentTab(next.toData().entries);
    setModel(next);
    setIsEditing(false);
    setSelection(snapshot.selection);
    setInitialSelectionPosition(snapshot.selection.start);
  };

  const undo = () => restore(history.current.undo, history.current.redo);
  const redo = () => restore(history.current.redo, history.current.undo);

  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [currentTab]);

  const startEditing = () => setIsEditing(true);
  const commitEdit = () => setIsEditing(false);

  const setTextEntry = (line: number, text: string) => {
    model.setText(line, text);
    updateEntries(`text:${line}`);
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
    undo,
    redo,
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

