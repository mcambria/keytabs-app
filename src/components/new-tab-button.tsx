import { useTabStore } from "@/services/tab-store";
import { ClassNameProp } from "./ClassNameProp";

type NewTabButtonProps = ClassNameProp;

export const NewTabButton: React.FC<NewTabButtonProps> = ({
  className = "",
}) => {

  const { setCurrentTab } = useTabStore();
  return (
    <button
      onClick={() => {
        const id = crypto.randomUUID();
        // will create if it doesn't exist
        setCurrentTab(id);
      }}
      className={`w-full mb-4 px-4 py-2 bg-ide-highlight text-ide-text rounded hover:bg-ide-highlight-hover transition-colors ${className}`}
    >
      Create New Tab
    </button>
  );
};
