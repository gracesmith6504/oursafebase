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
  Users, 
  Calendar, 
  AlertCircle,
  Clock,
  CheckCircle
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
      await fetchAnalytics(societyData.id, societyData.created_at);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load analytics");
      setLoading(false);
    }
  };

  const fetchAnalytics = async (societyId: string, societyCreatedAt: string) => {
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

    // Member growth since society creation
    const memberGrowth = calculateMemberGrowth(members || [], societyCreatedAt);

    // Event frequency since society creation
    const eventFrequency = calculateEventFrequency(events || [], societyCreatedAt);

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

  const calculateMemberGrowth = (members: any[], societyCreatedAt: string) => {
    const societyCreated = new Date(societyCreatedAt);
    const now = new Date();
    
    // Calculate number of months from society creation to now
    const monthsDiff = (now.getFullYear() - societyCreated.getFullYear()) * 12 
                      + (now.getMonth() - societyCreated.getMonth());

    // Create array from society creation to now
    const months: Array<{ date: string; count: number }> = [];
    for (let i = 0; i <= monthsDiff; i++) {
      const d = new Date(societyCreated);
      d.setMonth(d.getMonth() + i);
      const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months.push({ date: monthKey, count: 0 });
    }
    
    // Count members joined in each month
    members.forEach(member => {
      const joinDate = new Date(member.joined_at);
      if (joinDate >= societyCreated) {
        const monthKey = joinDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const monthEntry = months.find(m => m.date === monthKey);
        if (monthEntry) {
          monthEntry.count += 1;
        }
      }
    });

    return months;
  };

  const calculateEventFrequency = (events: any[], societyCreatedAt: string) => {
    const societyCreated = new Date(societyCreatedAt);
    const now = new Date();
    
    // Calculate number of months from society creation to now
    const monthsDiff = (now.getFullYear() - societyCreated.getFullYear()) * 12 
                      + (now.getMonth() - societyCreated.getMonth());

    // Create array from society creation to now
    const months: Array<{ month: string; count: number }> = [];
    for (let i = 0; i <= monthsDiff; i++) {
      const d = new Date(societyCreated);
      d.setMonth(d.getMonth() + i);
      const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months.push({ month: monthKey, count: 0 });
    }
    
    // Count events created in each month
    events.forEach(event => {
      const eventDate = new Date(event.created_at);
      if (eventDate >= societyCreated) {
        const monthKey = eventDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const monthEntry = months.find(m => m.month === monthKey);
        if (monthEntry) {
          monthEntry.count += 1;
        }
      }
    });

    return months;
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
      <div className="min-h-screen bg-muted overflow-x-hidden">
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

        <main className="container mx-auto px-3 py-4 md:px-4 md:py-8 max-w-full">
          {/* Key Metrics */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs md:text-sm font-medium">Total Members</CardTitle>
                <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">{analytics?.totalMembers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.activeMembers || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs md:text-sm font-medium">Total Events</CardTitle>
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">{analytics?.totalEvents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.upcomingEvents || 0} upcoming
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs md:text-sm font-medium">Reports</CardTitle>
                <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">{analytics?.totalReports || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.resolvedReports || 0} resolved
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs md:text-sm font-medium">Avg Response</CardTitle>
                <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">
                  {analytics?.avgResponseTimeMinutes 
                    ? `${Math.floor(analytics.avgResponseTimeMinutes / 60)}h ${analytics.avgResponseTimeMinutes % 60}m`
                    : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">First response</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="growth" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="growth">Growth</TabsTrigger>
              <TabsTrigger value="reports">Safety</TabsTrigger>
            </TabsList>

            <TabsContent value="growth" className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2 w-full">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">Member Growth</CardTitle>
                    <CardDescription className="text-xs">Since society creation</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-hidden">
                    <ChartContainer
                      config={{
                        count: { label: "Members", color: "hsl(var(--primary))" }
                      }}
                      className="h-[200px] md:h-[300px]"
                    >
                       <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics?.memberGrowth || []} margin={{ left: -20, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" fontSize={10} />
                          <YAxis allowDecimals={false} fontSize={10} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">Event Frequency</CardTitle>
                    <CardDescription className="text-xs">Since society creation</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-hidden">
                    <ChartContainer
                      config={{
                        count: { label: "Events", color: "hsl(var(--secondary))" }
                      }}
                      className="h-[200px] md:h-[300px]"
                    >
                       <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics?.eventFrequency || []} margin={{ left: -20, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" fontSize={10} />
                          <YAxis allowDecimals={false} fontSize={10} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="count" fill="hsl(var(--secondary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2 w-full">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">Reports by Status</CardTitle>
                    <CardDescription className="text-xs">Distribution of report statuses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        count: { label: "Reports", color: "hsl(var(--primary))" }
                      }}
                      className="h-[200px] md:h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics?.reportsByStatus || []}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry) => entry.count > 0 ? entry.status : ''}
                            fontSize={10}
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
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">Safety Metrics</CardTitle>
                    <CardDescription className="text-xs">Key safety performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs md:text-sm font-medium">Average Safety Score</span>
                        <span className="text-lg md:text-2xl font-bold">{analytics?.avgSafetyScore || 0}/5</span>
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
                        <span className="text-xs md:text-sm font-medium">Resolution Rate</span>
                        <span className="text-lg md:text-2xl font-bold">
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
                        <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                        <span className="text-xs md:text-sm">{analytics?.resolvedReports || 0} reports resolved</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                        <span className="text-xs md:text-sm">
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
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default SocietyAnalytics;
