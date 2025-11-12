import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Copy, Check, Bell, QrCode, ChevronRight, Search } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import { SocietyInviteQRCodeDialog } from "@/components/SocietyInviteQRCodeDialog";
import logo from "@/assets/logo.png";
import { toast } from "sonner";
import { getAppUrl } from "@/lib/constants";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface Society {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  attendee_invite_code: string;
  committee_invite_code: string;
  creator_email: string | null;
  is_verified: boolean;
}

interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  role: 'committee' | 'attendee';
  email_notifications_enabled: boolean;
  profiles: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    phone_number: string | null;
  };
}

const SocietyMembers = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [society, setSociety] = useState<Society | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCommittee, setCopiedCommittee] = useState(false);
  const [copiedAttendee, setCopiedAttendee] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [committeeQrDialogOpen, setCommitteeQrDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  const committeeInviteUrl = society ? `${getAppUrl()}/invite/committee/${society.committee_invite_code}` : "";
  const attendeeInviteUrl = society ? `${getAppUrl()}/invite/attendee/${society.attendee_invite_code}` : "";

  const committeeCount = members.filter(m => m.role === 'committee').length;
  const attendeeCount = members.filter(m => m.role === 'attendee').length;

  const filteredAttendees = useMemo(() => {
    if (!searchTerm) return members.filter(m => m.role === 'attendee');
    
    const lowerSearch = searchTerm.toLowerCase();
    return members
      .filter(m => m.role === 'attendee')
      .filter(m => 
        m.profiles?.display_name?.toLowerCase().includes(lowerSearch)
      );
  }, [members, searchTerm]);

  useEffect(() => {
    if (user && slug) {
      fetchSociety();
    }
  }, [user, slug]);

  useEffect(() => {
    if (society?.id) {
      fetchMembers();
    }
  }, [society?.id]);

  useEffect(() => {
    if (user && society) {
      checkCreator();
    }
  }, [user, society]);

  const checkCreator = async () => {
    if (!user || !society) return;
    
    const { data } = await supabase.rpc('is_society_creator', {
      _user_id: user.id,
      _society_id: society.id
    });
    
    setIsCreator(data || false);
  };

  const fetchSociety = async () => {
    // Fetch basic society info (available to all members)
    const { data: basicData, error: basicError } = await supabase
      .from("societies")
      .select("id, name, slug, logo_url, creator_email, is_verified, created_at, updated_at")
      .eq("slug", slug)
      .single();

    if (basicError || !basicData) {
      navigate("/dashboard");
      return;
    }

    // Fetch invite codes using security definer function (committee only)
    const { data: inviteCodes } = await supabase
      .rpc("get_society_invite_codes", { society_id: basicData.id });

    // Combine data - invite codes will be null if user is not committee
    const societyData = {
      ...basicData,
      committee_invite_code: inviteCodes?.[0]?.committee_invite_code || "",
      attendee_invite_code: inviteCodes?.[0]?.attendee_invite_code || "",
    };

    setSociety(societyData as Society);
    setLoading(false);
  };

  const fetchMembers = async () => {
    if (!society) return;

    const { data, error } = await supabase
      .from("society_members")
      .select(`
        id,
        user_id,
        joined_at,
        role,
        email_notifications_enabled,
        profiles!inner(id, display_name, avatar_url, phone_number)
      `)
      .eq("society_id", society.id)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setMembers(data as any);
    }
  };

  const copyCommitteeLink = () => {
    navigator.clipboard.writeText(committeeInviteUrl);
    setCopiedCommittee(true);
    setTimeout(() => setCopiedCommittee(false), 2000);
  };

  const copyAttendeeLink = () => {
    navigator.clipboard.writeText(attendeeInviteUrl);
    setCopiedAttendee(true);
    setTimeout(() => setCopiedAttendee(false), 2000);
  };

  const handleNotificationToggle = async (memberId: string, enabled: boolean) => {
    // Optimistic update: Update UI immediately
    setMembers(prev => prev.map(m => 
      m.id === memberId 
        ? { ...m, email_notifications_enabled: enabled }
        : m
    ));

    const { error } = await supabase
      .from("society_members")
      .update({ email_notifications_enabled: enabled })
      .eq("id", memberId);

    if (error) {
      console.error(error);
      // Revert on error
      await fetchMembers();
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    const { error } = await supabase
      .from("society_members")
      .delete()
      .eq("id", memberToRemove.id);

    if (error) {
      toast.error("Failed to remove member");
      console.error(error);
    } else {
      toast.success(`${memberToRemove.name} removed from society`);
      fetchMembers();
    }
    
    setMemberToRemove(null);
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
                  <BreadcrumbLink asChild>
                    <Link to={`/society/${slug}/dashboard`}>{society?.name}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>Members</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/society/${slug}/dashboard`)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img src={logo} alt="OurSafeBase" className="h-8" />
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  {society?.name}
                  {society?.is_verified && <VerifiedBadge size="md" />}
                </h1>
                <p className="text-sm text-muted-foreground">Members</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto max-w-4xl px-4 py-8">
          <Card className="mb-4 border-primary">
            <CardHeader>
              <CardTitle>Committee Invite Link</CardTitle>
              <CardDescription>
                Share with trusted committee members - grants full dashboard access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Committee Invite URL</Label>
                <div className="flex gap-2">
                  <Input value={committeeInviteUrl} readOnly />
                  <Button onClick={copyCommitteeLink} variant="outline" size="icon">
                    {copiedCommittee ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button onClick={() => setCommitteeQrDialogOpen(true)} variant="outline" size="icon">
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Committee Invite Code</Label>
                <div className="flex gap-2">
                  <Input value={society?.committee_invite_code || ""} readOnly className="font-mono" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Attendee Invite Link</CardTitle>
              <CardDescription>
                Share with event attendees - they can view events and submit reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Attendee Invite URL</Label>
                <div className="flex gap-2">
                  <Input value={attendeeInviteUrl} readOnly />
                  <Button onClick={copyAttendeeLink} variant="outline" size="icon">
                    {copiedAttendee ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button onClick={() => setQrDialogOpen(true)} variant="outline" size="icon">
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Attendee Invite Code</Label>
                <div className="flex gap-2">
                  <Input value={society?.attendee_invite_code || ""} readOnly className="font-mono" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Committee Members ({committeeCount})</CardTitle>
              <CardDescription>
                Committee members can manage events and respond to concerns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members
                  .filter(m => m.role === 'committee')
                  .sort((a, b) => {
                    // Current user first
                    if (a.user_id === user?.id) return -1;
                    if (b.user_id === user?.id) return 1;
                    // Then by joined date
                    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
                  })
                  .map((member) => {
                  const isCurrentUser = member.user_id === user?.id;
                  
                  return (
                    <div
                      key={member.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profiles?.avatar_url || undefined} alt={member.profiles?.display_name || "Member"} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {(member.profiles?.display_name || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">
                            {member.profiles?.display_name || "Anonymous Member"}
                            {isCurrentUser && (
                              <span className="text-muted-foreground ml-2">(You)</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4 mt-3">
                        <Badge variant="default" className="shrink-0">Committee</Badge>
                        <div className="flex items-center gap-2">
                          {isCreator && !isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMemberToRemove({
                                  id: member.id,
                                  name: member.profiles?.display_name || "member"
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          <div className={`flex items-center gap-2 shrink-0 ${!isCurrentUser ? 'opacity-50' : ''}`}>
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <Switch
                              checked={member.email_notifications_enabled}
                              disabled={!isCurrentUser}
                              onCheckedChange={(checked) => {
                                if (isCurrentUser) {
                                  handleNotificationToggle(member.id, checked);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendees ({attendeeCount})</CardTitle>
              <CardDescription>
                Attendees can view events and submit feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search attendees by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-4">
                {filteredAttendees.length === 0 && searchTerm ? (
                  <p className="text-center text-muted-foreground py-4">
                    No attendees found matching "{searchTerm}"
                  </p>
                ) : (
                  filteredAttendees.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 rounded-lg border p-4"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profiles?.avatar_url || undefined} alt={member.profiles?.display_name || "Member"} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {(member.profiles?.display_name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {member.profiles?.display_name || "Anonymous Member"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCreator && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberToRemove({
                              id: member.id,
                              name: member.profiles?.display_name || "member"
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <Badge variant="secondary">Attendee</Badge>
                    </div>
                  </div>
                ))
                )}
              </div>
            </CardContent>
          </Card>
        </main>

        <SocietyInviteQRCodeDialog
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
          societyName={society?.name || ""}
          inviteUrl={attendeeInviteUrl}
          inviteType="attendee"
        />
        <SocietyInviteQRCodeDialog
          open={committeeQrDialogOpen}
          onOpenChange={setCommitteeQrDialogOpen}
          societyName={society?.name || ""}
          inviteUrl={committeeInviteUrl}
          inviteType="committee"
        />
        
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {memberToRemove?.name} from the society? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
};

export default SocietyMembers;
