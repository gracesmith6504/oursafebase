import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { useCommitteeRole } from "@/lib/useCommitteeRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  Calendar, 
  AlertCircle,
  Clock,
  CheckCircle,
  Activity,
  BarChart3
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Society {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  member_count: number;
  activation_date: string | null;
  created_at: string;
}

interface AnalyticsData {
  totalMembers: number;
  activeMembers: number;
  totalEvents: number;
  upcomingEvents: number;
  totalReports: number;
  resolvedReports: number;
  avgResponseTimeMinutes: number;
  avgSafetyScore: number;
  memberGrowth: Array<{ date: string; count: number }>;
  eventFrequency: Array<{ month: string; count: number }>;
  reportsByStatus: Array<{ status: string; count: number }>;
  activityByType: Array<{ type: string; count: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const SocietyAnalytics = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [society, setSociety] = useState<Society | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const { isCommittee, loading: roleLoading } = useCommitteeRole(society?.id);

  useEffect(() => {
    if (user && slug) {
      fetchData();
    }
  }, [user, slug]);

  useEffect(() => {
    if (society) {
      logActivity({ 
        activityType: 'view_dashboard', 
        societyId: society.id,
        metadata: { page: 'analytics' }
      });
    }
  }, [society]);

  const fetchData = async () => {
    try {
      // Fetch society
      const { data: societyData, error: societyError } = await supabase
        .from("societies")
        .select("*")
        .eq("slug", slug)
        .single();

      if (societyError || !societyData) {
        toast.error("Society not found");
        navigate("/dashboard");
        return;
      }

      setSociety(societyData);

      // Check membership
      const { data: member } = await supabase
        .from("society_members")
        .select("*")
        .eq("society_id", societyData.id)
        .eq("user_id", user?.id)
        .single();

      if (!member) {
        toast.error("You're not a member of this society");
        navigate("/dashboard");
        return;
      }

      // Fetch analytics data
      await fetchAnalytics(societyData.id);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load analytics");
      setLoading(false);
    }
  };

  const fetchAnalytics = async (societyId: string) => {
    // Total and active members
    const { data: members } = await supabase
      .from("society_members")
      .select("user_id, joined_at")
      .eq("society_id", societyId);

    const totalMembers = members?.length || 0;

    // Active members (logged in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: activeProfiles } = await supabase
      .from("profiles")
      .select("id")
      .in("id", members?.map(m => m.user_id) || [])
      .gte("last_login_at", thirtyDaysAgo.toISOString());

    const activeMembers = activeProfiles?.length || 0;

    // Events
    const { data: events } = await supabase
      .from("events")
      .select("id, event_date, created_at")
      .eq("society_id", societyId);

    const totalEvents = events?.length || 0;
    const upcomingEvents = events?.filter(e => new Date(e.event_date) > new Date()).length || 0;

    // Reports
    const { data: reports } = await supabase
      .from("reports")
      .select("id, status, response_time_minutes, event:events!inner(society_id)")
      .eq("event.society_id", societyId);

    const totalReports = reports?.length || 0;
    const resolvedReports = reports?.filter(r => r.status === 'resolved' || r.status === 'closed').length || 0;
    
    const responseTimes = reports?.filter(r => r.response_time_minutes !== null).map(r => r.response_time_minutes!) || [];
    const avgResponseTimeMinutes = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    // Safety score from feedback
    const { data: feedback } = await supabase
      .from("event_feedback")
      .select("felt_safe, event:events!inner(society_id)")
      .eq("event.society_id", societyId);

    const safetyScores = feedback?.map(f => {
      switch(f.felt_safe) {
        case 'very_safe': return 5;
        case 'mostly_safe': return 4;
        case 'somewhat_safe': return 3;
        case 'unsafe': return 2;
        case 'very_unsafe': return 1;
        default: return 0;
      }
    }) || [];

    const avgSafetyScore = safetyScores.length > 0
      ? Math.round((safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length) * 100) / 100
      : 0;

    // Member growth over last 6 months
    const memberGrowth = calculateMemberGrowth(members || []);

    // Event frequency by month (last 6 months)
    const eventFrequency = calculateEventFrequency(events || []);

    // Reports by status
    const reportsByStatus = [
      { status: 'New', count: reports?.filter(r => r.status === 'new').length || 0 },
      { status: 'In Progress', count: reports?.filter(r => r.status === 'in_progress').length || 0 },
      { status: 'Resolved', count: reports?.filter(r => r.status === 'resolved').length || 0 },
      { status: 'Closed', count: reports?.filter(r => r.status === 'closed').length || 0 },
    ];

    // Activity by type (last 30 days)
    const { data: activities } = await supabase
      .from("user_activity_logs")
      .select("activity_type")
      .eq("society_id", societyId)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const activityCounts = activities?.reduce((acc, curr) => {
      acc[curr.activity_type] = (acc[curr.activity_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const activityByType = Object.entries(activityCounts).map(([type, count]) => ({
      type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count
    }));

    setAnalytics({
      totalMembers,
      activeMembers,
      totalEvents,
      upcomingEvents,
      totalReports,
      resolvedReports,
      avgResponseTimeMinutes,
      avgSafetyScore,
      memberGrowth,
      eventFrequency,
      reportsByStatus,
      activityByType
    });
  };

  const calculateMemberGrowth = (members: any[]) => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData: Record<string, number> = {};
    
    members.forEach(member => {
      const joinDate = new Date(member.joined_at);
      if (joinDate >= sixMonthsAgo) {
        const monthKey = joinDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      }
    });

    return Object.entries(monthlyData).map(([date, count]) => ({ date, count }));
  };

  const calculateEventFrequency = (events: any[]) => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData: Record<string, number> = {};
    
    events.forEach(event => {
      const eventDate = new Date(event.created_at);
      if (eventDate >= sixMonthsAgo) {
        const monthKey = eventDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      }
    });

    return Object.entries(monthlyData).map(([month, count]) => ({ month, count }));
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
                You need committee access to view analytics.
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
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/society/${slug}/dashboard`}>{society?.name}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>Analytics</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/society/${slug}/dashboard`)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              {society?.logo_url && (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={society.logo_url} alt={society.name} />
                  <AvatarFallback>{society.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              <div>
                <h1 className="text-2xl font-bold">{society?.name} Analytics</h1>
                <p className="text-sm text-muted-foreground">Comprehensive performance insights</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalMembers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.activeMembers || 0} active (30d)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalEvents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.upcomingEvents || 0} upcoming
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Reports</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalReports || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.resolvedReports || 0} resolved
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.avgResponseTimeMinutes 
                    ? `${Math.floor(analytics.avgResponseTimeMinutes / 60)}h ${analytics.avgResponseTimeMinutes % 60}m`
                    : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">First response time</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="growth" className="space-y-4">
            <TabsList>
              <TabsTrigger value="growth">Growth & Engagement</TabsTrigger>
              <TabsTrigger value="reports">Reports & Safety</TabsTrigger>
              <TabsTrigger value="activity">Activity Tracking</TabsTrigger>
            </TabsList>

            <TabsContent value="growth" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Member Growth</CardTitle>
                    <CardDescription>New members over last 6 months</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        count: { label: "Members", color: "hsl(var(--primary))" }
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics?.memberGrowth || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Event Frequency</CardTitle>
                    <CardDescription>Events created per month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        count: { label: "Events", color: "hsl(var(--secondary))" }
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics?.eventFrequency || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="count" fill="hsl(var(--secondary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Reports by Status</CardTitle>
                    <CardDescription>Distribution of report statuses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        count: { label: "Reports", color: "hsl(var(--primary))" }
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics?.reportsByStatus || []}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {analytics?.reportsByStatus?.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Safety Metrics</CardTitle>
                    <CardDescription>Key safety performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Average Safety Score</span>
                        <span className="text-2xl font-bold">{analytics?.avgSafetyScore || 0}/5</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${((analytics?.avgSafetyScore || 0) / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Resolution Rate</span>
                        <span className="text-2xl font-bold">
                          {analytics?.totalReports 
                            ? Math.round((analytics.resolvedReports / analytics.totalReports) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ 
                            width: analytics?.totalReports 
                              ? `${(analytics.resolvedReports / analytics.totalReports) * 100}%`
                              : '0%'
                          }}
                        />
                      </div>
                    </div>

                    <div className="pt-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{analytics?.resolvedReports || 0} reports resolved</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">
                          {analytics?.avgResponseTimeMinutes 
                            ? `${Math.floor(analytics.avgResponseTimeMinutes / 60)}h ${analytics.avgResponseTimeMinutes % 60}m avg response`
                            : 'No data'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Activity (Last 30 Days)</CardTitle>
                  <CardDescription>Breakdown of actions taken by society members</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      count: { label: "Actions", color: "hsl(var(--accent))" }
                    }}
                    className="h-[400px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics?.activityByType || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="type" type="category" width={150} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--accent))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default SocietyAnalytics;
