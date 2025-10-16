export const PRODUCTION_URL = "https://oursafebase.com";

export const getAppUrl = (): string => {
  // Check if we're in production by looking at the current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If we're on the production domain, use it
    if (hostname === 'oursafebase.com' || hostname === 'www.oursafebase.com') {
      return PRODUCTION_URL;
    }
    
    // For preview/development, use the current origin
    return window.location.origin;
  }
  
  // Fallback for SSR or other edge cases
  return PRODUCTION_URL;
};
