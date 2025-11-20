import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "react-quill/dist/quill.snow.css";
import { runCacheBuster } from "./lib/cacheBuster";

// Run cache buster before rendering (fixes Safari zombie sessions)
const shouldRender = runCacheBuster();

if (shouldRender) {
  createRoot(document.getElementById("root")!).render(<App />);
}
