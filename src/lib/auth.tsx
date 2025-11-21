import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { updateLastLogin } from "./activityLogger";
import { useQueryClient } from "@tanstack/react-query";

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  
  useEffect(() => {
    let isSubscribed = true;
    
    // Listen for auth changes FIRST to avoid missing events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Invalidate React Query cache on auth state changes (fixes Safari stale data)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        setTimeout(() => {
          queryClient.invalidateQueries();
        }, 0);
      }
      
      // Log login activity when user signs in
      if (event === 'SIGNED_IN' && session?.user) {
        updateLastLogin();
      }
    });

    // THEN check for an existing session and validate it
    const initializeAuth = async () => {
      try {
        // Check if we're in ANY auth callback - don't refresh session in that case
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const confirmationType = hashParams.get('type');
        const hasAccessToken = hashParams.has('access_token') || hashParams.has('refresh_token');
        const isAuthCallback = confirmationType || hasAccessToken;
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          // Skip session refresh during ANY auth callback (OAuth, email confirmation, etc.)
          if (isAuthCallback) {
            console.log('[Auth] Skipping session refresh during auth callback:', { type: confirmationType, hasToken: hasAccessToken });
            if (isSubscribed) {
              setSession(currentSession);
              setUser(currentSession.user);
              setLoading(false);
            }
            return;
          }
          
          // Validate session by attempting refresh (catches stale Safari sessions)
          const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
          
          if (error || !refreshedSession) {
            // Session is invalid, clear it
            console.warn('Stale session detected, signing out:', error?.message);
            await supabase.auth.signOut();
            if (isSubscribed) {
              setSession(null);
              setUser(null);
              setLoading(false);
            }
          } else {
            // Session is valid
            if (isSubscribed) {
              setSession(refreshedSession);
              setUser(refreshedSession.user);
              setLoading(false);
              updateLastLogin();
            }
          }
        } else {
          if (isSubscribed) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        // Fail-safe: allow app to continue
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };
    
    initializeAuth();

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return { session, user, loading };
};

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
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
