import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { RouteLoadingFallback } from "./components/RouteLoadingFallback";

// Lazy load all route components
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const MyEvents = lazy(() => import("./pages/MyEvents"));
const SocietyDashboard = lazy(() => import("./pages/SocietyDashboard"));
const SocietyAttendee = lazy(() => import("./pages/SocietyAttendee"));
const SocietyMembers = lazy(() => import("./pages/SocietyMembers"));
const SocietyEvents = lazy(() => import("./pages/SocietyEvents"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const DuplicateEvent = lazy(() => import("./pages/DuplicateEvent"));
const EditEvent = lazy(() => import("./pages/EditEvent"));
const EventSafetyPage = lazy(() => import("./pages/EventSafetyPage"));
const SocietyReports = lazy(() => import("./pages/SocietyReports"));
const SocietyCodesOfConduct = lazy(() => import("./pages/SocietyCodesOfConduct"));
const InviteJoin = lazy(() => import("./pages/InviteJoin"));
const CommitteeOnboarding = lazy(() => import("./pages/CommitteeOnboarding"));
const EventSummary = lazy(() => import("./pages/EventSummary"));
const CodeOfConductView = lazy(() => import("./pages/CodeOfConductView"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const About = lazy(() => import("./pages/About"));
const AdminSocieties = lazy(() => import("./pages/AdminSocieties"));
const SocietySettings = lazy(() => import("./pages/SocietySettings"));
const SocietyAnalytics = lazy(() => import("./pages/SocietyAnalytics"));
const Feedback = lazy(() => import("./pages/Feedback"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-events" element={<MyEvents />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/onboarding" element={<CommitteeOnboarding />} />
          <Route path="/invite/:code" element={<InviteJoin />} />
          <Route path="/invite/:type/:code" element={<InviteJoin />} />
          <Route path="/code-of-conduct/:cocId" element={<CodeOfConductView />} />
          {/* New slug-based route for pretty URLs */}
          <Route path="/:societySlug/:eventSlug" element={<EventSafetyPage />} />
          <Route path="/:societySlug/:eventSlug/feedback" element={<Feedback />} />
          {/* Keep old UUID route for backwards compatibility */}
          <Route path="/event/:eventId" element={<EventSafetyPage />} />
          <Route path="/society/:slug" element={<SocietyAttendee />} />
          <Route path="/society/:slug/dashboard" element={<SocietyDashboard />} />
          <Route path="/society/:slug/settings" element={<SocietySettings />} />
          <Route path="/society/:slug/analytics" element={<SocietyAnalytics />} />
          <Route path="/society/:slug/members" element={<SocietyMembers />} />
          <Route path="/society/:slug/events" element={<SocietyEvents />} />
          <Route path="/society/:slug/events/new" element={<CreateEvent />} />
          <Route path="/society/:slug/events/:eventId/duplicate" element={<DuplicateEvent />} />
          <Route path="/society/:slug/events/:eventId/edit" element={<EditEvent />} />
          <Route path="/society/:slug/events/:eventId/summary" element={<EventSummary />} />
          <Route path="/society/:slug/reports" element={<SocietyReports />} />
          <Route path="/society/:slug/codes-of-conduct" element={<SocietyCodesOfConduct />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/admin/societies" element={<AdminSocieties />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
