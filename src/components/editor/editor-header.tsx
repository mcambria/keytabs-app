import React from "react";
import { DEFAULT_TUNING } from "../../models/tab";
import { TabMetadata } from "@/services/tab-store";
import ResizingInput from "../resizing-input";
import { TuningInput } from "../tuning-input";

type EditorHeaderProps = {
  tabId: string;
  metadata: TabMetadata | null;
  updateTabMetadata: (id: string, metadata: Partial<TabMetadata>) => void;
  onInteraction?: () => void;
};

const EditorHeader: React.FC<EditorHeaderProps> = ({
  tabId,
  metadata,
  updateTabMetadata,
  onInteraction,
}) => {
  return (
    <div className="flex flex-none justify-between gap-4 mb-2">
      <div className="flex justify-start overflow-hidden">
        <ResizingInput
          type="text"
          value={metadata?.song ?? ""}
          onChange={(e) => {
            updateTabMetadata(tabId, { song: e.target.value });
            onInteraction?.();
          }}
          placeholder="Song"
          minWidth="1rem"
          className="bg-transparent border-none outline-none text-ide-text placeholder-ide-text-muted overflow-x-auto overflow-y-hidden custom-scrollbar"
        />
        <span className="mr-2 ml-2 text-ide-text-muted flex-none">by</span>
        <ResizingInput
          type="text"
          value={metadata?.artist ?? ""}
          onChange={(e) => {
            updateTabMetadata(tabId, { artist: e.target.value });
            onInteraction?.();
          }}
          placeholder="Artist"
          className="bg-transparent border-none outline-none text-ide-text placeholder-ide-text-muted overflow-x-auto overflow-y-hidden custom-scrollbar"
        />
      </div>
      <div className="flex-none">
        <span className="text-ide-text-muted mr-1">Tuning:</span>
        <TuningInput
          value={metadata?.tuning ?? DEFAULT_TUNING}
          onChange={(tuning) => {
            updateTabMetadata(tabId, { tuning: tuning });
            onInteraction?.();
          }}
          className="bg-transparent border-none outline-none text-ide-text"
        />
      </div>
    </div>
  );
};

export default EditorHeader;
