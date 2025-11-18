import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Phone, Mail, MapPin, AlertCircle, Shield, MessageSquare, FileText, Copy, Loader2, ArrowLeft, Share2, ChevronRight, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { getEventStatus } from "@/lib/eventHelpers";
import { ReportConcernDialog } from "@/components/ReportConcernDialog";
import { SubmitFeedbackDialog } from "@/components/SubmitFeedbackDialog";
import CoCAcceptanceDialog from "@/components/CoCAcceptanceDialog";
import { MembershipRequiredAlert } from "@/components/MembershipRequiredAlert";
import { useAuth } from "@/lib/auth";
import { useCommitteeRole } from "@/lib/useCommitteeRole";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventQRCodeDialog } from "@/components/EventQRCodeDialog";
import { EventShareCard } from "@/components/EventShareCard";
import { EventSafetyPageSkeleton } from "@/components/EventSafetyPageSkeleton";
import { Footer } from "@/components/Footer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import {
  useEvent,
  useSociety,
  useEventContacts,
  useEmergencyInfo,
  useCodeOfConduct,
  useFAQs,
  useMembership,
  useCoCAcceptance,
  useTrackPageView,
  useInvalidateCoCQueries,
} from "@/hooks/useEventSafetyQueries";

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  society_id: string;
  created_by: string | null;
  slug: string;
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
  id?: string;
  name?: string;
  content?: string;
  file_url?: string;
  version?: number;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

