import { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PDFViewerProps {
  src: string;
  onLoadSuccess?: () => void;
  onError?: () => void;
}

export const PDFViewer = ({ src, onLoadSuccess, onError }: PDFViewerProps) => {
  const [loading, setLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        setShowFallback(true);
        onError?.();
      }
    }, 5000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoad = useCallback(() => {
    setLoading(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onLoadSuccess?.();
  }, [onLoadSuccess]);

  return (
    <div className="relative w-full h-full">
      {/* Floating "Open in tab" pill — always visible */}
      <button
        onClick={() => window.open(src, "_blank")}
        className="absolute top-3 right-3 z-30 flex items-center gap-1.5 rounded-full bg-foreground/80 text-background px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-sm hover:bg-foreground/90 transition-colors"
      >
        <ExternalLink className="h-3 w-3" />
        Open in tab
      </button>

      {/* Loading spinner overlay */}
      {loading && !showFallback && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Loading document…</p>
        </div>
      )}

      {/* Fallback card overlay */}
      {showFallback && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 shadow-lg max-w-sm mx-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Tap below to review the document</p>
              <p className="text-xs text-muted-foreground">
                Opens in a new tab for the best viewing experience
              </p>
            </div>
            <Button
              onClick={() => window.open(src, "_blank")}
              size="lg"
              className="w-full"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Document
            </Button>
          </div>
        </div>
      )}

      {/* iframe — always mounted */}
      <iframe
        src={src}
        className="w-full h-full border-0"
        onLoad={handleLoad}
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        title="Document viewer"
      />
    </div>
  );
};
