import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
import InviteJoin from "./pages/InviteJoin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-events" element={<MyEvents />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/invite/:code" element={<InviteJoin />} />
          <Route path="/invite/:type/:code" element={<InviteJoin />} />
          <Route path="/event/:eventId" element={<EventSafetyPage />} />
          <Route path="/society/:slug" element={<SocietyAttendee />} />
          <Route path="/society/:slug/dashboard" element={<SocietyDashboard />} />
          <Route path="/society/:slug/members" element={<SocietyMembers />} />
          <Route path="/society/:slug/events" element={<SocietyEvents />} />
          <Route path="/society/:slug/events/new" element={<CreateEvent />} />
          <Route path="/society/:slug/events/:eventId/edit" element={<EditEvent />} />
          <Route path="/society/:slug/reports" element={<SocietyReports />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
