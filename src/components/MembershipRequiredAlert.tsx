import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface MembershipRequiredAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MembershipRequiredAlert({ 
  open, 
  onOpenChange 
}: MembershipRequiredAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px] rounded-xl w-[calc(100%-2rem)]">
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-3">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <AlertDialogTitle className="text-xl">
            Membership Required
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-center">
            You must be a member of this society to submit reports. Please contact your society committee to join.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-center sm:justify-center">
          <Button 
            onClick={() => onOpenChange(false)} 
            className="w-full sm:w-auto"
          >
            I Understand
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
