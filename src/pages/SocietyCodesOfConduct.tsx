import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { useCommitteeRole } from "@/lib/useCommitteeRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Plus, Edit, Trash2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";
import { CreateCoCDialog } from "@/components/CreateCoCDialog";
import { EditCoCDialog } from "@/components/EditCoCDialog";
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

interface Society {
  id: string;
  name: string;
  slug: string;
}

interface CodeOfConduct {
  id: string;
  content: string;
  version: number;
  is_active: boolean;
  created_at: string;
  name?: string;
}

const SocietyCodesOfConduct = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [society, setSociety] = useState<Society | null>(null);
  const [cocs, setCocs] = useState<CodeOfConduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCoC, setEditingCoC] = useState<CodeOfConduct | null>(null);
  const [deletingCoCId, setDeletingCoCId] = useState<string | null>(null);
  const { isCommittee, loading: roleLoading } = useCommitteeRole(society?.id);

  useEffect(() => {
    if (user && slug) {
      fetchSocietyAndCoCs();
    }
  }, [user, slug]);

  const fetchSocietyAndCoCs = async () => {
    const { data: societyData, error: societyError } = await supabase
      .from("societies")
      .select("id, name, slug")
      .eq("slug", slug)
      .single();

    if (societyError || !societyData) {
      toast.error("Society not found");
      navigate("/dashboard");
      return;
    }

    setSociety(societyData);

    // Fetch society-level CoCs (event_id is null)
    const { data: cocsData, error: cocsError } = await supabase
      .from("code_of_conduct")
      .select("*")
      .eq("society_id", societyData.id)
      .is("event_id", null)
      .order("created_at", { ascending: false });

    if (!cocsError && cocsData) {
      setCocs(cocsData);
    }

    setLoading(false);
  };

  const handleSetActive = async (cocId: string) => {
    if (!society) return;

    // First, set all CoCs to inactive
    await supabase
      .from("code_of_conduct")
      .update({ is_active: false })
      .eq("society_id", society.id)
      .is("event_id", null);

    // Then set the selected one to active
    const { error } = await supabase
      .from("code_of_conduct")
      .update({ is_active: true })
      .eq("id", cocId);

    if (error) {
      toast.error("Failed to set active Code of Conduct");
      return;
    }

    toast.success("Code of Conduct set as active");
    fetchSocietyAndCoCs();
  };

  const handleDelete = async () => {
    if (!deletingCoCId || !society) return;

    const deletingCoC = cocs.find(c => c.id === deletingCoCId);
    if (!deletingCoC) return;

    // Check if this CoC has any acceptances
    const { data: acceptancesData } = await supabase
      .from("code_acceptances")
      .select("id")
      .eq("code_of_conduct_id", deletingCoCId)
      .limit(1);

    if (acceptancesData && acceptancesData.length > 0) {
      toast.error("Cannot delete: This Code of Conduct has acceptance records");
      setDeletingCoCId(null);
      return;
    }

    // Check if this CoC is being used by any events (check for event-specific copies with same version)
    const { data: usageData } = await supabase
      .from("code_of_conduct")
      .select("id")
      .not("event_id", "is", null)
      .eq("version", deletingCoC.version);

    if (usageData && usageData.length > 0) {
      toast.error("Cannot delete: This CoC is being used by events");
      setDeletingCoCId(null);
      return;
    }

    const { error } = await supabase
      .from("code_of_conduct")
      .delete()
      .eq("id", deletingCoCId)
      .eq("society_id", society.id);

    if (error) {
      console.error("Error deleting CoC:", error);
      toast.error(error.message || "Failed to delete Code of Conduct");
      return;
    }

    toast.success("Code of Conduct deleted");
    setDeletingCoCId(null);
    fetchSocietyAndCoCs();
  };

  if (loading || roleLoading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isCommittee) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Committee Access Required</CardTitle>
              <CardDescription>
                You need committee access to manage codes of conduct.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/my-events')}>
                Back to My Events
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted">
        <header className="border-b bg-background">
          <div className="container mx-auto flex items-center gap-4 px-4 py-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/society/${slug}/dashboard`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logo} alt="OurSafeBase" className="h-8" />
            <div>
              <h1 className="text-xl font-bold">{society?.name}</h1>
              <p className="text-sm text-muted-foreground">Code of Conduct Templates</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {cocs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-4 text-center text-muted-foreground">
                  No templates yet. Create one to assign to your events.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {cocs.map((coc) => (
                <Card key={coc.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {coc.name || `Template v${coc.version}`}
                          </CardTitle>
                          {coc.is_active && (
                            <Badge variant="default">Active</Badge>
                          )}
                        </div>
                        <CardDescription>
                          Created {new Date(coc.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingCoC(coc)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCoCId(coc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 max-h-32 overflow-hidden text-sm text-muted-foreground">
                      {coc.content.substring(0, 200)}...
                    </div>
                    {!coc.is_active && (
                      <Button
                        variant="outline"
                        onClick={() => handleSetActive(coc.id)}
                      >
                        Set as Active
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              <div className="flex justify-center pt-4">
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New
                </Button>
              </div>
            </div>
          )}
        </main>

        <CreateCoCDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          societyId={society?.id || ""}
          onSuccess={fetchSocietyAndCoCs}
        />

        {editingCoC && (
          <EditCoCDialog
            open={!!editingCoC}
            onOpenChange={(open) => !open && setEditingCoC(null)}
            coc={editingCoC}
            onSuccess={fetchSocietyAndCoCs}
          />
        )}

        <AlertDialog open={!!deletingCoCId} onOpenChange={() => setDeletingCoCId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Code of Conduct?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Events currently using this code of conduct will no longer have one assigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
};

export default SocietyCodesOfConduct;
