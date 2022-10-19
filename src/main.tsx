import React from "react";
import ReactDOM from "react-dom/client";

// import App from "./App";
import PlainTextExample from "./plaintext";
import MarkdownShortcutsExample from "./markdown-shortcuts";
import HoveringMenuExample from "./hovering-toolbar";
// import "./style.css";

// const App = () => {
//   // 创建一个不会在渲染中变化的 Slate 编辑器对象。
//   const [editor] = useState(() => withReact(createEditor()))
//   return null
// }

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MarkdownShortcutsExample />
  </React.StrictMode>
);
