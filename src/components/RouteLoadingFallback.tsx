import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const RouteLoadingFallback = () => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // If route loading takes >10 seconds, show error UI (fixes WhatsApp/iOS stuck loading)
    const timeout = setTimeout(() => {
      console.warn('[RouteLoadingFallback] Loading timeout exceeded');
      setTimedOut(true);
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, []);

  if (timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Loading Timeout</h2>
          <p className="text-sm text-muted-foreground">
            The page is taking longer than expected to load. This sometimes happens when opening links from WhatsApp or other apps.
          </p>
          <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};
