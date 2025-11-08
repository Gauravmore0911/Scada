import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import YamlEditor from "./Yamleditor"; // must match the filename exactly
import SectionsView from "./SectionsView";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/yaml-editor" element={<YamlEditor />} />
      <Route path="/sections" element={<SectionsView />} />
    </Routes>
  </BrowserRouter>
);
