import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Upload } from "lucide-react";

const CommitteeOnboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite");
  
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState("+353");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [societyName, setSocietyName] = useState<string>("");

  useEffect(() => {
    const checkProfile = async () => {
      // Wait for auth state to resolve to avoid redirecting prematurely
      if (authLoading) return;

      // Redirect to auth if no user
      if (!user) {
        navigate(`/auth?invite=${inviteCode}`);
        return;
      }

      // Redirect to dashboard if no invite code
      if (!inviteCode) {
        navigate("/dashboard");
        return;
      }

      // Fetch society name from invite code
      const { data: validationResult } = await supabase
        .rpc("validate_invite_code", { invite_code: inviteCode });
      
      if (validationResult && validationResult.length > 0) {
        setSocietyName(validationResult[0].society_name);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number, display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.phone_number && profile?.display_name) {
        navigate(`/invite/committee/${inviteCode}`);
      } else {
        // Pre-fill display name from user metadata if available
        setDisplayName(user.user_metadata?.display_name || "");
        setCheckingProfile(false);
      }
    };

    checkProfile();
  }, [user, inviteCode, navigate, authLoading]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be less than 2MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName || !phoneNumber) {
      toast.error("Please provide your display name and phone number");
      return;
    }

    setLoading(true);

    try {
      let avatarUrl = null;

      if (avatarFile && user) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (uploadError) {
          toast.error("Failed to upload avatar");
          setLoading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        avatarUrl = publicUrl;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          phone_number: `${countryCode}${phoneNumber}`,
          ...(avatarUrl && { avatar_url: avatarUrl })
        })
        .eq('id', user!.id);

      if (profileError) {
        toast.error("Failed to update profile");
        setLoading(false);
        return;
      }

      navigate(`/invite/committee/${inviteCode}`);
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("An error occurred");
      setLoading(false);
    }
  };

  const getInitials = () => {
    const name = displayName || user?.user_metadata?.display_name || "?";
    return name.charAt(0).toUpperCase();
  };

  if (checkingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <img src={logo} alt="OurSafeBase" className="h-16" />
          </div>
          <CardTitle className="text-2xl">Welcome to OurSafeBase</CardTitle>
          <CardDescription className="text-center mt-4">
            Please add your contact info and profile picture. These will be visible to attendees of {societyName || "the society"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-center block">Profile Picture</Label>
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 sm:h-20 sm:w-20">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl sm:text-2xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="w-full text-center">
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Upload className="h-4 w-4" />
                      {avatarFile ? avatarFile.name : "Upload photo"}
                    </div>
                  </Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 2MB
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your full name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+353">🇮🇪 +353</SelectItem>
                    <SelectItem value="+44">🇬🇧 +44</SelectItem>
                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                    <SelectItem value="+61">🇦🇺 +61</SelectItem>
                    <SelectItem value="+33">🇫🇷 +33</SelectItem>
                    <SelectItem value="+49">🇩🇪 +49</SelectItem>
                    <SelectItem value="+34">🇪🇸 +34</SelectItem>
                    <SelectItem value="+39">🇮🇹 +39</SelectItem>
                    <SelectItem value="+31">🇳🇱 +31</SelectItem>
                    <SelectItem value="+32">🇧🇪 +32</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="87 123 4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s]/g, ''))}
                  disabled={loading}
                  required
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your phone number without the country code
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Saving..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommitteeOnboarding;
