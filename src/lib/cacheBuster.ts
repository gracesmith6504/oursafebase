// Version-based cache busting to prevent Safari from using stale bundles/storage
const APP_VERSION = "1.0.1"; // Increment this when deploying fixes
const VERSION_KEY = "app_version";
const RELOAD_FLAG_KEY = "cache_cleared_flag";
const RELOAD_FLAG_EXPIRY_MS = 5000; // 5 seconds to prevent reload loops

export const runCacheBuster = (): boolean => {
  try {
    // Detect iOS WebKit (Safari, Chrome on iOS, in-app browsers)
    const isIOSWebKit = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isIOSSafari = isIOSWebKit && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);
    const isIOSChrome = isIOSWebKit && /CriOS/.test(navigator.userAgent);
    
    if (isIOSWebKit) {
      console.log('[CacheBuster] iOS WebKit detected:', {
        safari: isIOSSafari,
        chrome: isIOSChrome,
        userAgent: navigator.userAgent.substring(0, 50)
      });
    }
    
    // Skip cache busting on ANY auth callback with hash parameters
    // This includes OAuth, password reset, and email confirmation
    const hasHashParams = window.location.hash.length > 1;
    const isAuthCallback = hasHashParams && (
      window.location.hash.includes('access_token') || 
      window.location.hash.includes('refresh_token') ||
      window.location.hash.includes('type=')
    );
    
    if (isAuthCallback) {
      console.log('[CacheBuster] Skipping cache bust for auth callback');
      return true; // Allow app to render normally
    }

    // Check if we just cleared cache (prevent reload loops)
    const reloadFlag = localStorage.getItem(RELOAD_FLAG_KEY);
    if (reloadFlag) {
      const flagTime = parseInt(reloadFlag, 10);
      if (Date.now() - flagTime < RELOAD_FLAG_EXPIRY_MS) {
        // We just reloaded, clean up flag and continue
        localStorage.removeItem(RELOAD_FLAG_KEY);
        return true;
      }
    }

    const storedVersion = localStorage.getItem(VERSION_KEY);
    
    if (storedVersion !== APP_VERSION) {
      console.log(`[CacheBuster] Version change detected: ${storedVersion} → ${APP_VERSION}. Clearing cache...`);
      
      // iOS WebKit specific logging
      if (isIOSWebKit) {
        console.log('[CacheBuster] Applying iOS-specific cache clearing');
      }
      
      // Set reload flag to prevent infinite loops
      localStorage.setItem(RELOAD_FLAG_KEY, Date.now().toString());
      
      // Clear only app-specific storage (preserve OAuth state and reload guard)
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        // Preserve Supabase auth tokens (generic pattern)
        const isSupabaseAuth = (key.startsWith("sb-") && key.endsWith("-auth-token")) || 
                               key.includes("supabase.auth.token");
        // Preserve reload guard to prevent loops
        const isReloadFlag = key === RELOAD_FLAG_KEY;
        // Preserve invite codes and redirects during OAuth flows
        const isInviteCode = key === 'pending_invite_code';
        const isAuthRedirect = key === 'auth_redirectTo';
        
        if (!isSupabaseAuth && !isReloadFlag && !isInviteCode && !isAuthRedirect) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear session storage
      sessionStorage.clear();
      
      // Clear IndexedDB safely (Safari can throw errors)
      try {
        if (window.indexedDB && window.indexedDB.databases) {
          window.indexedDB.databases().then((databases) => {
            databases.forEach((db) => {
              if (db.name) {
                window.indexedDB.deleteDatabase(db.name);
              }
            });
          }).catch(err => {
            console.warn('Could not clear IndexedDB:', err);
          });
        }
      } catch (err) {
        console.warn('IndexedDB cleanup error (safe to ignore):', err);
      }
      
      // Store new version
      localStorage.setItem(VERSION_KEY, APP_VERSION);
      
      // Force reload to get fresh JS bundle
      window.location.reload();
      return false; // Don't render yet
    }
    
    return true; // Version matches, proceed with rendering
  } catch (err) {
    // If anything fails, allow app to render (fail-safe)
    console.error('Cache buster error:', err);
    return true;
  }
};
