import React from "react";

type EditorFooterProps = {
  showDeleteConfirm: boolean;
  onDelete: () => void;
  onExport: () => void;
};

const EditorFooter: React.FC<EditorFooterProps> = ({
  showDeleteConfirm,
  onDelete,
  onExport,
}) => {
  return (
    <div className="flex flex-none justify-end gap-4 ml-4 mr-4">
      <button onClick={onExport}>Export Tab</button>
      <button
        className={`${showDeleteConfirm ? "p-1 bg-ide-text-destructive text-white" : "text-ide-text-destructive"}`}
        onClick={onDelete}
      >
        {showDeleteConfirm ? "Click again to confirm" : "Delete Tab"}
      </button>
    </div>
  );
};

export default EditorFooter;
