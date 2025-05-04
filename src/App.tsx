import TabEditor from "./editor/editor";
import Keybindings from "./keybindings/Keybindings";
import TabsList from "./tabs/TabsList";

const handleKeyDown = (e: React.KeyboardEvent) => {
  // firefox by default goes back a page when you press backspace outside of an input
// block that
  switch (e.key) {
    case "Backspace":
      e.preventDefault();
      break;
  }
};

function App() {
  return (
    <div className="min-h-screen bg-ide-bg" onKeyDown={handleKeyDown}>
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
