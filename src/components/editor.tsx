import React, { useEffect, useRef } from "react";
import { Position, Range, TabModel } from "../models/tab";
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
    replaceTextBlock,
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---- Block helpers ----------------------------------------------------
  // A "text block" is the contiguous run of text lines around a given line
  // index. One textarea backs the whole block, joined by \n so native Enter
  // splits the block into multiple text lines.

  const findTextBlock = (m: TabModel, lineIndex: number): { start: number; end: number } | null => {
    if (m.isStaffLine(lineIndex)) return null;
    let start = lineIndex;
    while (start > 0 && !m.isStaffLine(start - 1)) start--;
    let end = lineIndex;
    while (end < m.lines.length - 1 && !m.isStaffLine(end + 1)) end++;
    return { start, end };
  };

  // Number of "real" characters on a text line (i.e. chars without the
  // trailing empty chord used to host the end-of-line cursor).
  const textLineLength = (m: TabModel, lineIndex: number): number => {
    const view = m.getLineView(lineIndex);
    return view.kind === "text" ? Math.max(0, view.chars.length - 1) : 0;
  };

  const blockToText = (m: TabModel, block: { start: number; end: number }): string => {
    const out: string[] = [];
    for (let i = block.start; i <= block.end; i++) {
      const view = m.getLineView(i);
      if (view.kind === "text") {
        // chars includes a trailing "" that we drop for the textarea representation
        out.push(view.chars.slice(0, -1).join(""));
      }
    }
    return out.join("\n");
  };

  const positionToOffset = (
    m: TabModel,
    block: { start: number; end: number },
    line: number,
    chord: number
  ): number => {
    let offset = 0;
    for (let i = block.start; i < line; i++) {
      offset += textLineLength(m, i) + 1; // +1 for \n
    }
    return offset + Math.min(chord, textLineLength(m, line));
  };

  const offsetToPosition = (
    text: string,
    block: { start: number; end: number },
    offset: number
  ): { line: number; chord: number } => {
    const lines = text.split("\n");
    let remaining = offset;
    for (let i = 0; i < lines.length; i++) {
      if (remaining <= lines[i].length) {
        return { line: block.start + i, chord: remaining };
      }
      remaining -= lines[i].length + 1;
    }
    const lastIdx = lines.length - 1;
    return { line: block.start + lastIdx, chord: lines[lastIdx].length };
  };

  // Sync the offscreen textarea with the current text block when the
  // cursor is a single position on a text line.
  useEffect(() => {
    const textarea = textareaRef.current;
    const editorDiv = editorRef.current;
    if (!textarea || !editorDiv) return;

    const onTextLine = !model.isStaffLine(selection.start.line);
    const isCursor = selection.isSinglePosition();
    const shouldUseTextarea = onTextLine && isCursor && hasFocus;

    if (shouldUseTextarea) {
      const block = findTextBlock(model, selection.start.line);
      if (block) {
        const text = blockToText(model, block);
        const offset = positionToOffset(model, block, selection.start.line, selection.start.chord);
        if (textarea.value !== text) {
          textarea.value = text;
        }
        if (textarea.selectionStart !== offset || textarea.selectionEnd !== offset) {
          textarea.selectionStart = offset;
          textarea.selectionEnd = offset;
        }
        if (document.activeElement !== textarea) {
          textarea.focus({ preventScroll: true });
        }
      }
    } else if (document.activeElement === textarea) {
      editorDiv.focus({ preventScroll: true });
    }
  }, [selection, model, hasFocus]);

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
    const textarea = e.currentTarget;
    const newText = textarea.value;
    const newOffset = textarea.selectionStart ?? 0;
    const block = findTextBlock(model, selection.start.line);
    if (!block) return;
    replaceTextBlock(block.start, block.end, newText);
    const pos = offsetToPosition(newText, block, newOffset);
    const newPos = new Position(pos.line, pos.chord, 0);
    setSelection(new Range(newPos));
    setInitialSelectionPosition(newPos);
  };

  const handleTextLinePaste = async () => {
    const text = await navigator.clipboard.readText();
    if (!text) return;
    try {
      const clipboardData = JSON.parse(text);
      if (clipboardData.isNative && clipboardData.lines) {
        model.insertContent(selection, clipboardData.lines, clipboardData.wholeLines);
        state.updateTabLines();
        return;
      }
    } catch {}
    const block = findTextBlock(model, selection.start.line);
    if (!block) return;
    const blockText = blockToText(model, block);
    const offset = positionToOffset(model, block, selection.start.line, selection.start.chord);
    const newText = blockText.slice(0, offset) + text + blockText.slice(offset);
    const newOffset = offset + text.length;
    replaceTextBlock(block.start, block.end, newText);
    const pos = offsetToPosition(newText, block, newOffset);
    const newPos = new Position(pos.line, pos.chord, 0);
    setSelection(new Range(newPos));
    setInitialSelectionPosition(newPos);
  };

  // Update both the textarea selection AND React state synchronously so the
  // visual cursor moves on the same frame as the keypress (no rAF latency).
  const moveTextareaCursor = (newOffset: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const block = findTextBlock(model, selection.start.line);
    if (!block) return;
    const clamped = Math.max(0, Math.min(textarea.value.length, newOffset));
    textarea.selectionStart = clamped;
    textarea.selectionEnd = clamped;
    const pos = offsetToPosition(textarea.value, block, clamped);
    const newPos = new Position(pos.line, pos.chord, 0);
    setSelection(new Range(newPos));
    setInitialSelectionPosition(newPos);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    const textarea = textareaRef.current;
    switch (e.key) {
      case 'ArrowLeft': {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleKeyDown(e as unknown as React.KeyboardEvent);
          break;
        }
        if (!textarea) break;
        e.preventDefault();
        moveTextareaCursor((textarea.selectionStart ?? 0) - 1);
        break;
      }
      case 'ArrowRight': {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleKeyDown(e as unknown as React.KeyboardEvent);
          break;
        }
        if (!textarea) break;
        e.preventDefault();
        moveTextareaCursor((textarea.selectionStart ?? 0) + 1);
        break;
      }
      case 'Home': {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleKeyDown(e as unknown as React.KeyboardEvent);
          break;
        }
        if (!textarea) break;
        e.preventDefault();
        const offset = textarea.selectionStart ?? 0;
        const lastNl = textarea.value.lastIndexOf('\n', offset - 1);
        moveTextareaCursor(lastNl === -1 ? 0 : lastNl + 1);
        break;
      }
      case 'End': {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleKeyDown(e as unknown as React.KeyboardEvent);
          break;
        }
        if (!textarea) break;
        e.preventDefault();
        const offset = textarea.selectionStart ?? 0;
        const nextNl = textarea.value.indexOf('\n', offset);
        moveTextareaCursor(nextNl === -1 ? textarea.value.length : nextNl);
        break;
      }
      case 'ArrowUp': {
        if (e.shiftKey) {
          e.preventDefault();
          handleKeyDown(e as unknown as React.KeyboardEvent);
          break;
        }
        if (!textarea) break;
        const offset = textarea.selectionStart ?? 0;
        const onFirstLineOfBlock = !textarea.value.slice(0, offset).includes('\n');
        if (onFirstLineOfBlock) {
          // At top of block — delegate to editor navigation (moves to prev staff line)
          e.preventDefault();
          handleKeyDown(e as unknown as React.KeyboardEvent);
        }
        // Otherwise let textarea move natively; rAF below syncs state
        else {
          e.preventDefault();
          const before = textarea.value.slice(0, offset);
          const currentLineStart = before.lastIndexOf('\n') + 1;
          const column = offset - currentLineStart;
          const prevLineEnd = currentLineStart - 1; // index of the \n before current line
          const prevLineStart = textarea.value.lastIndexOf('\n', prevLineEnd - 1) + 1;
          const prevLineLen = prevLineEnd - prevLineStart;
          moveTextareaCursor(prevLineStart + Math.min(column, prevLineLen));
        }
        break;
      }
      case 'ArrowDown': {
        if (e.shiftKey) {
          e.preventDefault();
          handleKeyDown(e as unknown as React.KeyboardEvent);
          break;
        }
        if (!textarea) break;
        const offset = textarea.selectionStart ?? 0;
        const onLastLineOfBlock = !textarea.value.slice(offset).includes('\n');
        if (onLastLineOfBlock) {
          e.preventDefault();
          handleKeyDown(e as unknown as React.KeyboardEvent);
        } else {
          e.preventDefault();
          const before = textarea.value.slice(0, offset);
          const currentLineStart = before.lastIndexOf('\n') + 1;
          const column = offset - currentLineStart;
          const nextLineStart = textarea.value.indexOf('\n', offset) + 1;
          const nextNl = textarea.value.indexOf('\n', nextLineStart);
          const nextLineLen = (nextNl === -1 ? textarea.value.length : nextNl) - nextLineStart;
          moveTextareaCursor(nextLineStart + Math.min(column, nextLineLen));
        }
        break;
      }
      case 'Tab':
        e.preventDefault();
        break;
      case 'Escape':
        e.preventDefault();
        editorRef.current?.focus();
        break;
      default:
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
          e.preventDefault();
          handleKeyDown(e as unknown as React.KeyboardEvent);
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          e.preventDefault();
          handleKeyDown(e as unknown as React.KeyboardEvent);
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
          e.preventDefault();
          handleTextLinePaste();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'Backspace') {
          e.preventDefault();
          handleKeyDown(e as unknown as React.KeyboardEvent);
        }
        // Plain Enter, Backspace, Delete, typing: let textarea handle.
        // onChange will fire and sync the new value/cursor to the model.
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
          onBlur={handleBlur as React.FocusEventHandler<HTMLDivElement>}
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
                  isTextCursor={selection.isSinglePosition() && hasFocus}
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

      {/* offscreen textarea captures native text input for text lines */}
      <textarea
        ref={textareaRef}
        tabIndex={-1}
        aria-hidden="true"
        wrap="off"
        style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        onChange={handleTextareaInput}
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
