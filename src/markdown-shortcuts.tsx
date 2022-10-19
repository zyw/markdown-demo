import React, { useCallback, useMemo,useState } from 'react'
import {
  createEditor,
  Descendant,
  Editor,
  Element as SlateElement,
  Node as SlateNode,
  Point,
  Range,
  Transforms,
} from 'slate'
import { withHistory } from 'slate-history'
import { Editable, ReactEditor, Slate, withReact } from 'slate-react'
import { appWindow } from '@tauri-apps/api/window'
import { BulletedListElement } from './custom-types'

const SHORTCUTS = {
  '*': 'list-item',
  '-': 'list-item',
  '+': 'list-item',
  '>': 'block-quote',
  '#': 'heading-one',
  '##': 'heading-two',
  '###': 'heading-three',
  '####': 'heading-four',
  '#####': 'heading-five',
  '######': 'heading-six',
}

type Compare<T, U> = (a: T, b: U) => boolean;

function findKey<T, U extends T[keyof T]>(
    record: T,
    value: U,
    compare: Compare<T[keyof T], U> = (a, b) => a === b
   ): keyof T | undefined {
     return (Object.keys(record) as Array<keyof T>).find(k =>
      compare(record[k], value)
     );
   }
// 定义一个参数为 value 返回值是Markdown的序列化函数。
const serialize = value => {
    
    return (value.map(n => {
        let markdownFlag:any = ""
        if(n.type === "bulleted-list") {
            markdownFlag = "*"
        } else {
            markdownFlag = findKey(SHORTCUTS,n.type)
        }
        
        return ((!markdownFlag) ? SlateNode.string(n) : markdownFlag + " " + SlateNode.string(n))
    }).join('\n'))
}

// 定义一个参数是字符串返回值是 `value` 的反序列化函数
const deserialize = string => {
    // 分隔字符串，返回一个包含value的child数组。
    return string.split('\n').map(line => {
        const beforeText = line.split(' ')[0]
        let type = SHORTCUTS[beforeText]
        let text = ""
        if(!type) {
            type = 'paragraph'
            text = line
        } else {
            text = line.slice(beforeText.length + 1)
        }
      return {
        type: type,
        children: [{ text: text }],
      }
    })
  }
let editor:any = null
const MarkdownShortcutsExample = () => {

  const renderElement = useCallback(props => <Element {...props} />, [])

  editor = useMemo(
    () => withShortcuts(withReact(withHistory(createEditor()))),
    []
  )

  const [initialValue,setValue] = useState(
    deserialize(localStorage.getItem('content')) || [
    {
      type: 'paragraph',
      children: [
        {
          text:
            'The editor gives you full control over the logic you can add. For example, it\'s fairly common to want to add markdown-like shortcuts to editors. So that, when you start a line with "> " you get a blockquote that looks like this:',
        },
      ],
    },
    {
      type: 'block-quote',
      children: [{ text: 'A wise quote.' }],
    },
    {
      type: 'paragraph',
      children: [
        {
          text:
            'Order when you start a line with "## " you get a level-two heading, like this:',
        },
      ],
    },
    {
      type: 'heading-two',
      children: [{ text: 'Try it out!' }],
    },
    {
      type: 'paragraph',
      children: [
        {
          text:
            'Try it out for yourself! Try starting a new line with ">", "-", or "#"s.',
        },
      ],
    },
  ])

  // 回车时调用，输入和删除时也调用
  const handleDOMBeforeInput = useCallback((e: InputEvent) => {
    console.log("handleDOMBeforeInput====================1");
    
    queueMicrotask(() => {
        console.log("handleDOMBeforeInput-queueMicrotask====================2");
      const pendingDiffs = ReactEditor.androidPendingDiffs(editor)

      const scheduleFlush = pendingDiffs?.some(({ diff, path }) => {
        if (!diff.text.endsWith(' ')) {
          return false
        }

        const { text } = SlateNode.leaf(editor, path)
        const beforeText = text.slice(0, diff.start) + diff.text.slice(0, -1)
        if (!(beforeText in SHORTCUTS)) {
          return
        }

        const blockEntry = Editor.above(editor, {
          at: path,
          match: n => Editor.isBlock(editor, n),
        })
        if (!blockEntry) {
          return false
        }

        const [, blockPath] = blockEntry
        return Editor.isStart(editor, Editor.start(editor, path), blockPath)
      })

      if (scheduleFlush) {
        ReactEditor.androidScheduleFlush(editor)
      }
    })
  }, [])

  return (
    <Slate editor={editor} value={initialValue} onChange={val => {
        
        setValue(val)
        // console.log("value----", serialize(val));
        // 序列化 `value` 并将产生的字符串保存到 Local Storage。
        localStorage.setItem('content', serialize(val))
    }}>
      <Editable
        onDOMBeforeInput={handleDOMBeforeInput}
        renderElement={renderElement}
        placeholder="Write some markdown..."
        spellCheck
        autoFocus
      />
    </Slate>
  )
}

