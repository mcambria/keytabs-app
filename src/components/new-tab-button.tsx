export const newTabButton = (setCurrentTab: (id: string | null) => void) => {
  return (
    <button
      onClick={() => {
        const id = crypto.randomUUID();
        // will create if it doesn't exist
        setCurrentTab(id);
      }}
      className="w-full mb-4 px-4 py-2 bg-ide-highlight text-ide-text rounded hover:bg-ide-highlight-hover transition-colors"
    >
      Create New Tab
    </button>
  );
};
