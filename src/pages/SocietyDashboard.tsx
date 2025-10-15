import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, AlertCircle, Settings, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

interface Society {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const SocietyDashboard = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [society, setSociety] = useState<Society | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    upcomingEvents: 0,
    totalMembers: 0,
    newReports: 0,
  });

  useEffect(() => {
    if (user && slug) {
      fetchSociety();
    }
  }, [user, slug]);

  useEffect(() => {
    if (society?.id) {
      fetchStats();
    }
  }, [society?.id]);

  const fetchSociety = async () => {
    const { data, error } = await supabase
      .from("societies")
      .select("*")
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

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted">
        <header className="border-b bg-background">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img src={logo} alt="OurSafeBase" className="h-8" />
              <div>
                <h1 className="text-xl font-bold">{society?.name}</h1>
                <p className="text-sm text-muted-foreground">Committee Dashboard</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="mb-8 grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Committee Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMembers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Reports</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.newReports}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
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

            <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => navigate(`/society/${slug}/reports`)}>
              <CardHeader>
                <AlertCircle className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>Reports</CardTitle>
                <CardDescription>Review and manage concern reports</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">View Reports</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => navigate(`/society/${slug}/settings`)}>
              <CardHeader>
                <Settings className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>Settings</CardTitle>
                <CardDescription>Manage society information and code of conduct</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Society Settings</Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default SocietyDashboard;
