import TabEditor from "./components/editor";
import Keybindings from "./components/keybindings";
import TabsList from "./components/tabs-list";

function App() {
  return (
    <div className="min-h-screen bg-ide-bg">
      <div className="flex h-screen">
        <TabsList className="h-full" />
        <div className="flex-1 flex flex-col h-full ">
          <div className="p-4 border-b border-ide-highlight flex-none">
            <h1 className="text-xl font-medium text-ide-text-accent-primary">KeyTabs</h1>
          </div>
          <TabEditor className="flex-1 p-4" />
        </div>
        <Keybindings className="h-full" />
      </div>
    </div>
  );
}

export default App;
