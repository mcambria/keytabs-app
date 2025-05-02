import { useMemo, useState } from 'react';
import TabEditor from './editor';

function App() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Guitar Tab Editor</h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <TabEditor />
        </div>
      </div>
    </div>
  );
}

export default App; 