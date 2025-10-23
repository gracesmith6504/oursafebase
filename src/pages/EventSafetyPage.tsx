import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Mail, MapPin, AlertCircle, Shield, MessageSquare, FileText, Copy, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { ReportConcernDialog } from "@/components/ReportConcernDialog";
import { SubmitFeedbackDialog } from "@/components/SubmitFeedbackDialog";
import CoCAcceptanceDialog from "@/components/CoCAcceptanceDialog";
import { MembershipRequiredAlert } from "@/components/MembershipRequiredAlert";
import { useAuth } from "@/lib/auth";
import { useCommitteeRole } from "@/lib/useCommitteeRole";

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  society_id: string;
  created_by: string | null;
}

interface Society {
  slug: string;
}

interface WelfareContact {
  id: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  role: string | null;
}

interface EmergencyInfo {
  nearest_hospital: string | null;
  hospital_address: string | null;
  hospital_phone: string | null;
  nearest_pharmacy: string | null;
  pharmacy_address: string | null;
  pharmacy_phone: string | null;
  on_duty_contact: string | null;
  on_duty_phone: string | null;
  custom_emergency_info: any;
}

interface CodeOfConduct {
  content: string;
}

const EventSafetyPage = () => {
  const { eventId, societySlug, eventSlug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [society, setSociety] = useState<Society | null>(null);
  const [welfareContacts, setWelfareContacts] = useState<WelfareContact[]>([]);
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo | null>(null);
  const [codeOfConduct, setCodeOfConduct] = useState<CodeOfConduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showMembershipAlert, setShowMembershipAlert] = useState(false);
  const [cocRequired, setCoCRequired] = useState(false);
  const [cocData, setCoCData] = useState<any>(null);
  const [showCoCDialog, setShowCoCDialog] = useState(false);
  const [hasEventLevelCoC, setHasEventLevelCoC] = useState(false);
  const [isSocietyMember, setIsSocietyMember] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(true);
  
  const { isCommittee, loading: roleLoading } = useCommitteeRole(event?.society_id);

  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect to auth with event info for redirect after login
      const redirectPath = societySlug && eventSlug 
        ? `/${societySlug}/${eventSlug}`
        : `/event/${eventId}`;
      navigate(`/auth?redirect=${redirectPath}&eventTitle=${event?.title || 'this event'}`);
    }
  }, [user, authLoading, navigate, eventId, societySlug, eventSlug, event?.title]);

  useEffect(() => {
    if ((eventId || (societySlug && eventSlug)) && user) {
      fetchEventData();
    }
  }, [eventId, societySlug, eventSlug, user]);

  useEffect(() => {
    if (event) {
      trackPageView();
    }
  }, [event]);

  const fetchEventData = async () => {
    try {
      // Fetch event - try slug-based query first, fall back to UUID
      let eventData;
      let eventError;
      
      if (societySlug && eventSlug) {
        // Query by slugs (new pretty URL format)
        const { data, error } = await supabase
          .from("events")
          .select("*, societies!inner(slug)")
          .eq("slug", eventSlug)
          .eq("societies.slug", societySlug)
          .single();
        eventData = data;
        eventError = error;
      } else if (eventId) {
        // Query by UUID (backwards compatibility)
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .single();
        eventData = data;
        eventError = error;
      }

      if (eventError) throw eventError;
      if (!eventData) throw new Error("Event not found");
      setEvent(eventData);

      // Fetch society to get slug
      const { data: societyData } = await supabase
        .from("societies")
        .select("slug")
        .eq("id", eventData.society_id)
        .single();
      
      if (societyData) {
        setSociety(societyData);
      }

      // Fetch event contacts using snapshot fields including avatar (no join needed for public page)
      const { data: contactsData, error: contactsError } = await supabase
        .from("event_contacts")
        .select("id, role, contact_name, contact_phone, contact_avatar_url, display_order")
        .eq("event_id", eventData.id)
        .order("display_order");

      if (contactsError) {
        console.error("Error fetching contacts:", contactsError);
      }

      if (contactsData) {
        const processedContacts = contactsData.map((contact: any) => ({
          id: contact.id,
          name: contact.contact_name || "Anonymous",
          phone: contact.contact_phone,
          avatar: contact.contact_avatar_url,
          role: contact.role,
        }));
        setWelfareContacts(processedContacts);
      }

      // Fetch emergency info
      const { data: emergencyData } = await supabase
        .from("emergency_info")
        .select("*")
        .eq("event_id", eventData.id)
        .single();

      if (emergencyData) {
        setEmergencyInfo(emergencyData);
      }

      // Fetch code of conduct - only event-specific for display
      let { data: cocData } = await supabase
        .from("code_of_conduct")
        .select("content")
        .eq("event_id", eventData.id)
        .eq("is_active", true)
        .maybeSingle();

      // Track if event has event-level CoC
      setHasEventLevelCoC(!!cocData);

      // If no event-specific CoC, optionally show active template content for display only
      if (!cocData) {
        const { data: templateCocData } = await supabase
          .from("code_of_conduct")
          .select("content")
          .eq("society_id", eventData.society_id)
          .is("event_id", null)
          .eq("is_active", true)
          .maybeSingle();
        
        cocData = templateCocData;
      }

      if (cocData) {
        setCodeOfConduct(cocData);
      }

      // Check CoC acceptance and membership after fetching event
      if (eventData && user) {
        await checkCoCAcceptance(eventData);
        await checkMembership();
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkMembership = async () => {
    if (!user || !event?.society_id) {
      setIsSocietyMember(false);
      setMembershipLoading(false);
      return;
    }

    const { data } = await supabase
      .from("society_members")
      .select("id")
      .eq("society_id", event.society_id)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsSocietyMember(!!data);
    setMembershipLoading(false);
  };

  const checkCoCAcceptance = async (eventData: Event) => {
    if (!user) return;

    // Skip CoC check if user is the event creator (committee member)
    if (eventData.created_by === user.id) {
      setCoCRequired(false);
      return;
    }

    // Only check for event-level CoC (no society fallback for acceptance)
    const { data: coc } = await supabase
      .from("code_of_conduct")
      .select("*")
      .eq("event_id", eventData.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!coc) {
      // No event-level CoC means no acceptance required
      setCoCRequired(false);
      return;
    }

    // Check if user has accepted current version
    const { data: acceptance } = await supabase
      .from("code_acceptances")
      .select("accepted_version")
      .eq("user_id", user.id)
      .eq("code_of_conduct_id", coc.id)
      .gte("accepted_version", coc.version)
      .maybeSingle();

    if (!acceptance) {
      setCoCRequired(true);
      setCoCData(coc);
      setShowCoCDialog(true);
    }
  };

  const copyPhoneNumber = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success("Phone number copied!");
  };

  const trackPageView = async () => {
    if (!event?.id) return;
    try {
      await supabase.from("safety_page_views").insert({
        event_id: event.id,
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error("Error tracking page view:", error);
    }
  };

  if (authLoading || loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show CoC dialog if required
  if (cocRequired && showCoCDialog && cocData) {
    return (
      <div className="min-h-screen bg-background">
        <CoCAcceptanceDialog
          eventId={event?.id || eventId!}
          eventTitle={event?.title || "Event"}
          cocId={cocData.id}
          cocVersion={cocData.version}
          cocContent={cocData.content}
          cocContentType={cocData.content_type || "text"}
          onAccepted={() => {
            setShowCoCDialog(false);
            setCoCRequired(false);
          }}
        />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This safety page does not exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customEmergencyFields = emergencyInfo?.custom_emergency_info || [];

  const handleBackClick = () => {
    if (!society) return;
    
    if (isCommittee) {
      navigate(`/society/${society.slug}/dashboard`);
    } else {
      navigate(`/society/${society.slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {society && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackClick}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <img src={logo} alt="OurSafeBase" className="h-10" />
            <div>
              <h1 className="text-2xl font-bold">{event.title}</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(event.event_date), "PPP")}
                {event.location && ` • ${event.location}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Important Contacts */}
        {welfareContacts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Important Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {welfareContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex gap-3 rounded-lg border bg-muted/50 p-4"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={contact.avatar || undefined} alt={contact.name || "Contact"} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {(contact.name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{contact.name || "Anonymous"}</p>
                      {contact.role && (
                        <p className="text-sm text-muted-foreground">{contact.role}</p>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2 mt-2">
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
                          >
                            <Phone className="h-4 w-4" />
                            {contact.phone}
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyPhoneNumber(contact.phone!)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
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
        {emergencyInfo && customEmergencyFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Emergency Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {customEmergencyFields.map((field: any, index: number) => (
                <div key={index} className="space-y-2">
                  <h3 className="font-semibold text-lg">{field.label}</h3>
                  <div className="space-y-1">
                    {field.name && <p className="font-medium">{field.name}</p>}
                    {field.address && (
                      <p className="text-sm text-muted-foreground flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {field.address}
                      </p>
                    )}
                    {field.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {field.phone}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Code of Conduct */}
        {codeOfConduct && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Code of Conduct
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{codeOfConduct.content}</p>
              {!hasEventLevelCoC && isCommittee && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    This event doesn't have a Code of Conduct assigned yet.{" "}
                    <Button
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => navigate(`/society/${society?.slug}/events/${eventId}/edit`)}
                    >
                      Edit Event
                    </Button>{" "}
                    to select a template.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Button 
            size="lg" 
            className="w-full" 
            variant="destructive"
            onClick={() => {
              if (!isSocietyMember) {
                setShowMembershipAlert(true);
              } else {
                setShowReportDialog(true);
              }
            }}
            disabled={membershipLoading}
          >
            <FileText className="mr-2 h-5 w-5" />
            Report a Concern
          </Button>
          <Button size="lg" className="w-full" variant="outline" onClick={() => setShowFeedbackDialog(true)}>
            <MessageSquare className="mr-2 h-5 w-5" />
            Submit Feedback
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t bg-muted/50 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <span className="font-semibold">OurSafeBase</span>
          </p>
        </div>
      </footer>

      <ReportConcernDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        eventId={event?.id || eventId!}
      />

      <SubmitFeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
        eventId={event?.id || eventId!}
        eventTitle={event?.title || ""}
        onOpenReportDialog={() => {
          setShowFeedbackDialog(false);
          setShowReportDialog(true);
        }}
      />

      <MembershipRequiredAlert
        open={showMembershipAlert}
        onOpenChange={setShowMembershipAlert}
      />
    </div>
  );
};

export default EventSafetyPage;
