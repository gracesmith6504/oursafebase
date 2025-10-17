import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, CheckCircle2, XCircle, Users } from "lucide-react";
import { AttendeeAcceptance, calculateAcceptanceRate } from "@/lib/reportAnalytics";
import { format } from "date-fns";

interface EventCoCAcceptancesListProps {
  attendees: AttendeeAcceptance[];
  loading?: boolean;
}

export const EventCoCAcceptancesList = ({ attendees, loading }: EventCoCAcceptancesListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'accepted' | 'not_accepted'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'committee' | 'attendee'>('all');

  // Calculate stats
  const stats = useMemo(() => {
    const total = attendees.length;
    const accepted = attendees.filter(a => a.has_accepted).length;
    const rate = calculateAcceptanceRate(total, accepted);
    return { total, accepted, rate };
  }, [attendees]);

  // Filter attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter(attendee => {
      // Search filter
      const matchesSearch = !searchQuery || 
        (attendee.display_name?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Status filter
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'accepted' && attendee.has_accepted) ||
        (statusFilter === 'not_accepted' && !attendee.has_accepted);
      
      // Role filter
      const matchesRole = 
        roleFilter === 'all' || 
        attendee.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [attendees, searchQuery, statusFilter, roleFilter]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CoC Acceptances</CardTitle>
          <CardDescription>Loading attendance data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Code of Conduct Acceptances</CardTitle>
            <CardDescription>
              {stats.accepted} of {stats.total} members accepted ({stats.rate}%)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{stats.total}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="not_accepted">Not Accepted</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All Roles</TabsTrigger>
              <TabsTrigger value="committee">Committee</TabsTrigger>
              <TabsTrigger value="attendee">Attendees</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Attendees List */}
        <div className="space-y-2">
          {filteredAttendees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No attendees found matching your filters</p>
            </div>
          ) : (
            filteredAttendees.map((attendee) => (
              <div
                key={attendee.user_id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={attendee.avatar_url || undefined} />
                    <AvatarFallback>
                      {attendee.display_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">
                        {attendee.display_name || 'Unknown User'}
                      </p>
                      <Badge variant={attendee.role === 'committee' ? 'default' : 'secondary'}>
                        {attendee.role}
                      </Badge>
                    </div>
                    
                    {attendee.has_accepted && attendee.accepted_at ? (
                      <p className="text-xs text-muted-foreground">
                        Accepted {format(new Date(attendee.accepted_at), 'MMM d, yyyy')}
                        {attendee.accepted_version && ` • v${attendee.accepted_version}`}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Not accepted yet
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {attendee.has_accepted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};