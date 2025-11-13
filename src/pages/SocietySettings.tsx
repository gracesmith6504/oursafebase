import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ChevronRight, Save, Upload, Trash2 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Society {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  creator_email: string | null;
  is_verified: boolean;
}


const SocietySettings = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [society, setSociety] = useState<Society | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Transfer state
  const [transferEmail, setTransferEmail] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  useEffect(() => {
    if (user && slug) {
      fetchSociety();
    }
  }, [user, slug]);

  useEffect(() => {
    if (user && society) {
      checkIsCreator();
    }
  }, [user, society]);

  const fetchSociety = async () => {
    const { data, error } = await supabase
      .from("societies")
      .select("id, name, slug, logo_url, creator_email, is_verified")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      navigate("/dashboard");
      return;
    }

    setSociety(data);
    setName(data.name);
    setLogoPreview(data.logo_url);
    setLoading(false);
  };

  const checkIsCreator = async () => {
    if (!user || !society) return;

    const { data } = await supabase.rpc('is_society_creator', {
      _user_id: user.id,
      _society_id: society.id
    });

    setIsCreator(data || false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return;
      }
      if (!file.type.startsWith('image/')) {
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoDelete = async () => {
    if (!society || !society.logo_url) return;

    setSaving(true);
    try {
      // Delete from storage
      const oldFileName = society.logo_url.split('/').pop();
      if (oldFileName) {
        await supabase.storage
          .from("society-logos")
          .remove([oldFileName]);
      }

      // Update society to remove logo
      const { error } = await supabase
        .from("societies")
        .update({ logo_url: null })
        .eq("id", society.id);

      if (error) throw error;

      toast.success("Logo deleted successfully");
      await fetchSociety();
      setLogoFile(null);
      setLogoPreview(null);
    } catch (error) {
      toast.error("Failed to delete logo");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!society) return;

    setSaving(true);
    try {
      let newLogoUrl = society.logo_url;

      // Upload new logo if changed
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${society.slug}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("society-logos")
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("society-logos")
          .getPublicUrl(fileName);

        newLogoUrl = urlData.publicUrl;

        // Delete old logo if exists
        if (society.logo_url) {
          const oldFileName = society.logo_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from("society-logos")
              .remove([oldFileName]);
          }
        }
      }

      // Update society
      const { error } = await supabase
        .from("societies")
        .update({
          name: name.trim(),
          logo_url: newLogoUrl,
        })
        .eq("id", society.id);

      if (error) throw error;

      toast.success("Settings saved successfully");
      await fetchSociety();
      setLogoFile(null);
    } catch (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleTransferInitiate = async () => {
    if (!transferEmail.trim()) {
      return;
    }

    if (transferEmail.toLowerCase() === user?.email?.toLowerCase()) {
      return;
    }

    // Check if this email belongs to a committee member using RPC function
    const { data: isCommitteeMember, error } = await supabase.rpc(
      'is_committee_member_by_email',
      {
        _email: transferEmail.toLowerCase(),
        _society_id: society?.id
      }
    );

    if (error) {
      console.error(error);
      return;
    }

    if (!isCommitteeMember) {
      return;
    }

    setShowTransferConfirm(true);
  };

  const handleTransferConfirm = async () => {
    if (!society) return;

    setTransferring(true);
    try {
      const { error } = await supabase
        .from("societies")
        .update({ creator_email: transferEmail.toLowerCase() })
        .eq("id", society.id);

      if (error) throw error;

      toast.success(`Ownership transferred to ${transferEmail}`);
      setShowTransferConfirm(false);
      setTransferEmail("");

      // Redirect to dashboard since user is no longer creator
      setTimeout(() => {
        navigate(`/society/${society.slug}/dashboard`);
      }, 2000);
    } catch (error) {
      toast.error("Failed to transfer ownership");
      console.error(error);
    } finally {
      setTransferring(false);
    }
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

  if (!isCreator) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Creator Access Required</CardTitle>
              <CardDescription>
                Only the society creator can access settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(`/society/${slug}/dashboard`)}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted overflow-x-hidden">
        <header className="border-b bg-background">
          <div className="container mx-auto px-4 py-4">
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
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/society/${slug}/dashboard`)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Society Settings</h1>
                <p className="text-sm text-muted-foreground">{society?.name}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-3 py-4 md:px-4 md:py-8 max-w-2xl">
          <form onSubmit={handleSave} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Update your society's name and logo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Society Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Society name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Society Logo</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {logoPreview && (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={logoPreview} alt="Society logo" />
                          <AvatarFallback>{name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleLogoDelete}
                          disabled={saving}
                          className="text-muted-foreground hover:text-destructive h-8"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Remove
                        </Button>
                      </div>
                    )}
                    <div className="flex-1 w-full space-y-1.5">
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 file:cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">
                        Max 2MB. JPG, PNG, or GIF
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saving} variant="default" size="default">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-destructive">Transfer Ownership</CardTitle>
              <CardDescription>
                Transfer ownership of this society to another committee member. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transfer-email">
                  New Owner's Email (must be a committee member)
                </Label>
                <Input
                  id="transfer-email"
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  placeholder="committee@example.com"
                />
              </div>
              <Button
                variant="destructive"
                onClick={handleTransferInitiate}
                disabled={!transferEmail.trim()}
              >
                Transfer Ownership
              </Button>
            </CardContent>
          </Card>
        </main>

        <AlertDialog open={showTransferConfirm} onOpenChange={setShowTransferConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Transfer Ownership?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to transfer ownership to {transferEmail}?
                You will lose all creator privileges including the ability to remove members and transfer ownership again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleTransferConfirm}
                disabled={transferring}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {transferring ? "Transferring..." : "Transfer Ownership"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
};

export default SocietySettings;
