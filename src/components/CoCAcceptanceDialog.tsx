import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Download, CheckCircle2, Loader2 } from "lucide-react";
import { getFileExtension } from "@/lib/fileUtils";
import DOMPurify from "dompurify";
import { PDFViewer } from "@/components/PDFViewer";

interface CoCAcceptanceDialogProps {
  eventId: string;
  eventTitle: string;
  cocId: string;
  cocVersion: number;
  cocContent?: string;
  cocFileUrl?: string;
  cocContentType: "text" | "markdown";
  onAccepted: () => void;
}

const CoCAcceptanceDialog = ({
  eventId,
  eventTitle,
  cocId,
  cocVersion,
  cocContent,
  cocFileUrl,
  onAccepted,
}: CoCAcceptanceDialogProps) => {
  const { user } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollDivRef = useRef<HTMLDivElement>(null);

  // For file-based CoCs, allow immediate acceptance
  useEffect(() => {
    if (cocFileUrl) {
      setScrolledToBottom(true);
    }
  }, [cocFileUrl]);

  // For text content: check if content fits without scrolling
  useEffect(() => {
    if (cocFileUrl || !cocContent) {
      if (!cocContent && !cocFileUrl) setScrolledToBottom(true);
      return;
    }
    requestAnimationFrame(() => {
      const el = scrollDivRef.current;
      if (el && el.scrollHeight <= el.clientHeight + 20) {
        setScrolledToBottom(true);
      }
    });
  }, [cocContent, cocFileUrl]);

  // Scroll listener for text content
  const handleScroll = useCallback(() => {
    const el = scrollDivRef.current;
    if (el) {
      const isBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
      if (isBottom) setScrolledToBottom(true);
    }
  }, []);

  // Sanitized HTML
  const sanitizedContent = useMemo(() => {
    if (!cocContent) return "";
    return DOMPurify.sanitize(cocContent, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style']
    });
  }, [cocContent]);

  const handleAccept = useCallback(async () => {
    if (!agreed || !scrolledToBottom || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("code_acceptances").insert({
        event_id: eventId,
        code_of_conduct_id: cocId,
        accepted_version: cocVersion,
        user_id: user.id,
      });

      if (error) {
        console.error("Error accepting CoC:", error);
        toast.error("Failed to accept Code of Conduct");
        return;
      }

      toast.success("Code of Conduct accepted");
      onAccepted();
    } catch (error) {
      console.error("Error accepting CoC:", error);
      toast.error("Failed to accept Code of Conduct");
    } finally {
      setLoading(false);
    }
  }, [agreed, scrolledToBottom, cocId, cocVersion, eventId, user, onAccepted]);

  const canAccept = agreed && scrolledToBottom;

  // Status dot color
  const dotColor = canAccept
    ? "bg-emerald-500"
    : scrolledToBottom
      ? "bg-amber-500"
      : "bg-muted-foreground/40";

  const renderFileViewer = () => {
    if (!cocFileUrl) return null;

    try {
      new URL(cocFileUrl);
    } catch {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <p className="text-sm text-destructive">Invalid file URL</p>
        </div>
      );
    }

    const fileExt = getFileExtension(cocFileUrl);

    if (fileExt === 'pdf') {
      return (
        <div className="w-full h-full">
          <PDFViewer src={cocFileUrl} />
        </div>
      );
    }

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
      return (
        <div className="w-full h-full overflow-auto flex items-center justify-center p-4"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          <img
            src={cocFileUrl}
            alt="Code of Conduct"
            className="w-full h-auto max-w-full object-contain"
          />
        </div>
      );
    }

    // Other file types
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 space-y-4">
        <div className="rounded-full bg-muted p-4">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="text-center max-w-md">
          <p className="font-medium text-sm mb-1">Download to review this document</p>
          <p className="text-xs text-muted-foreground mb-4">
            This file type cannot be previewed in the browser
          </p>
        </div>
        <Button
          onClick={() => window.open(cocFileUrl, '_blank')}
          variant="outline"
          size="sm"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Document
        </Button>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      style={{ height: '100dvh' }}
    >
      {/* Header */}
      <div className="shrink-0 h-14 flex items-center justify-between px-4 sm:px-6 border-b bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`shrink-0 h-2.5 w-2.5 rounded-full transition-colors duration-300 ${dotColor}`}
          />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{eventTitle}</h1>
            <p className="text-xs text-muted-foreground">Code of Conduct</p>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0">
        {cocFileUrl ? (
          renderFileViewer()
        ) : (
          <div
            ref={scrollDivRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto px-3 sm:px-6 py-4"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            <div className="border rounded-md bg-background px-4 py-4 max-w-3xl mx-auto">
              <div className="ql-snow">
                <div
                  className="ql-editor"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 border-t bg-background px-4 sm:px-6 pt-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {/* Helper text for text CoCs */}
        {!cocFileUrl && !scrolledToBottom && (
          <p className="text-xs text-muted-foreground text-center mb-2 animate-pulse">
            Scroll to the bottom to unlock acceptance
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="h-4 w-4 sm:h-5 sm:w-5"
            />
            <Label htmlFor="agree" className="cursor-pointer text-xs sm:text-sm leading-tight">
              <span className="hidden sm:inline">I have read and agree to this Code of Conduct</span>
              <span className="sm:hidden">I agree to this Code of Conduct</span>
            </Label>
          </div>

          <Button
            onClick={handleAccept}
            disabled={!canAccept || loading}
            className={`w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10 transition-colors ${
              canAccept && !loading
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : ''
            }`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {canAccept && <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                <span className="hidden sm:inline">Accept Code of Conduct</span>
                <span className="sm:hidden">Accept</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CoCAcceptanceDialog;
