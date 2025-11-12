import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { useCommitteeRole } from "@/lib/useCommitteeRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Users, AlertCircle, Shield, ArrowLeft, ChevronRight, Settings, BarChart3 } from "lucide-react";
import { logActivity } from "@/lib/activityLogger";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import logo from "@/assets/logo.png";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface Society {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  creator_email: string | null;
  is_verified: boolean;
}

const SocietyDashboard = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [society, setSociety] = useState<Society | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [stats, setStats] = useState({
    upcomingEvents: 0,
    totalMembers: 0,
    newReports: 0,
  });
  const { isCommittee, loading: roleLoading } = useCommitteeRole(society?.id);

  useEffect(() => {
    if (user && slug) {
      fetchSociety();
    }
  }, [user, slug]);

  useEffect(() => {
    if (society?.id) {
      fetchStats();
      logActivity({ activityType: 'view_dashboard', societyId: society.id });
    }
  }, [society?.id]);

  useEffect(() => {
    if (user && society) {
      checkIsCreator();
    }
  }, [user, society]);

  const checkIsCreator = async () => {
    if (!user || !society) return;

    const { data } = await supabase.rpc('is_society_creator', {
      _user_id: user.id,
      _society_id: society.id
    });

    setIsCreator(data || false);
  };

  const fetchSociety = async () => {
    const { data, error } = await supabase
      .from("societies")
      .select("id, name, slug, logo_url, creator_email, is_verified")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      toast.error("Society not found");
      navigate("/dashboard");
      return;
    }

    // Check if user is a member
    const { data: member } = await supabase
      .from("society_members")
      .select("*")
      .eq("society_id", data.id)
      .eq("user_id", user?.id)
      .single();

    if (!member) {
      toast.error("You're not a member of this society");
      navigate("/dashboard");
      return;
    }

    setSociety(data);
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!society) return;

    // Count upcoming events
    const { count: eventCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("society_id", society.id)
      .eq("status", "upcoming");

    // Count members
    const { count: memberCount } = await supabase
      .from("society_members")
      .select("*", { count: "exact", head: true })
      .eq("society_id", society.id);

    // Count new reports
    const { count: reportCount } = await supabase
      .from("reports")
      .select("event:events!inner(society_id)", { count: "exact", head: true })
      .eq("event.society_id", society.id)
      .eq("status", "new");

    setStats({
      upcomingEvents: eventCount || 0,
      totalMembers: memberCount || 0,
      newReports: reportCount || 0,
    });
  };

  if (loading || roleLoading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isCommittee) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Committee Access Required</CardTitle>
              <CardDescription>
                You need committee access to view this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/my-events')}>
                Back to My Events
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted">
        <header className="border-b bg-background">
          <div className="container mx-auto px-4 py-4">
            {/* Breadcrumbs */}
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>{society?.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {society?.logo_url ? (
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                    <AvatarImage src={society.logo_url} alt={society.name} />
                    <AvatarFallback>{society.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ) : (
                  <img src={logo} alt="OurSafeBase" className="h-6 sm:h-8 shrink-0" />
                )}
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 truncate">
                    {society?.name}
                    {society?.is_verified && <VerifiedBadge size="md" />}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Committee Dashboard</p>
                </div>
              </div>
              {isCreator && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(`/society/${slug}/settings`)}
                  className="shrink-0"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => navigate(`/society/${slug}/reports`)}>
              <CardHeader className="relative">
                <AlertCircle className="mb-2 h-10 w-10 text-primary" />
                {stats.newReports > 0 && (
                  <div className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-sm font-bold text-destructive-foreground">
                    {stats.newReports}
                  </div>
                )}
                <CardTitle>Reports</CardTitle>
                <CardDescription>Review and manage concern reports</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">View Reports</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => navigate(`/society/${slug}/events`)}>
              <CardHeader>
                <Calendar className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>Events</CardTitle>
                <CardDescription>Create and manage your society events</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Manage Events</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => navigate(`/society/${slug}/members`)}>
              <CardHeader>
                <Users className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>Members</CardTitle>
                <CardDescription>View committee members and share invite link</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">View Members</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => navigate(`/society/${slug}/codes-of-conduct`)}>
              <CardHeader>
                <Shield className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>Codes of Conduct</CardTitle>
                <CardDescription>Manage and create codes of conduct for your events</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Manage CoCs</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => navigate(`/society/${slug}/analytics`)}>
              <CardHeader>
                <BarChart3 className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>Analytics</CardTitle>
                <CardDescription>View detailed insights and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">View Analytics</Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default SocietyDashboard;
