import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Check } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

interface Society {
  id: string;
  name: string;
  slug: string;
  attendee_invite_code: string;
  committee_invite_code: string;
}

interface Member {
  id: string;
  joined_at: string;
  role: 'committee' | 'attendee';
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

  const committeeInviteUrl = society ? `${window.location.origin}/invite/committee/${society.committee_invite_code}` : "";
  const attendeeInviteUrl = society ? `${window.location.origin}/invite/attendee/${society.attendee_invite_code}` : "";

  const committeeCount = members.filter(m => m.role === 'committee').length;
  const attendeeCount = members.filter(m => m.role === 'attendee').length;

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

    setSociety(data);
    setLoading(false);
  };

  const fetchMembers = async () => {
    if (!society) return;

    const { data, error } = await supabase
      .from("society_members")
      .select(`
        id,
        joined_at,
        role,
        profiles!inner(id, display_name, avatar_url, phone_number)
      `)
      .eq("society_id", society.id)
      .order("joined_at", { ascending: true });

    if (error) {
      toast.error("Failed to load members");
      console.error(error);
    } else {
      setMembers(data as any);
    }
  };

  const copyCommitteeLink = () => {
    navigator.clipboard.writeText(committeeInviteUrl);
    setCopiedCommittee(true);
    toast.success("Committee invite link copied!");
    setTimeout(() => setCopiedCommittee(false), 2000);
  };

  const copyAttendeeLink = () => {
    navigator.clipboard.writeText(attendeeInviteUrl);
    setCopiedAttendee(true);
    toast.success("Attendee invite link copied!");
    setTimeout(() => setCopiedAttendee(false), 2000);
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
              <Button variant="ghost" size="icon" onClick={() => navigate(`/society/${slug}/dashboard`)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img src={logo} alt="OurSafeBase" className="h-8" />
              <div>
                <h1 className="text-xl font-bold">{society?.name}</h1>
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

          <Card>
            <CardHeader>
              <CardTitle>Members ({committeeCount} committee, {attendeeCount} attendees)</CardTitle>
              <CardDescription>
                Committee members can manage events and respond to concerns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
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
                    <Badge variant={member.role === 'committee' ? 'default' : 'secondary'}>
                      {member.role === 'committee' ? 'Committee' : 'Attendee'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default SocietyMembers;
