import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const InviteJoin = () => {
  const { code } = useParams();
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
    if (!code || !user) return;

    setProcessing(true);

    // Find society by invite code
    const { data: society, error: societyError } = await supabase
      .from("societies")
      .select("*")
      .eq("invite_code", code)
      .single();

    if (societyError || !society) {
      toast.error("Invalid invite code");
      navigate("/dashboard");
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("society_members")
      .select("*")
      .eq("society_id", society.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      toast.success(`You're already a member of ${society.name}`);
      navigate(`/society/${society.slug}/dashboard`);
      return;
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from("society_members")
      .insert({
        society_id: society.id,
        user_id: user.id,
      });

    if (memberError) {
      toast.error("Failed to join society");
      console.error(memberError);
      navigate("/dashboard");
      return;
    }

    toast.success(`Welcome to ${society.name}!`);
    navigate("/my-events");
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
