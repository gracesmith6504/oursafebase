import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import MyEvents from "./pages/MyEvents";
import SocietyDashboard from "./pages/SocietyDashboard";
import SocietyAttendee from "./pages/SocietyAttendee";
import SocietyMembers from "./pages/SocietyMembers";
import SocietyEvents from "./pages/SocietyEvents";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import EventSafetyPage from "./pages/EventSafetyPage";
import SocietyReports from "./pages/SocietyReports";
import SocietyCodesOfConduct from "./pages/SocietyCodesOfConduct";
import InviteJoin from "./pages/InviteJoin";
import CommitteeOnboarding from "./pages/CommitteeOnboarding";
import EventSummary from "./pages/EventSummary";
import CodeOfConductView from "./pages/CodeOfConductView";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import AdminSocieties from "./pages/AdminSocieties";
import { ScrollToTop } from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
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
          {/* Keep old UUID route for backwards compatibility */}
          <Route path="/event/:eventId" element={<EventSafetyPage />} />
          <Route path="/society/:slug" element={<SocietyAttendee />} />
          <Route path="/society/:slug/dashboard" element={<SocietyDashboard />} />
          <Route path="/society/:slug/members" element={<SocietyMembers />} />
          <Route path="/society/:slug/events" element={<SocietyEvents />} />
          <Route path="/society/:slug/events/new" element={<CreateEvent />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
