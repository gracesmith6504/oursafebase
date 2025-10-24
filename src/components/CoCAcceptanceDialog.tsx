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

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Consider "scrolled to bottom" when within 10px of bottom
      const isBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setScrolledToBottom(isBottom);
    }
  };

  useEffect(() => {
    // Check if content is short enough to not require scrolling
    // For files, allow scrolling to be optional
    if (cocFileUrl) {
      setScrolledToBottom(true);
    } else if (scrollRef.current) {
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
        <div className="w-full h-[60vh] md:h-[70vh]">
          <iframe 
            src={cocFileUrl} 
            className="w-full h-full rounded-md border-0"
            title="Code of Conduct PDF"
          />
        </div>
      );
    }
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
      return (
        <div className="w-full">
          <img 
            src={cocFileUrl} 
            alt="Code of Conduct" 
            className="w-full h-auto rounded-md"
          />
        </div>
      );
    }
    
    // For other file types (DOC, DOCX, TXT)
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium mb-2">Code of Conduct Document</p>
          <p className="text-sm text-muted-foreground mb-4">
            Please download the file to view the Code of Conduct
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Code of Conduct Required</DialogTitle>
          <DialogDescription>
            Before viewing the event safety information, please read and accept
            our Code of Conduct.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <div className="space-y-1">
            <p className="text-sm font-medium">Event: {eventTitle}</p>
          </div>

          {cocFileUrl ? (
            <div className="flex-1 border rounded-md p-4 overflow-auto">
              {renderFileViewer()}
            </div>
          ) : (
            <ScrollArea
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 border rounded-md p-4"
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <Label htmlFor="agree">
              I have read and agree to this Code of Conduct
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              onClick={handleAccept}
              disabled={!agreed || loading}
            >
              {loading ? "Accepting..." : "Accept Code of Conduct"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoCAcceptanceDialog;
