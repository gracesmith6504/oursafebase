import { useState, useEffect, useMemo, useCallback, lazy, Suspense, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Shield,
  MessageSquare,
  FileText,
  Copy,
  Loader2,
  ArrowLeft,
  Share2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { getEventStatus, shouldShowPostEventFeedback } from "@/lib/eventHelpers";
import CoCAcceptanceDialog from "@/components/CoCAcceptanceDialog";
import { MembershipRequiredAlert } from "@/components/MembershipRequiredAlert";
import { useAuthContext } from "@/lib/AuthContext";
import { useCommitteeRole } from "@/lib/useCommitteeRole";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventShareCard } from "@/components/EventShareCard";
import { EventSafetyPageSkeleton } from "@/components/EventSafetyPageSkeleton";
import { Footer } from "@/components/Footer";
import { LazyImage } from "@/components/LazyImage";
import { LazyAvatar } from "@/components/LazyAvatar";
import { ImportantContactsCard, EmergencyInfoCard, FAQsCard } from "@/components/EventSafetyComponents";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SectionErrorFallback } from "@/components/SectionErrorFallback";
import DOMPurify from "dompurify";

// Lazy load heavy dialog components to reduce initial bundle size
const ReportConcernDialog = lazy(() =>
  import("@/components/ReportConcernDialog").then((module) => ({ default: module.ReportConcernDialog })),
);
const SubmitFeedbackDialog = lazy(() =>
  import("@/components/SubmitFeedbackDialog").then((module) => ({ default: module.SubmitFeedbackDialog })),
);
const EventQRCodeDialog = lazy(() =>
  import("@/components/EventQRCodeDialog").then((module) => ({ default: module.EventQRCodeDialog })),
);
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
  useFeedbackQuestionsCount,
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
  content_type?: "text" | "markdown";
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
  const { user, loading: authLoading } = useAuthContext();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showMembershipAlert, setShowMembershipAlert] = useState(false);
  const [showCoCDialog, setShowCoCDialog] = useState(false);
  const [showViewCoCDialog, setShowViewCoCDialog] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [cocAcceptedThisSession, setCocAcceptedThisSession] = useState(false);

  // React Query hooks
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(eventId, societySlug, eventSlug);
  const { data: society } = useSociety(event?.society_id);
  const { data: welfareContacts = [] } = useEventContacts(event?.id);
  const { data: emergencyInfo } = useEmergencyInfo(event?.id);
  const { data: cocData } = useCodeOfConduct(event?.id, event?.society_id);
  const { data: faqs = [] } = useFAQs(event?.id);
  const { data: feedbackQuestionsCount = 0 } = useFeedbackQuestionsCount(event?.id);
  const { data: isSocietyMember = false, isLoading: membershipLoading } = useMembership(event?.society_id, user?.id);

  const { data: cocAcceptanceData } = useCoCAcceptance(
    event?.id,
    user?.id,
    cocData?.codeOfConduct?.id,
    cocData?.codeOfConduct?.version,
  );

  const trackPageViewMutation = useTrackPageView();
  const invalidateCoCQueries = useInvalidateCoCQueries();

  const { isCommittee, loading: roleLoading } = useCommitteeRole(event?.society_id);

  // Memoized derived values to prevent unnecessary re-renders
  const codeOfConduct = useMemo(() => cocData?.codeOfConduct, [cocData?.codeOfConduct]);
  const hasEventLevelCoC = useMemo(() => cocData?.hasEventLevelCoC, [cocData?.hasEventLevelCoC]);
  const cocRequired = useMemo(() => cocAcceptanceData?.required || false, [cocAcceptanceData?.required]);
  const hasFeedbackQuestions = useMemo(() => feedbackQuestionsCount > 0, [feedbackQuestionsCount]);
  const loading = useMemo(() => eventLoading || authLoading, [eventLoading, authLoading]);
  const error = useMemo(() => (eventError ? (eventError as Error).message : null), [eventError]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      const redirectPath = societySlug && eventSlug ? `/${societySlug}/${eventSlug}` : `/event/${eventId}`;
      navigate(`/auth?redirect=${redirectPath}&eventTitle=${event?.title || "this event"}`);
    }
  }, [user, authLoading, navigate, eventId, societySlug, eventSlug, event?.title]);

  // Track page view when event is loaded
  useEffect(() => {
    if (event?.id && !eventLoading) {
      trackPageViewMutation.mutate(event.id);
    }
  }, [event?.id, eventLoading]);

  // Show CoC dialog if acceptance is required (only if not already accepted this session)
  useEffect(() => {
    if (cocRequired && codeOfConduct && !cocAcceptedThisSession) {
      setShowCoCDialog(true);
    } else if (!cocRequired || cocAcceptedThisSession) {
      setShowCoCDialog(false);
    }
  }, [cocRequired, codeOfConduct, cocAcceptedThisSession]);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleCoCAccepted = useCallback(() => {
    setCocAcceptedThisSession(true);
    setShowCoCDialog(false);
    if (event?.id && user?.id) {
      invalidateCoCQueries(event.id, user.id);
    }
  }, [event?.id, user?.id, invalidateCoCQueries]);

  const copyPhoneNumber = useCallback((phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success("Phone number copied!");
  }, []);

  // Memoized computed values (must be before early returns)
  const customEmergencyFields = useMemo(() => {
    const fields = emergencyInfo?.custom_emergency_info;
    return Array.isArray(fields)
      ? (fields as Array<{
          label: string;
          name?: string;
          address?: string;
          phone?: string;
        }>)
      : [];
  }, [emergencyInfo?.custom_emergency_info]);

  const hasEmergencyInfo = useMemo(
    () =>
      emergencyInfo &&
      (emergencyInfo.nearest_hospital ||
        emergencyInfo.hospital_address ||
        emergencyInfo.hospital_phone ||
        emergencyInfo.nearest_pharmacy ||
        emergencyInfo.pharmacy_address ||
        emergencyInfo.pharmacy_phone ||
        emergencyInfo.on_duty_contact ||
        emergencyInfo.on_duty_phone ||
        customEmergencyFields.length > 0),
    [emergencyInfo, customEmergencyFields],
  );

  const eventStatus = useMemo(() => (event ? getEventStatus(event.event_date, event.event_end_date) : null), [event]);

  const showPostEventFeedback = useMemo(
    () => (event ? shouldShowPostEventFeedback(event.event_date, event.event_end_date) && hasFeedbackQuestions : false),
    [event, hasFeedbackQuestions],
  );

  const handleBackClick = useCallback(() => {
    if (!society?.slug) return;

    if (isCommittee) {
      navigate(`/society/${society.slug}/dashboard`);
    } else {
      navigate(`/society/${society.slug}`);
    }
  }, [society?.slug, isCommittee, navigate]);

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
            <Button onClick={() => window.location.reload()} className="w-full">
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
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={isCommittee ? `/society/${society.slug}/dashboard` : `/society/${society.slug}`}>
                      {isCommittee ? "Society Dashboard" : "Society"}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>{event.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {society && (
                <Button variant="ghost" size="icon" onClick={handleBackClick} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <LazyImage src={logo} alt="OurSafeBase" className="h-10 cursor-pointer" onClick={() => navigate("/")} />
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
        <ErrorBoundary fallback={<SectionErrorFallback sectionName="Important Contacts" />}>
          <ImportantContactsCard contacts={welfareContacts} onCopyPhone={copyPhoneNumber} />
        </ErrorBoundary>

        {/* Emergency Information */}
        <ErrorBoundary fallback={<SectionErrorFallback sectionName="Emergency Information" />}>
          <EmergencyInfoCard emergencyInfo={emergencyInfo} customFields={customEmergencyFields} />
        </ErrorBoundary>

        {/* Action Buttons */}
        <ErrorBoundary fallback={<SectionErrorFallback sectionName="Action Buttons" />}>
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
        </ErrorBoundary>

        {/* Post-Event Feedback Link */}
        {showPostEventFeedback && (
          <ErrorBoundary fallback={<SectionErrorFallback sectionName="Post-Event Feedback" />}>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-base">Share Your Experience</h3>
                    <p className="text-sm text-muted-foreground">Help us improve future events with your feedback</p>
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
          </ErrorBoundary>
        )}

        {/* FAQs Section */}
        <ErrorBoundary fallback={<SectionErrorFallback sectionName="FAQs" />}>
          <FAQsCard faqs={faqs} />
        </ErrorBoundary>

        {/* Code of Conduct - Bottom Section */}
        {codeOfConduct && (
          <ErrorBoundary fallback={<SectionErrorFallback sectionName="Code of Conduct" />}>
            <Card
              className="border bg-muted/30 mt-8 cursor-pointer hover:bg-muted/40 hover:scale-[1.02] transition-all duration-200"
              onClick={() => {
                if (codeOfConduct.file_url && codeOfConduct.id) {
                  window.open(`/code-of-conduct/${codeOfConduct.id}`, "_blank");
                } else if (codeOfConduct.file_url) {
                  window.open(codeOfConduct.file_url, "_blank");
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
          </ErrorBoundary>
        )}
      </main>

      <Footer />

      {/* Dialogs wrapped in error boundaries */}
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <ReportConcernDialog
            open={showReportDialog}
            onOpenChange={setShowReportDialog}
            eventId={event?.id || eventId!}
          />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
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
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={null}>
        <MembershipRequiredAlert open={showMembershipAlert} onOpenChange={setShowMembershipAlert} />
      </ErrorBoundary>

      {/* Disclaimer */}
      <ErrorBoundary fallback={null}>
        <div className="mt-12 mb-6">
          <Card className="bg-muted/30 border-muted-foreground/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3 text-xs text-muted-foreground leading-relaxed">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                <p>
                  <strong className="text-foreground">Important:</strong> OurSafeBase is a support tool and is not a
                  substitute for professional medical, legal, or emergency services. If you're in immediate danger,
                  please contact emergency services (999/112).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>

      {/* View CoC Dialog (no acceptance required) */}
      {showViewCoCDialog && codeOfConduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowViewCoCDialog(false)}
        >
          <div
            className="bg-background rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <h2 className="text-2xl font-semibold">Code of Conduct</h2>
              {codeOfConduct.name && <p className="text-sm text-muted-foreground mt-1">{codeOfConduct.name}</p>}
            </div>

            {/* 👇 this is now the scrollable area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="border rounded-md bg-background px-4 py-4">
                <div className="ql-snow">
                  <div
                    className="ql-editor !min-h-0"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(codeOfConduct.content || "", {
                        ALLOWED_TAGS: [
                          "p",
                          "br",
                          "strong",
                          "em",
                          "u",
                          "ul",
                          "ol",
                          "li",
                          "h1",
                          "h2",
                          "h3",
                          "h4",
                          "h5",
                          "h6",
                          "span",
                          "a",
                          "blockquote",
                          "code",
                          "pre",
                        ],
                        ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
                      }),
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end">
              <Button onClick={() => setShowViewCoCDialog(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* CoC Acceptance Dialog (required acceptance) */}
      <ErrorBoundary fallback={null}>
        {showCoCDialog && codeOfConduct && event && (
          <CoCAcceptanceDialog
            eventId={event.id}
            eventTitle={event.title}
            cocId={codeOfConduct.id!}
            cocVersion={codeOfConduct.version || 1}
            cocContent={codeOfConduct.content}
            cocFileUrl={codeOfConduct.file_url}
            cocContentType={(codeOfConduct.content_type as "text" | "markdown") || "text"}
            onAccepted={handleCoCAccepted}
          />
        )}
      </ErrorBoundary>

      {/* Share Event Dialog */}
      <ErrorBoundary fallback={null}>
        {event && society && (
          <Suspense fallback={null}>
            <EventQRCodeDialog
              open={qrDialogOpen}
              onOpenChange={setQrDialogOpen}
              eventId={event.id}
              eventTitle={event.title}
              societySlug={society.slug}
              eventSlug={eventSlug || event.slug}
            />
          </Suspense>
        )}
      </ErrorBoundary>
    </div>
  );
};

export default EventSafetyPage;
