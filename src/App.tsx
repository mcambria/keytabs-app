import { useMemo, useState } from 'react';
import { createEditor, Descendant } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import { CustomElement } from './types';

const initialValue: CustomElement[] = [
  {
    type: 'paragraph',
    children: [{ text: 'e|-----------------' }],
  },
  {
    type: 'paragraph',
    children: [{ text: 'B|-----------------' }],
  },
  {
    type: 'paragraph',
    children: [{ text: 'G|-----------------' }],
  },
  {
    type: 'paragraph',
    children: [{ text: 'D|-----------------' }],
  },
  {
    type: 'paragraph',
    children: [{ text: 'A|-----------------' }],
  },
  {
    type: 'paragraph',
    children: [{ text: 'E|-----------------' }],
  },
];

function App() {
  const [editor] = useState(() => withHistory(withReact(createEditor())));
  const [value, setValue] = useState<CustomElement[]>(initialValue);

  const renderElement = useMemo(() => (props: any) => {
    const { attributes, children, element } = props;
    switch (element.type) {
      case 'paragraph':
        return (
          <p {...attributes} className="font-mono text-lg leading-8">
            {children}
          </p>
        );
      default:
        return <p {...attributes}>{children}</p>;
    }
  }, []);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Guitar Tab Editor</h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Slate
            editor={editor}
            value={value}
            onChange={newValue => setValue(newValue as CustomElement[])}
          >
            <Editable
              renderElement={renderElement}
              placeholder="Start writing your tab..."
              className="min-h-[300px] focus:outline-none"
            />
          </Slate>
        </div>
      </div>
    </div>
  );
}

export default App; 