import TabEditor from "./editor/editor";
import Keybindings from "./keybindings/Keybindings";
import TabsList from "./tabs/TabsList";

const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case "Backspace":
      e.preventDefault();
      break;
  }
};

function App() {
  return (
    <div className="min-h-screen p-8 bg-gray-900" onKeyDown={handleKeyDown}>
      <h1 className="text-3xl font-bold mb-8 text-white">KeyTabs</h1>
      <div className="flex gap-8">
        <TabsList />
        <div className="flex-1 bg-gray-800 rounded-lg shadow-lg p-6">
          <TabEditor />
        </div>
        <Keybindings />
      </div>
    </div>
  );
}

export default App;
