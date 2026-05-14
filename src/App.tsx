import TabEditor from "./components/editor";
import EditorErrorBoundary from "./components/error-boundary";
import Keybindings from "./components/keybindings";
import TabsList from "./components/tabs-list";
import { useTabStore } from "./services/tab-store";

function App() {
  const currentTabId = useTabStore((state) => state.currentTab?.id);
  return (
    <div className="flex h-screen w-screen bg-ide-b overflow-hidden">
      <TabsList className="h-full flex-none" />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-ide-highlight flex-none flex space-x-4">
          <h1 className="text-xl font-medium text-ide-text-accent-primary">KeyTabs</h1>
          <div className="bg-ide-text-destructive/10 text-ide-text-destructive text-sm px-2 py-1 rounded mb-2 inline-block">
            ⚠️ Under Development - Your tabs may be deleted
          </div>
        </div>
        <EditorErrorBoundary key={currentTabId ?? "no-tab"}>
          <TabEditor className="flex-1 p-4" />
        </EditorErrorBoundary>
      </div>
      <Keybindings className="h-full flex-none" />
    </div>
  );
}

export default App;