const EventSafetyPage = () => {
  const { eventId, societySlug, eventSlug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showMembershipAlert, setShowMembershipAlert] = useState(false);
  const [showCoCDialog, setShowCoCDialog] = useState(false);
  const [showViewCoCDialog, setShowViewCoCDialog] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  // React Query hooks
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(eventId, societySlug, eventSlug);
  const { data: society } = useSociety(event?.society_id);
  const { data: welfareContacts = [] } = useEventContacts(event?.id);
  const { data: emergencyInfo } = useEmergencyInfo(event?.id);
  const { data: cocData } = useCodeOfConduct(event?.id, event?.society_id);
  const { data: faqs = [] } = useFAQs(event?.id);
  const { data: isSocietyMember = false, isLoading: membershipLoading } = useMembership(
    event?.society_id,
    user?.id
  );

  const isEventCreator = event?.created_by === user?.id;
  const { data: cocAcceptanceData } = useCoCAcceptance(
    event?.id,
    user?.id,
    cocData?.codeOfConduct?.id,
    cocData?.codeOfConduct?.version,
    isEventCreator
  );

  const trackPageViewMutation = useTrackPageView();
  const invalidateCoCQueries = useInvalidateCoCQueries();

  const { isCommittee, loading: roleLoading } = useCommitteeRole(event?.society_id);

  const codeOfConduct = cocData?.codeOfConduct;
  const hasEventLevelCoC = cocData?.hasEventLevelCoC;
  const cocRequired = cocAcceptanceData?.required || false;
  const loading = eventLoading || authLoading;
  const error = eventError ? (eventError as Error).message : null;

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      const redirectPath = societySlug && eventSlug 
        ? `/${societySlug}/${eventSlug}`
        : `/event/${eventId}`;
      navigate(`/auth?redirect=${redirectPath}&eventTitle=${event?.title || 'this event'}`);
    }
  }, [user, authLoading, navigate, eventId, societySlug, eventSlug, event?.title]);

  // Track page view when event is loaded
  useEffect(() => {
    if (event?.id && !eventLoading) {
      trackPageViewMutation.mutate(event.id);
    }
  }, [event?.id, eventLoading]);

  // Show CoC dialog if acceptance is required
  useEffect(() => {
    if (cocRequired && codeOfConduct) {
      setShowCoCDialog(true);
    }
  }, [cocRequired, codeOfConduct]);

  // Handle CoC acceptance completion
  const handleCoCAccepted = () => {
    if (event?.id && user?.id) {
      invalidateCoCQueries(event.id, user.id);
    }
    setShowCoCDialog(false);
  };

  const copyPhoneNumber = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success("Phone number copied!");
  };

  if (authLoading) {
    return <EventSafetyPageSkeleton />;
  }

  if (!user) {
    // Redirect is handled in useEffect
    return <EventSafetyPageSkeleton />;
  }

  if (loading) {
    return <EventSafetyPageSkeleton />;
  }

  // Show error state with reload option
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Failed to Load Event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show CoC dialog if required (handled separately at bottom of component)
  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full">
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

  const customEmergencyFields = Array.isArray(emergencyInfo?.custom_emergency_info) 
    ? emergencyInfo.custom_emergency_info 
    : [];
  
  // Check if there's any emergency information to display
  const hasEmergencyInfo = emergencyInfo && (
    emergencyInfo.nearest_hospital ||
    emergencyInfo.hospital_address ||
    emergencyInfo.hospital_phone ||
    emergencyInfo.nearest_pharmacy ||
    emergencyInfo.pharmacy_address ||
    emergencyInfo.pharmacy_phone ||
    emergencyInfo.on_duty_contact ||
    emergencyInfo.on_duty_phone ||
    customEmergencyFields.length > 0
  );

  const handleBackClick = () => {
    if (!society?.slug) return;
    
    if (isCommittee) {
      navigate(`/society/${society.slug}/dashboard`);
    } else {
      navigate(`/society/${society.slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-x-hidden">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-3 md:px-4 py-6 max-w-full">
          {/* Breadcrumbs */}
          {society && (
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={isCommittee ? `/society/${society.slug}/dashboard` : `/society/${society.slug}`}>
                      {isCommittee ? 'Society Dashboard' : 'Society'}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>{event.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}

          <div className="flex items-center justify-between gap-4">
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
              <img 
                src={logo} 
                alt="OurSafeBase" 
                className="h-10 cursor-pointer" 
                onClick={() => navigate("/")}
              />
              <div>
                <h1 className="text-2xl font-bold">{event.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.event_date), "PPP")}
                  {event.location && ` • ${event.location}`}
                </p>
              </div>
            </div>
            
            {/* Share Button */}
            {society && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0">
                  <EventShareCard
                    societySlug={society.slug}
                    eventSlug={eventSlug || event.slug}
                    eventTitle={event.title}
                    onShowQRCode={() => setQrDialogOpen(true)}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-3 py-4 md:px-4 md:py-8 space-y-6">
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
        {hasEmergencyInfo && (
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

        {/* Post-Event Feedback Link */}
        {getEventStatus(event.event_date) === 'past' && isSocietyMember && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">Share Your Experience</h3>
                  <p className="text-sm text-muted-foreground">
                    Help us improve future events with your feedback
                  </p>
                </div>
                <Button
                  onClick={() => navigate(`/${societySlug}/${eventSlug}/feedback`)}
                  className="w-full sm:w-auto sm:flex-shrink-0"
                  size="lg"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Submit Feedback
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQs Section */}
        {faqs.length > 0 && (
          <Card className="rounded-2xl hover:scale-[1.02] transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={faq.id} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Code of Conduct - Bottom Section */}
        {codeOfConduct && (
          <Card 
            className="border bg-muted/30 mt-8 cursor-pointer hover:bg-muted/40 hover:scale-[1.02] transition-all duration-200"
            onClick={() => {
              if (codeOfConduct.file_url && codeOfConduct.id) {
                window.open(`/code-of-conduct/${codeOfConduct.id}`, '_blank');
              } else if (codeOfConduct.file_url) {
                window.open(codeOfConduct.file_url, '_blank');
              } else {
                setShowViewCoCDialog(true);
              }
            }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-medium text-sm truncate">Code of Conduct</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              {!hasEventLevelCoC && isCommittee && (
                <div className="mt-2 p-2 bg-muted/50 rounded-md" onClick={(e) => e.stopPropagation()}>
                  <p className="text-xs text-muted-foreground">
                    No event-specific CoC.{" "}
                    <Button
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => navigate(`/society/${society?.slug}/events/${eventId}/edit`)}
                    >
                      Edit Event
                    </Button>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />

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

      {/* Disclaimer */}
      <div className="mt-12 mb-6">
        <Card className="bg-muted/30 border-muted-foreground/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3 text-xs text-muted-foreground leading-relaxed">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
              <p>
                <strong className="text-foreground">Important:</strong> OurSafeBase is a support tool and is not a substitute for professional medical, legal, or emergency services. If you're in immediate danger, please contact emergency services (999/112).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View CoC Dialog (no acceptance required) */}
      {showViewCoCDialog && codeOfConduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowViewCoCDialog(false)}>
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-2xl font-semibold">Code of Conduct</h2>
              {codeOfConduct.name && (
                <p className="text-sm text-muted-foreground mt-1">{codeOfConduct.name}</p>
              )}
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap">{codeOfConduct.content}</p>
              </div>
            </ScrollArea>
            <div className="p-6 border-t flex justify-end">
              <Button onClick={() => setShowViewCoCDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share Event Dialog */}
      {event && society && (
        <EventQRCodeDialog
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
          eventId={event.id}
          eventTitle={event.title}
          societySlug={society.slug}
          eventSlug={eventSlug || event.slug}
        />
      )}
    </div>
  );
};

export default EventSafetyPage;
