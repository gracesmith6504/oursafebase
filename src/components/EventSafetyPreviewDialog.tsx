import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, AlertCircle, FileText, MessageSquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WelfareContact {
  userId?: string;
  displayName: string;
  role: string;
  phone?: string;
  avatar?: string;
}

interface ExternalContact {
  name: string;
  phone: string;
  role: string;
}

interface EmergencyField {
  id: string;
  label: string;
  name: string;
  address: string;
  phone: string;
}

interface EventSafetyPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  eventDate: Date | undefined;
  location: string;
  welfareContacts: WelfareContact[];
  externalContacts: ExternalContact[];
  emergencyFields: EmergencyField[];
  hasCodeOfConduct?: boolean;
  cocName?: string | null;
}

export const EventSafetyPreviewDialog = ({
  open,
  onOpenChange,
  eventName,
  eventDate,
  location,
  welfareContacts,
  externalContacts,
  emergencyFields,
  hasCodeOfConduct = false,
  cocName = null,
}: EventSafetyPreviewDialogProps) => {
  const allContacts = [
    ...welfareContacts.map(c => ({
      name: c.displayName,
      phone: c.phone,
      avatar: c.avatar,
      role: c.role,
    })),
    ...externalContacts.map(c => ({
      name: c.name,
      phone: c.phone,
      avatar: undefined,
      role: c.role,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Safety Page Preview</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Event Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{eventName || "Event Name"}</h2>
              <p className="text-sm text-muted-foreground">
                {eventDate ? eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Event Date"}
                {location && ` • ${location}`}
              </p>
            </div>

            {/* Important Contacts */}
            {allContacts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Important Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {allContacts.map((contact, index) => (
                      <div
                        key={index}
                        className="flex gap-3 rounded-lg border bg-muted/50 p-4"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={contact.avatar} alt={contact.name} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {contact.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{contact.name}</p>
                          {contact.role && (
                            <p className="text-sm text-muted-foreground">{contact.role}</p>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-sm text-primary flex items-center gap-1 font-medium">
                                <Phone className="h-4 w-4" />
                                {contact.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Emergency Information */}
            {emergencyFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Emergency Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {emergencyFields.map((field) => (
                      <div key={field.id} className="space-y-2 rounded-lg border p-4">
                        <h3 className="font-semibold">{field.label || "Emergency Contact"}</h3>
                        {field.name && <p className="text-sm">{field.name}</p>}
                        {field.address && (
                          <p className="text-sm text-muted-foreground">{field.address}</p>
                        )}
                        {field.phone && (
                          <span className="text-sm text-primary flex items-center gap-1 font-medium">
                            <Phone className="h-4 w-4" />
                            {field.phone}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons - Preview Only (Disabled) */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Button 
                size="lg" 
                className="w-full" 
                variant="destructive"
                disabled
              >
                <FileText className="mr-2 h-5 w-5" />
                Report a Concern
              </Button>
              <Button 
                size="lg" 
                className="w-full" 
                variant="outline"
                disabled
              >
                <MessageSquare className="mr-2 h-5 w-5" />
                Submit Feedback
              </Button>
            </div>

            {/* Code of Conduct Card - Preview */}
            {hasCodeOfConduct && (
              <Card className="border bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">Code of Conduct</p>
                        {cocName && (
                          <p className="text-xs text-muted-foreground truncate">{cocName}</p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      disabled
                    >
                      View Document →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
            <Card className="bg-muted/30 border-muted-foreground/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3 text-xs text-muted-foreground leading-relaxed">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                  <p>
                    <strong className="text-foreground">Important:</strong> OurSafeBase is a support tool and is not a substitute for professional medical, legal, or emergency services.
                  </p>
                </div>
              </CardContent>
            </Card>

            {allContacts.length === 0 && emergencyFields.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>No contacts or emergency information added yet.</p>
                  <p className="text-sm mt-2">Add contacts below to see them in the preview.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close Preview</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
