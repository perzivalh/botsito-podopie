import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { ToastProvider } from "./components/ToastProvider.jsx";

const root = createRoot(document.getElementById("root"));
root.render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
