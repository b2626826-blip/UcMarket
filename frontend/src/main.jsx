import React from "react";
import ReactDOM from "react-dom/client";
import "./assets/styles/theme.css";
import "./assets/styles/base.css";
import App from "./App.jsx";

// ponytail: suppress known harmless console noise from Firebase popup / browser extensions.
// These do not affect OAuth login. Remove if you need to debug popups or extensions.
const originalWarn = console.warn;
const originalError = console.error;
const suppressed = [
  "Cross-Origin-Opener-Policy",
  "window.closed",
  "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received",
];
function shouldSuppress(args) {
  const text = args
    .map((a) => (typeof a === "string" ? a : a instanceof Error ? a.message : ""))
    .join(" ");
  return suppressed.some((msg) => text.includes(msg));
}
console.warn = (...args) => { if (!shouldSuppress(args)) originalWarn.apply(console, args); };
console.error = (...args) => { if (!shouldSuppress(args)) originalError.apply(console, args); };

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);