import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { ArrowLeft, Upload, UserMinus } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import logo from "@/assets/logo.png";

interface Profile {
  display_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
}

interface Society {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface SocietyMembership {
  id: string;
  society: Society;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({
    display_name: "",
    phone_number: "",
    avatar_url: null,
  });
  const [societies, setSocieties] = useState<SocietyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [societyToLeave, setSocietyToLeave] = useState<Society | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSocieties();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, phone_number, avatar_url")
      .eq("id", user?.id)
      .single();

    if (error) {
      toast.error("Failed to load profile");
      console.error(error);
    } else if (data) {
      setProfile(data);
      setAvatarPreview(data.avatar_url);
    }
    setLoading(false);
  };

  const fetchSocieties = async () => {
    const { data, error } = await supabase
      .from("society_members")
      .select("id, society:societies(*)")
      .eq("user_id", user?.id);

    if (error) {
      toast.error("Failed to load societies");
      console.error(error);
    } else {
      setSocieties(data as any);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be less than 2MB");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;

      // Upload avatar if changed
      if (avatarFile && user) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        avatarUrl = urlData.publicUrl;
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profile.display_name,
          phone_number: profile.phone_number,
          avatar_url: avatarUrl,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      setAvatarFile(null);
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveSociety = async (membershipId: string, societyName: string) => {
    try {
      const { error } = await supabase
        .from("society_members")
        .delete()
        .eq("id", membershipId);

      if (error) {
        console.error("Leave society error:", error);
        if (error.message.includes("policy")) {
          toast.error("Permission denied. Please contact support.");
        } else {
          toast.error(`Failed to leave ${societyName}: ${error.message}`);
        }
        return;
      }

      toast.success(`Successfully left ${societyName}`);
      
      // Refresh societies list
      await fetchSocieties();
      setSocietyToLeave(null);
      
      // Navigate to dashboard if user left all societies
      const updatedSocieties = societies.filter(s => s.society.id !== societyToLeave?.id);
      if (updatedSocieties.length === 0) {
        setTimeout(() => {
          toast.info("Redirecting to dashboard...");
          navigate("/dashboard");
        }, 1500);
      }
    } catch (error) {
      console.error("Unexpected error leaving society:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={logo} alt="OurSafeBase" className="h-8 md:h-10" />
              <h1 className="text-lg md:text-xl font-bold">OurSafeBase</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Back to Dashboard</span>
            </Button>
          </div>
        </header>

        <main className="container mx-auto max-w-4xl px-4 py-8">
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold">Edit Profile</h2>
            <p className="text-muted-foreground">
              Update your personal information and manage society memberships
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Your display name and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(profile.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label htmlFor="avatar" className="cursor-pointer">
                      <div className="space-y-1">
                        <div>
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Photo
                            </span>
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Max 2MB
                        </p>
                      </div>
                    </Label>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={profile.display_name || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, display_name: e.target.value })
                    }
                    placeholder="Enter your name"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={profile.phone_number || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, phone_number: e.target.value })
                    }
                    placeholder="Enter your phone number"
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* Society Memberships */}
            <Card>
              <CardHeader>
                <CardTitle>Society Memberships</CardTitle>
                <CardDescription>
                  Societies you are currently a member of
                </CardDescription>
              </CardHeader>
              <CardContent>
                {societies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You are not a member of any societies yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {societies.map((membership) => (
                      <div
                        key={membership.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold break-words">{membership.society.name}</h3>
                          <p className="text-sm text-muted-foreground break-words">
                            {membership.society.description || "No description"}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSocietyToLeave(membership.society)}
                        >
                          Leave
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Leave Society Confirmation Dialog */}
        <AlertDialog
          open={!!societyToLeave}
          onOpenChange={() => setSocietyToLeave(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Society?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave {societyToLeave?.name}? You will need
                an invite code to rejoin.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const membership = societies.find(
                    (m) => m.society.id === societyToLeave?.id
                  );
                  if (membership && societyToLeave) {
                    handleLeaveSociety(membership.id, societyToLeave.name);
                  }
                }}
              >
                Leave Society
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
};

export default Profile;
