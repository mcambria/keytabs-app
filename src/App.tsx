import TabEditor from "./editor/editor";
import Keybindings from "./keybindings/Keybindings";
import TabsList from "./tabs/TabsList";

function App() {
  return (
    <div className="min-h-screen bg-ide-bg">
      <div className="flex h-screen">
        <TabsList />
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-ide-highlight">
            <h1 className="text-xl font-medium text-ide-text">KeyTabs</h1>
          </div>
          <div className="flex-1 p-4">
            <TabEditor />
          </div>
        </div>
        <Keybindings />
      </div>
    </div>
  );
}

export default App;
