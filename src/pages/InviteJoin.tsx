import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const InviteJoin = () => {
  const { type, code } = useParams<{ type: 'committee' | 'attendee'; code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Redirect to auth with invite code
        navigate(`/auth?invite=${code}`);
      } else {
        joinSociety();
      }
    }
  }, [user, authLoading, code]);

  const joinSociety = async () => {
    if (!code || !user || !type) return;

    setProcessing(true);

    // Get all societies (basic info only due to RLS)
    const { data: societies, error: societyError } = await supabase
      .from("societies")
      .select("id, name, slug");

    if (societyError || !societies) {
      toast.error("Failed to validate invite code");
      navigate("/dashboard");
      return;
    }

    // Find the society by checking invite codes using security definer function
    let society = null;
    for (const soc of societies) {
      const { data: codes } = await supabase
        .rpc("get_society_invite_codes", { society_id: soc.id });
      
      const codeToCheck = type === 'committee' 
        ? codes?.[0]?.committee_invite_code 
        : codes?.[0]?.attendee_invite_code;
      
      if (codeToCheck === code) {
        society = soc;
        break;
      }
    }

    if (!society) {
      toast.error("Invalid invite code");
      navigate("/dashboard");
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("society_members")
      .select("id, role")
      .eq("society_id", society.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      toast.success(`You're already a member of ${society.name}`);
      const destination = existing.role === 'committee' 
        ? `/society/${society.slug}/dashboard` 
        : '/my-events';
      navigate(destination);
      return;
    }

    // Add user as member with appropriate role
    const { error: memberError } = await supabase
      .from("society_members")
      .insert({
        society_id: society.id,
        user_id: user.id,
        role: type === 'committee' ? 'committee' : 'attendee',
      });

    if (memberError) {
      toast.error("Failed to join society");
      console.error(memberError);
      navigate("/dashboard");
      return;
    }

    const successMessage = type === 'committee'
      ? `Welcome to ${society.name} committee!`
      : `Welcome to ${society.name}! You can now view events.`;
    
    toast.success(successMessage);
    
    // Redirect based on role
    const destination = type === 'committee' 
      ? `/society/${society.slug}/dashboard` 
      : '/my-events';
    navigate(destination);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <img src={logo} alt="OurSafeBase" className="h-16" />
          </div>
          <CardTitle>Joining Society</CardTitle>
          <CardDescription>
            {processing ? "Processing your invite..." : "Redirecting..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteJoin;
