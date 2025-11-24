import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { updateLastLogin } from "./activityLogger";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  
  useEffect(() => {
    let isSubscribed = true;
    
    console.log('[AuthContext] Initializing auth system');
    
    // Listen for auth changes FIRST to avoid missing events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      
      console.log('[AuthContext] Auth state changed:', { event, hasSession: !!session, userId: session?.user?.id });
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Invalidate React Query cache on auth state changes (fixes Safari stale data)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Invalidating query cache due to auth change');
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
        console.log('[AuthContext] Starting session validation');
        
        // Check if we're in ANY auth callback - don't refresh session in that case
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const confirmationType = hashParams.get('type');
        const hasAccessToken = hashParams.has('access_token') || hashParams.has('refresh_token');
        const isAuthCallback = confirmationType || hasAccessToken;
        
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthContext] Session fetch error:', sessionError);
          throw sessionError;
        }
        
        if (currentSession) {
          // Check if session is expired by timestamp
          const expiresAt = currentSession.expires_at;
          if (expiresAt) {
            const expiryTime = new Date(expiresAt * 1000);
            const now = new Date();
            if (expiryTime <= now) {
              console.warn('[AuthContext] Session expired by timestamp, clearing');
              await supabase.auth.signOut({ scope: 'local' });
              localStorage.removeItem('supabase.auth.token');
              sessionStorage.clear();
              if (isSubscribed) {
                setSession(null);
                setUser(null);
                setLoading(false);
              }
              return;
            }
          }
          
          // Skip session refresh during ANY auth callback (OAuth, email confirmation, etc.)
          if (isAuthCallback) {
            console.log('[AuthContext] Skipping refresh during auth callback:', { type: confirmationType, hasToken: hasAccessToken });
            if (isSubscribed) {
              setSession(currentSession);
              setUser(currentSession.user);
              setLoading(false);
            }
            return;
          }
          
          // Validate session by attempting refresh (catches stale Safari sessions)
          console.log('[AuthContext] Attempting session refresh');
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshedSession) {
            // Session is invalid, clear it aggressively
            console.warn('[AuthContext] Stale session detected, signing out:', refreshError?.message);
            await supabase.auth.signOut({ scope: 'local' });
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.clear();
            if (isSubscribed) {
              setSession(null);
              setUser(null);
              setLoading(false);
            }
          } else {
            // Session is valid
            console.log('[AuthContext] Session refreshed successfully');
            if (isSubscribed) {
              setSession(refreshedSession);
              setUser(refreshedSession.user);
              setLoading(false);
              updateLastLogin();
            }
          }
        } else {
          console.log('[AuthContext] No existing session');
          if (isSubscribed) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Auth initialization error:', err);
        // Fail-safe: allow app to continue
        if (isSubscribed) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };
    
    // Add timeout to prevent auth from blocking app forever (fixes WhatsApp/iOS stuck loading)
    const timeoutPromise = new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error('Auth initialization timeout')), 8000)
    );
    
    Promise.race([initializeAuth(), timeoutPromise])
      .catch((err) => {
        console.error('[AuthContext] Timeout or error during initialization:', err);
        // Fail-safe: allow app to continue without auth
        if (isSubscribed) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
