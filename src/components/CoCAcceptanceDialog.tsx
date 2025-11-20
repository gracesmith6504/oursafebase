import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { FileText, Download, Loader2 } from "lucide-react";
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
  const [pdfError, setPdfError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get the actual scrollable viewport element from ScrollArea
  const getViewport = useCallback(() => {
    if (!scrollRef.current) return null;
    // ScrollArea uses Radix which has a viewport child element
    return scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
  }, []);

  // Debounce scroll handler for better performance
  const handleScroll = useCallback(() => {
    const viewport = getViewport();
    if (viewport) {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      // Consider "scrolled to bottom" when within 20px of bottom
      const isBottom = scrollTop + clientHeight >= scrollHeight - 20;
      setScrolledToBottom(isBottom);
    }
  }, [getViewport]);

  // Debounced scroll handler
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const debouncedScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };
    
    const viewport = getViewport();
    if (viewport) {
      viewport.addEventListener('scroll', debouncedScroll, { passive: true });
      return () => {
        viewport.removeEventListener('scroll', debouncedScroll);
        clearTimeout(timeoutId);
      };
    }
  }, [handleScroll, getViewport]);

  // Simplified scroll detection: allow immediate acceptance for all file-based CoCs
  useEffect(() => {
    // For file-based CoCs, allow immediate acceptance
    // Users can open files in new tabs if they want to review in detail
    if (cocFileUrl) {
      setScrolledToBottom(true);
      return;
    }
    
    // For text content, check if it fits on screen using the viewport
    if (!cocFileUrl) {
      const viewport = getViewport();
      if (viewport) {
        const { scrollHeight, clientHeight } = viewport;
        if (scrollHeight <= clientHeight) {
          setScrolledToBottom(true);
        }
      }
    }
    
    // Fallback: if no content and no file, allow acceptance
    if (!cocContent && !cocFileUrl) {
      setScrolledToBottom(true);
    }
  }, [cocContent, cocFileUrl, getViewport]);

  // Secondary check: Re-evaluate scroll state after DOM updates (fixes race condition)
  useEffect(() => {
    if (!cocFileUrl) {
      // Use RAF to ensure DOM is fully painted
      requestAnimationFrame(() => {
        const viewport = getViewport();
        if (viewport) {
          const { scrollHeight, clientHeight } = viewport;
          if (scrollHeight <= clientHeight + 20) { // +20px buffer
            setScrolledToBottom(true);
          }
        }
      });
    }
  }, [cocFileUrl, cocContent, getViewport]);

  const renderFileViewer = useCallback(() => {
    if (!cocFileUrl) return null;

    // Debug: Log the URL
    console.log('🔗 CoC File URL:', cocFileUrl);

    // Validate URL format
    try {
      const url = new URL(cocFileUrl);
      console.log('✅ Valid URL:', url.href);
    } catch (e) {
      console.error('❌ Invalid URL:', cocFileUrl, e);
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md m-4">
          <p className="text-sm text-red-800 dark:text-red-200">Invalid file URL format</p>
        </div>
      );
    }

    const fileExt = getFileExtension(cocFileUrl);

    // PDF files
    if (fileExt === 'pdf') {
      return (
        <div>
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md m-4 mb-2">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              PDF Loading... If it doesn't appear,{' '}
              <button
                onClick={() => window.open(cocFileUrl, '_blank')}
                className="underline font-semibold hover:text-blue-900 dark:hover:text-blue-100"
              >
                click here to open in new tab
              </button>
            </p>
          </div>
          {pdfError && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md mx-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">Unable to display PDF preview</p>
              <Button
                onClick={() => window.open(cocFileUrl, '_blank')}
                size="sm"
                variant="outline"
              >
                Open PDF in New Tab
              </Button>
            </div>
          )}
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
            <PDFViewer
              src={cocFileUrl}
              onLoadSuccess={() => {
                setPdfError(false);
              }}
              onError={() => {
                setPdfError(true);
              }}
            />
          </div>
        </div>
      );
    }
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
      return (
        <div className="w-full flex items-center justify-center py-2 sm:py-4">
          <img 
            src={cocFileUrl} 
            alt="Code of Conduct" 
            className="w-full h-auto max-w-full object-contain"
          />
        </div>
      );
    }
    
    // For other file types (DOC, DOCX, TXT)
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 sm:px-6 space-y-3 sm:space-y-4 min-h-[40vh]">
        <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
        <div className="text-center max-w-md">
          <p className="font-medium text-sm sm:text-base mb-2">Cannot Preview</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
            Download to view this document
          </p>
        </div>
        <Button 
          onClick={() => window.open(cocFileUrl, '_blank')}
          variant="outline"
          size="sm"
          className="text-xs sm:text-sm"
        >
          <Download className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Download Document
        </Button>
      </div>
    );
  }, [cocFileUrl, pdfError]);

  // Memoize sanitized HTML to avoid re-sanitizing on every render
  const sanitizedContent = useMemo(() => {
    if (!cocContent) return "";
    return DOMPurify.sanitize(cocContent, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style']
    });
  }, [cocContent]);

  const handleAccept = useCallback(async () => {
    if (!agreed) {
      toast.error("Please agree to the Code of Conduct");
      return;
    }

    if (!scrolledToBottom) {
      toast.error("Please review the full Code of Conduct");
      return;
    }

    if (!user) return;

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

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent hideClose className="max-w-6xl w-[95vw] h-[85vh] sm:max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-4 border-b shrink-0">
          <DialogTitle className="text-base sm:text-lg">Code of Conduct</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Please review and accept to continue
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto">
          {cocFileUrl ? (
            renderFileViewer()
          ) : (
            <ScrollArea 
              ref={scrollRef} 
              className="flex-1 px-2 sm:px-4 py-4"
            >
              <div className="border rounded-md bg-background px-4 py-4">
                <div className="ql-snow">
                  <div
                    className="ql-editor"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                  />
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="border-t bg-background px-4 sm:px-6 py-4 sm:py-4 space-y-3 sm:space-y-3 shrink-0">
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

          <div className="flex justify-end">
            <Button
              onClick={handleAccept}
              disabled={!canAccept || loading}
              className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10"
            >
              {loading 
                ? "Accepting..." 
                : (
                  <>
                    <span className="hidden sm:inline">Accept Code of Conduct</span>
                    <span className="sm:hidden">Accept</span>
                  </>
                )
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoCAcceptanceDialog;
