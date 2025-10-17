import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventQRCode } from "./EventQRCode";

interface EventQRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

export const EventQRCodeDialog = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
}: EventQRCodeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Event</DialogTitle>
          <DialogDescription>
            Scan this QR code to access the event page
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <EventQRCode eventId={eventId} eventTitle={eventTitle} size={280} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