// 添加后端（Rust）事件  
const unlisten = appWindow.listen("test-event",(event) => {
    console.log(event.payload.message);
    const { insertText } = editor
    insertText(event.payload.message)
})

const withShortcuts = editor => {
  const { deleteBackward, insertText } = editor

  console.log("withShortcuts:-----------1");
  // 编辑器插入内容时调用
  editor.insertText = text => {
    console.log("withShortcuts:-----------2");
    const { selection } = editor

    if (text.endsWith(' ') && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection
      const block = Editor.above(editor, {
        match: n => Editor.isBlock(editor, n),
      })
      const path = block ? block[1] : []
      const start = Editor.start(editor, path)
      const range = { anchor, focus: start }
      const beforeText = Editor.string(editor, range) + text.slice(0, -1)
      const type = SHORTCUTS[beforeText]

      console.log("type:-----------", type);

      if (type) {
        Transforms.select(editor, range)

        if (!Range.isCollapsed(range)) {
          Transforms.delete(editor)
        }

        const newProperties: Partial<SlateElement> = {
          type,
        }
        Transforms.setNodes<SlateElement>(editor, newProperties, {
          match: n => Editor.isBlock(editor, n),
        })

        if (type === 'list-item') {
          const list: BulletedListElement = {
            type: 'bulleted-list',
            children: [],
          }
          Transforms.wrapNodes(editor, list, {
            match: n =>
              !Editor.isEditor(n) &&
              SlateElement.isElement(n) &&
              n.type === 'list-item',
          })
        }

        return
      }
    }

    insertText(text)
  }
  // 编辑器删除内容时调用
  editor.deleteBackward = (...args) => {
    const { selection } = editor
    console.log("deleteBackward====================1");
    if (selection && Range.isCollapsed(selection)) {
      const match = Editor.above(editor, {
        match: n => Editor.isBlock(editor, n),
      })

      if (match) {
        const [block, path] = match
        const start = Editor.start(editor, path)

        if (
          !Editor.isEditor(block) &&
          SlateElement.isElement(block) &&
          block.type !== 'paragraph' &&
          Point.equals(selection.anchor, start)
        ) {
          const newProperties: Partial<SlateElement> = {
            type: 'paragraph',
          }
          Transforms.setNodes(editor, newProperties)

          if (block.type === 'list-item') {
            Transforms.unwrapNodes(editor, {
              match: n =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                n.type === 'bulleted-list',
              split: true,
            })
          }

          return
        }
      }

      deleteBackward(...args)
    }
  }

  return editor
}

const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case 'block-quote':
      return <blockquote {...attributes}>{children}</blockquote>
    case 'bulleted-list':
      return <ul {...attributes}>{children}</ul>
    case 'heading-one':
      return <h1 {...attributes}>{children}</h1>
    case 'heading-two':
      return <h2 {...attributes}>{children}</h2>
    case 'heading-three':
      return <h3 {...attributes}>{children}</h3>
    case 'heading-four':
      return <h4 {...attributes}>{children}</h4>
    case 'heading-five':
      return <h5 {...attributes}>{children}</h5>
    case 'heading-six':
      return <h6 {...attributes}>{children}</h6>
    case 'list-item':
      return <li {...attributes}>{children}</li>
    default:
      return <p {...attributes}>{children}</p>
  }
}

export default MarkdownShortcutsExample