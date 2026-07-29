import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [text, setText] = useState("");

  return (
    <main className="container">
      <div
        contentEditable="true"
        id="textinput"
        className="columns-3 outline-0 border-black border-2"
        onInput={(e) => setText(e.data)}
      >
        {text}
      </div>
      {text}
    </main>
  );
}

export default App;
