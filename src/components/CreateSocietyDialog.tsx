import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface CreateSocietyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateSocietyDialog = ({ open, onOpenChange, onSuccess }: CreateSocietyDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return;
    }
    
    if (trimmedName.length > 150) {
      return;
    }

    setLoading(true);

    const slug = createSlug(name);

    // Upload logo if provided
    let logoUrl = null;
    if (logoFile && user) {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${slug}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("society-logos")
        .upload(fileName, logoFile);
      
      if (uploadError) {
        toast.error("Failed to upload logo");
        setLoading(false);
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from("society-logos")
        .getPublicUrl(fileName);
      logoUrl = urlData.publicUrl;
    }

    // Create society
    const { data: society, error: societyError } = await supabase
      .from("societies")
      .insert({
        name: trimmedName,
        slug,
        creator_email: user?.email,
        logo_url: logoUrl,
      })
      .select()
      .single();

    if (societyError) {
      toast.error("Failed to create society. This name might already be taken.");
      console.error(societyError);
      setLoading(false);
      return;
    }

    // Add user as member (as committee)
    const { error: memberError } = await supabase
      .from("society_members")
      .insert({
        society_id: society.id,
        user_id: user?.id,
        role: "committee",
      });

    if (memberError) {
      toast.error("Failed to join society");
      console.error(memberError);
      setLoading(false);
      return;
    }

    toast.success("Society created successfully!");
    setName("");
    setLogoFile(null);
    setLogoPreview(null);
    setLoading(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Society</DialogTitle>
          <DialogDescription>
            Start your own society to manage events and keep members safe
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Society Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Drama Society"
              inputMode="text"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">Society Logo (Optional)</Label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border">
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max 2MB. JPG, PNG, or GIF
                </p>
              </div>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Society"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSocietyDialog;
