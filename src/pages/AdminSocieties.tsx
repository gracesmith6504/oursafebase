import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/lib/auth";
import { useAuthContext } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface Society {
  id: string;
  name: string;
  slug: string;
  creator_email: string | null;
  is_verified: boolean;
  created_at: string;
}

const AdminSocieties = () => {
  const { user } = useAuthContext();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingEmail, setEditingEmail] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchSocieties();
    }
  }, [isAdmin]);

  const checkAdmin = async () => {
    if (!user) return;
    
    const { data } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });
    
    setIsAdmin(data || false);
    setLoading(false);
  };

  const fetchSocieties = async () => {
    const { data, error } = await supabase
      .from("societies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load societies");
      console.error(error);
    } else {
      setSocieties(data || []);
      const emailState: { [key: string]: string } = {};
      data?.forEach(s => {
        emailState[s.id] = s.creator_email || "";
      });
      setEditingEmail(emailState);
    }
  };

  const handleUpdateCreatorEmail = async (societyId: string, email: string) => {
    const { error } = await supabase
      .from("societies")
      .update({ creator_email: email || null })
      .eq("id", societyId);

    if (error) {
      toast.error("Failed to update creator email");
      console.error(error);
    } else {
      toast.success("Creator email updated");
      fetchSocieties();
    }
  };

  const handleToggleVerified = async (societyId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("societies")
      .update({ is_verified: !currentValue })
      .eq("id", societyId);

    if (error) {
      toast.error("Failed to update verification status");
      console.error(error);
    } else {
      toast.success(currentValue ? "Verification removed" : "Society verified");
      fetchSocieties();
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

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle>Admin Access Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p>You don't have permission to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted p-8">
        <div className="container mx-auto max-w-6xl">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Admin: Society Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage society creator emails and verification status. 
                Use this to backfill creator information for existing societies.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {societies.map((society) => (
              <Card key={society.id}>
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{society.name}</h3>
                        {society.is_verified && <VerifiedBadge size="sm" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Slug: {society.slug}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(society.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Creator Email
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            value={editingEmail[society.id] || ""}
                            onChange={(e) => setEditingEmail({
                              ...editingEmail,
                              [society.id]: e.target.value
                            })}
                            placeholder="creator@example.com"
                          />
                          <Button
                            onClick={() => handleUpdateCreatorEmail(
                              society.id, 
                              editingEmail[society.id]
                            )}
                            disabled={editingEmail[society.id] === (society.creator_email || "")}
                          >
                            Save
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">
                          Verified Society
                        </label>
                        <Switch
                          checked={society.is_verified}
                          onCheckedChange={() => handleToggleVerified(
                            society.id, 
                            society.is_verified
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminSocieties;
