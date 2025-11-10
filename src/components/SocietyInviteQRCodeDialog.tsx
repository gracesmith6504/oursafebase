import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SocietyInviteQRCode } from "./SocietyInviteQRCode";

interface SocietyInviteQRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  societyName: string;
  inviteUrl: string;
  inviteType: "attendee" | "committee";
}

export const SocietyInviteQRCodeDialog = ({
  open,
  onOpenChange,
  societyName,
  inviteUrl,
  inviteType,
}: SocietyInviteQRCodeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Share {inviteType.charAt(0).toUpperCase() + inviteType.slice(1)} Invite Link
          </DialogTitle>
          <DialogDescription>
            Scan this QR code or share the link to invite {inviteType}s to your society
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <SocietyInviteQRCode 
            societyName={societyName}
            inviteUrl={inviteUrl}
            inviteType={inviteType}
            size={280}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
