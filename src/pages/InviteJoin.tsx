import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/lib/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const InviteJoin = () => {
  const { type, code } = useParams<{ type: 'committee' | 'attendee'; code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();
  const [processing, setProcessing] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  
  const INVITE_STORAGE_KEY = 'pending_invite_code';

  useEffect(() => {
    console.log('[InviteJoin] useEffect triggered', { 
      authLoading, 
      hasAttempted, 
      hasUser: !!user, 
      processing, 
      code 
    });
    
    // If not loading and haven't attempted yet
    if (!authLoading && !hasAttempted) {
      if (!user) {
        console.log('[InviteJoin] No user, redirecting to auth');
        setHasAttempted(true);
        navigate(`/auth?invite=${code}`);
      } else if (user && !processing) {
        console.log('[InviteJoin] User found, starting join process');
        setHasAttempted(true);
        handleInviteJoin();
      }
    }
  }, [user, authLoading, hasAttempted]); // Fixed: removed navigate and processing

  const handleInviteJoin = async () => {
    if (!code || !user) {
      console.error('[InviteJoin] Missing code or user', { code, user: !!user });
      return;
    }

    console.log('[InviteJoin] Starting handleInviteJoin', { code, userId: user.id });
    setProcessing(true);
    
    try {
      // Single validation call
      console.log('[InviteJoin] Validating invite code...');
      const { data: validationResult, error: validationError } = await supabase
        .rpc("validate_invite_code", { invite_code: code });

      if (validationError || !validationResult || validationResult.length === 0) {
        console.error('[InviteJoin] Validation failed:', validationError);
        setProcessing(false);
        toast.error("Invalid invite code");
        navigate("/dashboard");
        return;
      }

      const { society_id, society_name, society_slug, role_type } = validationResult[0];
      console.log('[InviteJoin] Validation successful', { society_name, role_type });

      // Committee member needs onboarding check
      if (role_type === 'committee') {
        console.log('[InviteJoin] Checking committee onboarding status...');
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_number, display_name')
          .eq('id', user.id)
          .maybeSingle();
        
        const needsOnboarding = !profile?.phone_number || !profile?.display_name;
        console.log('[InviteJoin] Profile check', { needsOnboarding, hasProfile: !!profile });

        if (needsOnboarding) {
          setProcessing(false);
          console.log('[InviteJoin] Redirecting to onboarding');
          navigate(`/onboarding?invite=${code}`);
          return;
        }
      }

      // Check if already member
      console.log('[InviteJoin] Checking existing membership...');
      const { data: existing } = await supabase
        .from("society_members")
        .select("id, role")
        .eq("society_id", society_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        console.log('[InviteJoin] User is already a member', { currentRole: existing.role, newRole: role_type });
        
        // Handle role upgrade
        if (existing.role === 'attendee' && role_type === 'committee') {
          console.log('[InviteJoin] Upgrading role from attendee to committee');
          const { error: updateError } = await supabase
            .from("society_members")
            .update({ role: 'committee' })
            .eq("id", existing.id);

          if (updateError) {
            console.error('[InviteJoin] Role upgrade failed:', updateError);
            setProcessing(false);
            toast.error("Failed to update role");
            navigate("/dashboard");
            return;
          }

          setProcessing(false);
          toast.success(`Upgraded to committee member of ${society_name}!`);
          navigate(`/society/${society_slug}/dashboard`);
          return;
        }

        // Already have same or higher role
        setProcessing(false);
        toast.success(`You're already a member of ${society_name}`);
        const destination = existing.role === 'committee' 
          ? `/society/${society_slug}/dashboard` 
          : '/dashboard';
        console.log('[InviteJoin] Navigating to:', destination);
        navigate(destination);
        return;
      }

      // Insert new membership
      console.log('[InviteJoin] Creating new membership...');
      const { error: memberError } = await supabase
        .from("society_members")
        .insert({
          society_id,
          user_id: user.id,
          role: role_type as 'committee' | 'attendee',
        });

      if (memberError) {
        console.error('[InviteJoin] Membership insert error:', memberError);
        
        // Double-check if actually added despite error
        const { data: checkMember } = await supabase
          .from("society_members")
          .select("id, role")
          .eq("society_id", society_id)
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (checkMember) {
          console.log('[InviteJoin] Member was added despite error');
          localStorage.removeItem(INVITE_STORAGE_KEY);
          setProcessing(false);
          toast.success(`Joined ${society_name}!`);
          
          const destination = role_type === 'committee' 
            ? `/society/${society_slug}/dashboard` 
            : '/dashboard';
          console.log('[InviteJoin] Navigating to:', destination);
          navigate(destination);
          return;
        }
        
        // Actually failed
        console.error('[InviteJoin] Membership creation actually failed');
        setProcessing(false);
        toast.error("Failed to join society. Please try again.");
        navigate("/dashboard");
        return;
      }

      // Success!
      console.log('[InviteJoin] Successfully joined society');
      localStorage.removeItem(INVITE_STORAGE_KEY);
      setProcessing(false);
      toast.success(`Joined ${society_name}!`);
      
      const destination = role_type === 'committee' 
        ? `/society/${society_slug}/dashboard` 
        : '/dashboard';
      console.log('[InviteJoin] Navigating to:', destination);
      navigate(destination);
      
    } catch (error) {
      console.error('[InviteJoin] Unexpected error in handleInviteJoin:', error);
      setProcessing(false);
      toast.error("An error occurred. Please try again.");
      navigate("/dashboard");
    }
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
