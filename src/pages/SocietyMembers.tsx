import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Copy, Check } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

interface Society {
  id: string;
  name: string;
  slug: string;
  invite_code: string;
}

interface Member {
  id: string;
  joined_at: string;
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const SocietyMembers = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [society, setSociety] = useState<Society | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const inviteUrl = society ? `${window.location.origin}/invite/${society.invite_code}` : "";

  useEffect(() => {
    if (user && slug) {
      fetchSociety();
      fetchMembers();
    }
  }, [user, slug]);

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
        profile:profiles(id, display_name, avatar_url)
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

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
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
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Invite Link</CardTitle>
              <CardDescription>
                Share this permanent link with committee members to join
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Invite URL</Label>
                <div className="flex gap-2">
                  <Input value={inviteUrl} readOnly />
                  <Button onClick={copyInviteLink} variant="outline" size="icon">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Invite Code</Label>
                <div className="flex gap-2">
                  <Input value={society?.invite_code || ""} readOnly className="font-mono" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Committee Members ({members.length})</CardTitle>
              <CardDescription>
                All members have equal access to manage events and respond to concerns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 rounded-lg border p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {member.profile?.display_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {member.profile?.display_name || "Anonymous Member"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
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
