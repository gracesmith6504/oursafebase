import { useState, useEffect, useRef } from "react";
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
import { FileText, Download } from "lucide-react";
import { getFileExtension } from "@/lib/fileUtils";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Consider "scrolled to bottom" when within 20px of bottom
      const isBottom = scrollTop + clientHeight >= scrollHeight - 20;
      setScrolledToBottom(isBottom);
    }
  };

  useEffect(() => {
    // For file-based CoCs (non-PDF), allow immediate acceptance
    if (cocFileUrl) {
      const fileExt = getFileExtension(cocFileUrl);
      
      // For images and other non-PDF files, allow immediate acceptance
      if (fileExt !== 'pdf') {
        setScrolledToBottom(true);
      }
    } else if (scrollRef.current) {
      // For text content, check actual scroll position
      const { scrollHeight, clientHeight } = scrollRef.current;
      if (scrollHeight <= clientHeight) {
        setScrolledToBottom(true);
      }
    }
  }, [cocContent, cocFileUrl]);

  const renderFileViewer = () => {
    if (!cocFileUrl) return null;
    
    const fileExt = getFileExtension(cocFileUrl);
    
    if (fileExt === 'pdf') {
      return (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-2 sm:px-4 py-4"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
          }}
        >
          <PDFViewer
            src={cocFileUrl}
            onLoadSuccess={(numPages) => {
              console.log(`Loaded PDF with ${numPages} pages`);
            }}
          />
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
          size="sm"
          className="text-xs sm:text-sm"
        >
          <Download className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Download ({fileExt.toUpperCase()})
        </Button>
      </div>
    );
  };

  const handleAccept = async () => {
    if (!user) return;

    setLoading(true);

    const { error } = await supabase.from("code_acceptances").insert({
      event_id: eventId,
      code_of_conduct_id: cocId,
      accepted_version: cocVersion,
      user_id: user.id,
    });

    if (error) {
      console.error("Error accepting CoC:", error);
      toast.error("Failed to accept Code of Conduct");
      setLoading(false);
      return;
    }

    toast.success("Code of Conduct accepted");
    setLoading(false);
    onAccepted();
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent hideClose className="max-w-6xl w-[95vw] max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
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
              onScroll={handleScroll}
              className="h-full px-4 sm:px-6 py-3 sm:py-4"
            >
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {cocContent?.split("\n").map((line, i) => {
                  // Basic markdown rendering for headings
                  if (line.startsWith("## ")) {
                    return (
                      <h2 key={i} className="text-lg font-semibold mt-4 mb-2">
                        {line.replace("## ", "")}
                      </h2>
                    );
                  }
                  if (line.startsWith("# ")) {
                    return (
                      <h1 key={i} className="text-xl font-bold mt-4 mb-2">
                        {line.replace("# ", "")}
                      </h1>
                    );
                  }
                  if (line.startsWith("- ")) {
                    return (
                      <li key={i} className="ml-4">
                        {line.replace("- ", "")}
                      </li>
                    );
                  }
                  if (line.trim() === "") {
                    return <br key={i} />;
                  }
                  return <p key={i}>{line}</p>;
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="border-t bg-background px-3 sm:px-6 py-2 sm:py-4 space-y-2 sm:space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
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
              disabled={!agreed || loading}
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
