import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { Plus, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import CreateSocietyDialog from "@/components/CreateSocietyDialog";
import JoinSocietyDialog from "@/components/JoinSocietyDialog";
import logo from "@/assets/logo.png";

interface Society {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSocieties();
    }
  }, [user]);

  const fetchSocieties = async () => {
    const { data, error } = await supabase
      .from("society_members")
      .select("society:societies(*)")
      .eq("user_id", user?.id);

    if (error) {
      toast.error("Failed to load societies");
      console.error(error);
    } else {
      setSocieties(data.map((item: any) => item.society).filter(Boolean));
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted">
        <header className="border-b bg-background">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="OurSafeBase" className="h-10" />
              <h1 className="text-xl font-bold">OurSafeBase</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold">Your Societies</h2>
            <p className="text-muted-foreground">
              Select a society to manage events or create a new one
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : societies.length === 0 ? (
            <Card className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle>Get Started</CardTitle>
                <CardDescription>
                  You're not a member of any societies yet. Create one or join with an invite code.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row">
                <Button onClick={() => setCreateDialogOpen(true)} className="flex-1">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Society
                </Button>
                <Button onClick={() => setJoinDialogOpen(true)} variant="outline" className="flex-1">
                  Join with Code
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6 flex gap-4">
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Society
                </Button>
                <Button onClick={() => setJoinDialogOpen(true)} variant="outline">
                  Join with Code
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {societies.map((society) => (
                  <Card
                    key={society.id}
                    className="cursor-pointer transition-all hover:shadow-lg"
                    onClick={() => navigate(`/society/${society.slug}/dashboard`)}
                  >
                    <CardHeader>
                      <CardTitle>{society.name}</CardTitle>
                      <CardDescription>
                        {society.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full">View Dashboard</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </main>

        <CreateSocietyDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={fetchSocieties}
        />
        <JoinSocietyDialog
          open={joinDialogOpen}
          onOpenChange={setJoinDialogOpen}
          onSuccess={fetchSocieties}
        />
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
