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
        navigate(`/auth?invite=${code}`);
      } else {
        checkOnboardingStatus();
      }
    }
  }, [user, authLoading, code]);

  const checkOnboardingStatus = async () => {
    if (!code || !user) return;
    
    const { data: validationResult, error: validationError } = await supabase
      .rpc("validate_invite_code", { invite_code: code });

    if (validationError || !validationResult || validationResult.length === 0) {
      console.error("Invite validation failed:", validationError);
      toast.error("Invalid invite code");
      navigate("/dashboard");
      return;
    }

    const role = validationResult[0].role_type;

    // If committee member, check if profile is complete
    if (role === 'committee') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number, display_name')
        .eq('id', user.id)
        .maybeSingle();

      const needsOnboarding = !profile || !profile.phone_number || !profile.display_name;

      if (needsOnboarding) {
        navigate(`/onboarding?invite=${code}`);
        return;
      }

      // Profile complete - proceed to join
      joinSociety();
      return;
    }

    // For attendees, join directly
    joinSociety();
  };

  const joinSociety = async () => {
    if (!code || !user) return;

    setProcessing(true);

    // Validate invite code using security definer function
    const { data: validationResult, error: validationError } = await supabase
      .rpc("validate_invite_code", { invite_code: code });

    if (validationError || !validationResult || validationResult.length === 0) {
      toast.error("Invalid invite code");
      navigate("/dashboard");
      setProcessing(false);
      return;
    }

    const society = {
      id: validationResult[0].society_id,
      name: validationResult[0].society_name,
      slug: validationResult[0].society_slug,
    };
    const role = validationResult[0].role_type;

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
        : '/dashboard';
      navigate(destination);
      return;
    }

    // Add user as member with appropriate role
    const { error: memberError } = await supabase
      .from("society_members")
      .insert({
        society_id: society.id,
        user_id: user.id,
        role: role as 'committee' | 'attendee',
      });

    if (memberError) {
      console.error("Member insert error:", memberError);
      
      // Check if user was actually added despite error
      const { data: checkMember } = await supabase
        .from("society_members")
        .select("id, role")
        .eq("society_id", society.id)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (checkMember) {
        // User was added successfully, proceed with success message
        toast.success(role === 'committee'
          ? `Welcome to ${society.name} committee!`
          : `Welcome to ${society.name}! You can now view events.`);
        
        const destination = role === 'committee' 
          ? `/society/${society.slug}/dashboard` 
          : '/dashboard';
        navigate(destination);
        return;
      }
      
      // Actually failed
      toast.error("Failed to join society");
      navigate("/dashboard");
      return;
    }

    const successMessage = role === 'committee'
      ? `Welcome to ${society.name} committee!`
      : `Welcome to ${society.name}! You can now view events.`;
    
    toast.success(successMessage);
    
    // Redirect based on role
    const destination = role === 'committee' 
      ? `/society/${society.slug}/dashboard` 
      : '/dashboard';
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
