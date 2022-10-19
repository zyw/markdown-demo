import React, { useMemo, useState } from 'react'
import { createEditor, Descendant } from 'slate'
import { Slate, Editable, withReact } from 'slate-react'
import { withHistory } from 'slate-history'


const PlainTextExample = () => {
    const editor = useMemo(() => withHistory(withReact(createEditor())), [])
    const [initialValue,setValue] = useState([
        {
          type: 'paragraph',
          children: [
            { text: 'This is editable plain text, just like a <textarea>!' },
          ],
        },
      ])
    return (
      <Slate editor={editor} value={initialValue} onChange={val => {
        setValue(val)

        // Save the value to Local Storage.
        const content = JSON.stringify(val)
        localStorage.setItem('content', content)
      }}>
        <div>
        <button
          onMouseDown={event => {
            event.preventDefault()
            console.log("dddddddddddddddddd");
            
          }}
        >
          Bold 
        </button>
        <button
          onMouseDown={event => {
            event.preventDefault()
            console.log("222222222222222222222");
          }}
        >
          Code Block
        </button>
      </div>
        <Editable placeholder="Enter some plain text..." />
      </Slate>
    )
  }
  
  export default PlainTextExample
