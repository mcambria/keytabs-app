import React, { useEffect, useRef } from "react";
import { DEFAULT_TUNING, Position, Range, rowBounds, rowColFromOffset, rowCount } from "../models/tab";
import { useEditorState } from "@/hooks/use-editor-state";
import { useCursorNavigation } from "@/hooks/use-cursor-navigation";
import { useKeyboardHandlers } from "@/hooks/use-keyboard-handlers";
import StaffLine from "./editor/staff-line";
import TextBlock from "./editor/text-block";
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
    initialSelectionPosition,
    setInitialSelectionPosition,
    isEditing,
    commitEdit,
    setTextEntry,
    hasFocus,
    setHasFocus,
    isSelecting,
    setIsSelecting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    contextMenu,
    setContextMenu,
  } = state;

  const { moveCursor, setCursor, updateSelectionWithPosition } = useCursorNavigation(state);
  const { handleKeyDown, handleCopySelection, handlePasteSelection } = useKeyboardHandlers(
    state,
    moveCursor,
    setCursor,
    updateSelectionWithPosition
  );

  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The text entry the hidden textarea is editing: set whenever the selection
  // (cursor or range) lies inside a single text entry.
  const textareaLine = model.isTextRange(selection) ? selection.start.line : null;

  // Sync the offscreen textarea's value and selection with the model.
  useEffect(() => {
    const textarea = textareaRef.current;
    const editorDiv = editorRef.current;
    if (!textarea || !editorDiv) return;

    if (textareaLine !== null && hasFocus) {
      const text = model.getText(textareaLine);
      if (textarea.value !== text) {
        textarea.value = text;
      }
      const { start, end } = selection;
      const backward =
        !selection.isSinglePosition() &&
        initialSelectionPosition.line === textareaLine &&
        initialSelectionPosition.chord === end.chord;
      if (textarea.selectionStart !== start.chord || textarea.selectionEnd !== end.chord) {
        textarea.setSelectionRange(start.chord, end.chord, backward ? "backward" : "forward");
      }
      if (document.activeElement !== textarea) {
        textarea.focus({ preventScroll: true });
      }
    } else if (document.activeElement === textarea) {
      editorDiv.focus({ preventScroll: true });
    }
  }, [selection, initialSelectionPosition, model, hasFocus, textareaLine]);

  // event handlers
  const handleFocus = () => {
    setTimeout(() => setHasFocus(true), 100);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (e.relatedTarget === textareaRef.current) return;
    setHasFocus(false);
  };

  const handleTextareaFocus = () => {
    setHasFocus(true);
  };

  const handleTextareaBlur = (e: React.FocusEvent) => {
    if (e.relatedTarget === editorRef.current) return;
    setHasFocus(false);
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    if (textareaLine === null) return;
    const textarea = e.currentTarget;
    setTextEntry(textareaLine, textarea.value);
    setCursor(new Position(textareaLine, textarea.selectionStart ?? 0, 0));
  };

  // Mirror native textarea selection changes (Shift+Arrows, Shift+Home/End,
  // word selection, ...) into the editor selection.
  const handleTextareaSelect = () => {
    const textarea = textareaRef.current;
    if (!textarea || textareaLine === null || textarea.value !== model.getText(textareaLine)) return;
    const { selectionStart: start, selectionEnd: end, selectionDirection } = textarea;
    if (start === selection.start.chord && end === selection.end.chord) return;
    const anchor = selectionDirection === "backward" ? end : start;
    setSelection(new Range(new Position(textareaLine, start, 0), new Position(textareaLine, end, 0)));
    setInitialSelectionPosition(new Position(textareaLine, anchor, 0));
  };

  // Move the textarea cursor and editor state together so the visual cursor
  // moves on the same frame as the keypress.
  const moveTextareaCursor = (newOffset: number) => {
    const textarea = textareaRef.current;
    if (!textarea || textareaLine === null) return;
    const clamped = Math.max(0, Math.min(textarea.value.length, newOffset));
    textarea.setSelectionRange(clamped, clamped);
    setCursor(new Position(textareaLine, clamped, 0));
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    const textarea = textareaRef.current;
    if (!textarea) return;
    const delegate = () => {
      e.preventDefault();
      handleKeyDown(e as unknown as React.KeyboardEvent);
    };
    const { selectionStart, selectionEnd, selectionDirection, value } = textarea;
    const hasRange = selectionStart !== selectionEnd;
    // the moving end of the selection
    const focusOffset = selectionDirection === "backward" ? selectionStart : selectionEnd;
    const ctrl = e.ctrlKey || e.metaKey;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowRight": {
        if (ctrl) return delegate();
        if (e.shiftKey) return; // native selection, mirrored by onSelect
        e.preventDefault();
        if (hasRange) {
          moveTextareaCursor(e.key === "ArrowLeft" ? selectionStart : selectionEnd);
        } else {
          moveTextareaCursor(selectionStart + (e.key === "ArrowLeft" ? -1 : 1));
        }
        break;
      }
      case "Home":
      case "End": {
        if (ctrl) return delegate();
        if (e.shiftKey) return; // native
        e.preventDefault();
        const { start, end } = rowBounds(value, rowColFromOffset(value, focusOffset).row);
        moveTextareaCursor(e.key === "Home" ? start : end);
        break;
      }
      case "ArrowUp":
      case "ArrowDown": {
        if (ctrl) return delegate();
        const up = e.key === "ArrowUp";
        const from = e.shiftKey ? focusOffset : up ? selectionStart : selectionEnd;
        const { row, col } = rowColFromOffset(value, from);
        const atEdge = up ? row === 0 : row === rowCount(value) - 1;
        if (atEdge) {
          // leave the block: editor navigation moves to the neighbouring
          // staff, or with Shift snaps the selection to whole entries
          if (!e.shiftKey && hasRange) {
            setCursor(new Position(textareaLine ?? 0, from, 0));
          }
          return delegate();
        }
        if (e.shiftKey) return; // native
        e.preventDefault();
        const { start, end } = rowBounds(value, row + (up ? -1 : 1));
        moveTextareaCursor(start + Math.min(col, end - start));
        break;
      }
      case "Tab":
        e.preventDefault();
        break;
      case "Escape":
        e.preventDefault();
        editorRef.current?.focus();
        break;
      default:
        if (ctrl && e.key.toLowerCase() === "v") {
          e.preventDefault();
          handlePasteSelection();
        } else if (
          (ctrl && ["a", "c", "i"].includes(e.key.toLowerCase())) ||
          (ctrl && ["Backspace", "Enter"].includes(e.key))
        ) {
          delegate();
        }
        // Plain Enter, Backspace, Delete, typing: let the textarea handle it;
        // onChange syncs the new value and cursor to the model.
        break;
    }
  };

  const positionFromTarget = (target: HTMLElement): Position | null => {
    const tabCell = target.closest("[data-cell]");
    if (tabCell) {
      const lineIndex = parseInt(tabCell.getAttribute("data-line") || "0");
      const chordIndex = parseInt(tabCell.getAttribute("data-chord") || "0");
      const stringIndex = parseInt(tabCell.getAttribute("data-string") || "0");
      return new Position(lineIndex, chordIndex, stringIndex);
    }

    // clicks past the end of a text row land at the end of that row
    const textRow = target.closest("[data-text-row]");
    if (textRow) {
      const lineIndex = parseInt(textRow.getAttribute("data-line") || "0");
      const rowEnd = parseInt(textRow.getAttribute("data-row-end") || "0");
      return new Position(lineIndex, rowEnd, 0);
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
    // Handle focus ourselves: the browser's default mousedown focus runs after
    // React has already rendered (and focused the textarea for text entries),
    // and would steal focus back to the editor div.
    e.preventDefault();
    if (!model.isText(clickedPosition.line)) {
      editorRef.current?.focus({ preventScroll: true });
    }
    setHasFocus(true);
    if (e.shiftKey) {
      updateSelectionWithPosition(clickedPosition);
    } else {
      setCursor(clickedPosition);
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

  const handleExportClick = () => {
    setShowDeleteConfirm(false);
    const song = currentTabMetadata?.song?.trim() ?? "";
    const artist = currentTabMetadata?.artist?.trim() ?? "";
    const tuning = currentTabMetadata?.tuning ?? DEFAULT_TUNING;

    const header: string[] = [];
    const title = [song, artist].filter(Boolean).join(" - ");
    if (title) header.push(title);
    // tuning is stored high-to-low; conventionally written low-to-high
    header.push(`Tuning: ${[...tuning].reverse().join(" ")}`);

    const text = `${header.join("\n")}\n\n${model.toPlainText(tuning)}`;

    const fileName =
      (title || "tab").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim() + ".txt";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const clickedPosition = positionFromTarget(e.target as HTMLElement);
    if (!clickedPosition) {
      return;
    }

    if (!model.rangeContains(selection, clickedPosition)) {
      setCursor(clickedPosition);
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
          className="inline-block select-none font-mono outline-hidden"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur as React.FocusEventHandler<HTMLDivElement>}
          onMouseDown={handleMouseDown}
          onMouseOver={handleMouseOver}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
        >
          {model.entries.map((entry, lineIndex) =>
            typeof entry === "string" ? (
              <TextBlock
                key={lineIndex}
                lineIndex={lineIndex}
                text={entry}
                selection={selection}
                isSelected={(position) => model.rangeContains(selection, position)}
                hasFocus={hasFocus}
              />
            ) : (
              <StaffLine
                key={lineIndex}
                lineIndex={lineIndex}
                tabLine={entry}
                tuning={currentTabMetadata?.tuning ?? []}
                selection={selection}
                hasFocus={hasFocus}
                isEditing={isEditing}
              />
            )
          )}
        </div>
      </div>
      <EditorFooter
        showDeleteConfirm={showDeleteConfirm}
        onDelete={handleDeleteClick}
        onExport={handleExportClick}
      />

      {/* offscreen textarea captures native text input and selection for text entries */}
      <textarea
        ref={textareaRef}
        tabIndex={-1}
        aria-hidden="true"
        wrap="off"
        style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        onChange={handleTextareaInput}
        onSelect={handleTextareaSelect}
        onKeyDown={handleTextareaKeyDown}
        onFocus={handleTextareaFocus}
        onBlur={handleTextareaBlur as React.FocusEventHandler<HTMLTextAreaElement>}
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
