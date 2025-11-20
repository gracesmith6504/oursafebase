import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PDFViewer } from "@/components/PDFViewer";
import { Shield } from "lucide-react";
import DOMPurify from "dompurify";

interface CoCPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cocName: string | null;
  cocContent: string | null;
  cocFileUrl: string | null;
  eventName: string;
}

export const CoCPreviewDialog = ({
  open,
  onOpenChange,
  cocName,
  cocContent,
  cocFileUrl,
  eventName,
}: CoCPreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Code of Conduct Preview
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground mb-2">
              This is how the Code of Conduct will appear to attendees for:
            </p>
            <p className="font-semibold">{eventName || "Event Name"}</p>
          </div>

          <ScrollArea className="h-[50vh] rounded-lg border">
            <div className="p-6">
              {cocFileUrl ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    {cocName || "Code of Conduct"}
                  </h3>
                  <PDFViewer src={cocFileUrl} />
                </div>
              ) : cocContent ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    {cocName || "Code of Conduct"}
                  </h3>
                  <div className="border rounded-md bg-background px-4 py-4">
                    <div className="ql-snow">
                      <div
                        className="ql-editor"
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(cocContent, {
                            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'blockquote', 'code', 'pre'],
                            ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style']
                          }) 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No Code of Conduct selected.</p>
                  <p className="text-sm mt-2">
                    Select a Code of Conduct below to preview it.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button onClick={() => onOpenChange(false)}>Close Preview</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
