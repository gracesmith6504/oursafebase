import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { ArrowLeft, Upload, Bell, LogOut, Download } from "lucide-react";
import { toast } from "sonner";
import { LazyImage } from "@/components/LazyImage";
import { LazyAvatar } from "@/components/LazyAvatar";
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
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface Profile {
  display_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
}
interface Society {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  creator_email: string | null;
  is_verified: boolean;
}
interface SocietyMembership {
  id: string;
  role: "committee" | "attendee";
  email_notifications_enabled: boolean;
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
  const [userEmail, setUserEmail] = useState<string>("");
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSocieties();
      fetchUserEmail();
    }
  }, [user]);
  const fetchUserEmail = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.email) {
      setUserEmail(data.user.email);
    }
  };
  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, phone_number, avatar_url")
      .eq("id", user?.id)
      .single();
    if (error) {
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
      .select(
        "id, role, email_notifications_enabled, society:societies(id, name, slug, logo_url, creator_email, is_verified)",
      )
      .eq("user_id", user?.id);
    if (error) {
      console.error(error);
    } else {
      setSocieties(data as any);
    }
  };
  const handleNotificationToggle = async (membershipId: string, enabled: boolean) => {
    // Optimistic update: Update UI immediately
    setSocieties((prev) =>
      prev.map((m) =>
        m.id === membershipId
          ? {
              ...m,
              email_notifications_enabled: enabled,
            }
          : m,
      ),
    );
    const { error } = await supabase
      .from("society_members")
      .update({
        email_notifications_enabled: enabled,
      })
      .eq("id", membershipId);
    if (error) {
      console.error(error);
      // Revert on error
      await fetchSocieties();
    }
  };
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
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
    if (profile.display_name && profile.display_name.trim().length > 100) {
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;

      // Upload avatar if changed
      if (avatarFile && user) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, avatarFile, {
          upsert: true,
        });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
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
      const { error } = await supabase.from("society_members").delete().eq("id", membershipId);
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
      const updatedSocieties = societies.filter((s) => s.society.id !== societyToLeave?.id);
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
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  const handleExportData = async () => {
    if (!user) return;

    setExporting(true);
    try {
      // Fetch all user data
      const [
        profileData,
        societiesData,
        eventsData,
        reportsData,
        feedbackData,
        acceptancesData,
        notesData,
        bookmarksData,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("society_members")
          .select("role, joined_at, email_notifications_enabled, society:societies(name)")
          .eq("user_id", user.id),
        supabase.from("events").select("*").eq("created_by", user.id),
        supabase.from("reports").select("*").eq("reporter_email", userEmail),
        supabase.from("event_feedback").select("*").eq("contact_email", userEmail),
        supabase.from("code_acceptances").select("*").eq("user_id", user.id),
        supabase.from("event_notes").select("*").eq("user_id", user.id),
        supabase.from("report_bookmarks").select("*").eq("user_id", user.id),
      ]);

      // Sanitize data to include only user's personal information
      const sanitizedSocieties = societiesData.data?.map((membership: any) => ({
        society_name: membership.society?.name,
        role: membership.role,
        joined_at: membership.joined_at,
        email_notifications_enabled: membership.email_notifications_enabled,
      }));

      const sanitizedEvents = eventsData.data?.map((event: any) => ({
        title: event.title,
        event_date: event.event_date,
        event_end_date: event.event_end_date,
        location: event.location,
        status: event.status,
        created_at: event.created_at,
      }));

      const sanitizedReports = reportsData.data?.map((report: any) => ({
        concern_type: report.concern_type,
        submitted_at: report.submitted_at,
        status: report.status,
        is_anonymous: report.is_anonymous,
      }));

      const sanitizedFeedback = feedbackData.data?.map((feedback: any) => ({
        felt_safe: feedback.felt_safe,
        improvements: feedback.improvements,
        submitted_at: feedback.submitted_at,
        is_anonymous: feedback.is_anonymous,
      }));

      const sanitizedAcceptances = acceptancesData.data?.map((acceptance: any) => ({
        accepted_at: acceptance.accepted_at,
        accepted_version: acceptance.accepted_version,
      }));

      const sanitizedNotes = notesData.data?.map((note: any) => ({
        content: note.content,
        tags: note.tags,
        is_pinned: note.is_pinned,
        created_at: note.created_at,
        updated_at: note.updated_at,
      }));

      const exportData = {
        exportDate: new Date().toISOString(),
        userEmail: userEmail,
        dataDescription:
          "This export contains your personal data and activity only. It does not include other members' information, internal system IDs, or sensitive society details.",
        profile: {
          display_name: profileData.data?.display_name,
          phone_number: profileData.data?.phone_number,
          avatar_url: profileData.data?.avatar_url,
          created_at: profileData.data?.created_at,
          last_login_at: profileData.data?.last_login_at,
        },
        societyMemberships: sanitizedSocieties,
        eventsCreated: sanitizedEvents,
        reportsSubmitted: sanitizedReports,
        feedbackSubmitted: sanitizedFeedback,
        codeAcceptances: sanitizedAcceptances,
        eventNotes: sanitizedNotes,
        reportBookmarksCount: bookmarksData.data?.length || 0,
      };

      // Create JSON blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `oursafebase-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleting(true);
    try {
      // Call the secure edge function to delete the account
      const { data, error } = await supabase.functions.invoke("delete-account");

      if (error) {
        console.error("Delete account error:", error);
        toast.error("Failed to delete account. Please contact support!");
        setDeleting(false);
        setDeleteDialogOpen(false);
        return;
      }

      toast.success("Account deleted successfully. Redirecting...");

      // Sign out to clear the session
      await supabase.auth.signOut();

      // Navigate to home page after a brief delay
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error("Failed to delete account. Please contact support");
      setDeleting(false);
      setDeleteDialogOpen(false);
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
      <div className="min-h-screen bg-muted overflow-x-hidden">
        <header className="border-b bg-background">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Dashboard</span>
            </Button>
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <LazyImage src={logo} alt="OurSafeBase" className="h-8 md:h-10" />
              <h1 className="text-lg md:text-xl font-bold">OurSafeBase</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLogoutDialogOpen(true)}>
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Sign Out</span>
            </Button>
          </div>
        </header>

        <main className="container mx-auto max-w-4xl px-3 py-4 md:px-4 md:py-8">
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold">Edit Profile</h2>
            <p className="text-muted-foreground">Update your personal information and manage society memberships</p>
          </div>

          <div className="space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Your display name and contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <LazyAvatar
                    src={avatarPreview}
                    alt={profile.display_name}
                    fallback={getInitials(profile.display_name)}
                    className="h-24 w-24"
                  />
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
                        <p className="text-sm text-muted-foreground">Max 2MB</p>
                      </div>
                    </Label>
                    <Input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={profile.display_name || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        display_name: e.target.value,
                      })
                    }
                    placeholder="Enter your name"
                  />
                </div>

                {/* Email Address (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={userEmail} readOnly disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support if needed.</p>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={profile.phone_number || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        phone_number: e.target.value,
                      })
                    }
                    placeholder="Enter your phone number"
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            {societies.some((m) => m.role === "committee") && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Manage email notifications for societies where you're a committee member
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {societies
                      .filter((m) => m.role === "committee")
                      .map((membership) => (
                        <div key={membership.id} className="flex items-center justify-between rounded-lg border p-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Bell className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium break-words">{membership.society.name}</p>
                              <p className="text-sm text-muted-foreground">Report email notifications</p>
                            </div>
                          </div>
                          <Switch
                            checked={membership.email_notifications_enabled}
                            onCheckedChange={(checked) => handleNotificationToggle(membership.id, checked)}
                          />
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data Export (GDPR) */}
            <Card>
              <CardHeader>
                <CardTitle>Data Export</CardTitle>
                <CardDescription>Download all your data in JSON format (GDPR Article 20)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Export includes your personal data and activity only. Does not include other members' information,
                  internal system IDs, or sensitive society details.
                </p>
                <Button onClick={handleExportData} disabled={exporting} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  {exporting ? "Exporting..." : "Export My Data"}
                </Button>
              </CardContent>
            </Card>

            {/* Society Memberships */}
            <Card>
              <CardHeader>
                <CardTitle>Society Memberships</CardTitle>
                <CardDescription>Societies you are currently a member of</CardDescription>
              </CardHeader>
              <CardContent>
                {societies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You are not a member of any societies yet.</p>
                ) : (
                  <div className="space-y-3">
                    {societies.map((membership) => (
                      <div key={membership.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold break-words flex items-center gap-2">
                            {membership.society.name}
                            {membership.society.is_verified && <VerifiedBadge size="sm" />}
                          </h3>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSocietyToLeave(membership.society)}
                          className="mx-[10px]"
                        >
                          Leave
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delete Account */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Delete Account</CardTitle>
                <CardDescription>Permanently delete your account and personal data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-destructive/10 p-4 space-y-2">
                  <p className="text-sm font-medium">What will be deleted:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Your profile information (name, phone, avatar)</li>
                    <li>Your society memberships</li>
                    <li>Your event notes and bookmarks</li>
                    <li>Your account login credentials</li>
                  </ul>
                </div>

                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <p className="text-sm font-medium">What will be retained (for safety records):</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Anonymous reports you submitted (cannot be traced back to you)</li>
                    <li>Non-anonymous reports (contact info removed, content kept for welfare records)</li>
                    <li>Events you created (your name will be removed)</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    This retention is required for legal compliance and student safety.
                  </p>
                </div>

                <div className="pt-2">
                  <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={deleting}>
                    Delete My Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Leave Society Confirmation Dialog */}
        <AlertDialog open={!!societyToLeave} onOpenChange={() => setSocietyToLeave(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Society?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave {societyToLeave?.name}? You will need an invite code to rejoin.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const membership = societies.find((m) => m.society.id === societyToLeave?.id);
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

        {/* Sign Out Confirmation Dialog */}
        <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <AlertDialogContent className="max-w-[80%] rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Log out of your account?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <AlertDialogAction
                onClick={handleSignOut}
                className="w-full border border-input bg-background text-destructive hover:bg-accent hover:text-destructive"
              >
                Log Out
              </AlertDialogAction>
              <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Account Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  This action <strong>cannot be undone</strong>. Your account and personal data will be permanently
                  deleted.
                </p>
                <div className="rounded-lg bg-muted p-3 space-y-2 text-left">
                  <p className="font-medium text-foreground text-sm">Data Retention Policy:</p>
                  <ul className="text-xs space-y-1 ml-4 list-disc">
                    <li>Anonymous reports remain for safety records (untraceable to you)</li>
                    <li>
                      Non-anonymous reports: your contact info is removed, but report content is kept for welfare and
                      legal purposes
                    </li>
                    <li>Events you created remain active (your name removed)</li>
                  </ul>
                </div>
                <p className="text-sm">Are you absolutely sure you want to delete your account?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Yes, Delete My Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
};
export default Profile;
