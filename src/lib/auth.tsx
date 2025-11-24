import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "./AuthContext";

// Legacy hook for backwards compatibility - redirects to useAuthContext
export const useAuth = () => {
  console.warn('[useAuth] DEPRECATED: Please use useAuthContext from AuthContext instead');
  return useAuthContext();
};

// Hook to handle session expiration with page-specific logic
export const useSessionExpiration = () => {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Don't redirect if still loading or if user is present
    if (loading || user) return;
    
    // Special case: Feedback page should NOT redirect on session expiration
    if (location.pathname.includes('/feedback')) {
      console.log('[SessionExpiration] User logged out on feedback page, staying on page');
      return;
    }
    
    // For all other pages, redirect to auth when session expires
    const isPublicPage = ['/', '/auth', '/privacy', '/terms', '/contact', '/faq', '/about'].includes(location.pathname) 
      || location.pathname.includes('/code-of-conduct/') 
      || location.pathname.includes('/invite/');
    
    if (!isPublicPage) {
      console.log('[SessionExpiration] Session expired on protected page, redirecting to auth');
      navigate('/auth', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);
};

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
