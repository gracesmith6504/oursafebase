import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "react-quill/dist/quill.snow.css";
import { runCacheBuster } from "./lib/cacheBuster";

// Run cache buster before rendering (fixes Safari zombie sessions)
const shouldRender = runCacheBuster();

if (shouldRender) {
  const RENDER_TIMEOUT_MS = 8000;
  const RENDER_FLAG_KEY = 'app_render_attempted';
  
  // Set timeout to force reload if React doesn't render (fixes WhatsApp/iOS stuck loading)
  const timeoutId = setTimeout(() => {
    const attemptedRender = sessionStorage.getItem(RENDER_FLAG_KEY);
    const reloadTimestamp = sessionStorage.getItem(`${RENDER_FLAG_KEY}_timestamp`);
    
    // Prevent infinite reload loops - only reload once every 15 seconds
    if (reloadTimestamp) {
      const timeSinceReload = Date.now() - parseInt(reloadTimestamp, 10);
      if (timeSinceReload < 15000) {
        console.warn('[RenderTimeout] Too soon since last reload, aborting');
        return;
      }
    }
    
    if (!attemptedRender || attemptedRender === 'pending') {
      console.warn('[RenderTimeout] React failed to render, forcing reload');
      sessionStorage.setItem(RENDER_FLAG_KEY, 'reloading');
      sessionStorage.setItem(`${RENDER_FLAG_KEY}_timestamp`, Date.now().toString());
      window.location.reload();
    }
  }, RENDER_TIMEOUT_MS);
  
  // Mark that we're attempting to render
  sessionStorage.setItem(RENDER_FLAG_KEY, 'pending');
  
  // Clear timeout and flag once React successfully renders
  createRoot(document.getElementById("root")!).render(<App />);
  clearTimeout(timeoutId);
  sessionStorage.setItem(RENDER_FLAG_KEY, 'success');
  
  // Register PWA service worker (auto-updates in background)
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    // Defer SW registration until after React renders to not block initial paint
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.warn('[PWA] Service worker registration failed:', err);
      });
    });
  }
  
  // Clean up flag after successful render
  setTimeout(() => {
    sessionStorage.removeItem(RENDER_FLAG_KEY);
  }, 1000);
}
