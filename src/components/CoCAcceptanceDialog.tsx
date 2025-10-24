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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Consider "scrolled to bottom" when within 10px of bottom
      const isBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setScrolledToBottom(isBottom);
    }
  };

  useEffect(() => {
    // For file-based CoCs, require viewing time
    if (cocFileUrl) {
      const fileExt = getFileExtension(cocFileUrl);
      
      // For PDFs, require minimum viewing time
      if (fileExt === 'pdf') {
        const timer = setTimeout(() => {
          setScrolledToBottom(true);
        }, 10000); // 10 seconds minimum viewing time
        
        return () => clearTimeout(timer);
      } else {
        // For images and other files, allow immediate acceptance
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
        <iframe 
          ref={iframeRef}
          src={`${cocFileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
          className="w-full h-full min-h-[70vh] border-0"
          title="Code of Conduct PDF"
          style={{ colorScheme: 'light' }}
        />
      );
    }
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
      return (
        <div className="w-full p-4">
          <img 
            src={cocFileUrl} 
            alt="Code of Conduct" 
            className="w-full h-auto"
          />
        </div>
      );
    }
    
    // For other file types (DOC, DOCX, TXT)
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 space-y-4 min-h-[40vh]">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <div className="text-center max-w-md">
          <p className="font-medium mb-2">Code of Conduct Document</p>
          <p className="text-sm text-muted-foreground mb-4">
            This file type cannot be previewed in the browser. Please download it to view the Code of Conduct.
          </p>
        </div>
        <Button 
          onClick={() => window.open(cocFileUrl, '_blank')}
          size="lg"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Code of Conduct ({fileExt.toUpperCase()})
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
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Code of Conduct Required</DialogTitle>
          <DialogDescription>
            Before viewing the event safety information, please read and accept
            our Code of Conduct.
          </DialogDescription>
          <p className="text-sm font-medium pt-2">Event: {eventTitle}</p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto">
          {cocFileUrl ? (
            renderFileViewer()
          ) : (
            <ScrollArea
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-full px-6 py-4"
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

        <div className="border-t bg-background px-4 py-3 space-y-2">
          {!scrolledToBottom && cocFileUrl && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Please review the full document
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <Label htmlFor="agree" className="cursor-pointer text-sm">
              I agree to this Code of Conduct
            </Label>
          </div>

          {scrolledToBottom && (
            <div className="flex justify-end">
              <Button
                onClick={handleAccept}
                disabled={!agreed || loading}
                className="w-full sm:w-auto"
              >
                {loading ? "Accepting..." : "Accept"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoCAcceptanceDialog;
