import { useMemo, useState } from 'react';
import TabEditor from './editor/editor';

const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case "Backspace":
      e.preventDefault();
      break;
  }
}

function App() {
  return (
    <div className="min-h-screen p-8 bg-gray-900" onKeyDown={handleKeyDown}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-white">KeyTabs</h1>
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <TabEditor />
        </div>
      </div>
    </div>
  );
}

export default App; 