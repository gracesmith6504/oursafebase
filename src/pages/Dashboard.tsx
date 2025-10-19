import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, LogOut, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import CreateSocietyDialog from "@/components/CreateSocietyDialog";
import JoinSocietyDialog from "@/components/JoinSocietyDialog";
import logo from "@/assets/logo.png";

interface SocietyMembership {
  role: "committee" | "attendee";
  society: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [societies, setSocieties] = useState<SocietyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSocieties();
    }
  }, [user]);

  // Refresh societies when user returns to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchSocieties();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const fetchSocieties = async () => {
    const { data, error } = await supabase
      .from("society_members")
      .select("role, society:societies(id, name, slug, description)")
      .eq("user_id", user?.id);

    if (error) {
      toast.error("Failed to load societies");
      console.error(error);
    } else {
      setSocieties(
        data
          .map((item: any) => ({
            role: item.role,
            society: item.society,
          }))
          .filter((m) => m.society)
      );
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
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={logo} alt="OurSafeBase" className="h-8 md:h-10" />
              <h1 className="text-lg md:text-xl font-bold">OurSafeBase</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/my-events")}>
                <Calendar className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">My Events</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                <User className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Profile</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLogoutDialogOpen(true)}>
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Sign Out</span>
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
                {societies.map((membership) => (
                  <Card
                    key={membership.society.id}
                    className="cursor-pointer transition-all hover:shadow-lg"
                    onClick={() =>
                      navigate(
                        membership.role === "committee"
                          ? `/society/${membership.society.slug}/dashboard`
                          : `/society/${membership.society.slug}`
                      )
                    }
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{membership.society.name}</CardTitle>
                        <Badge variant={membership.role === "committee" ? "default" : "secondary"}>
                          {membership.role === "committee" ? "Committee" : "Attendee"}
                        </Badge>
                      </div>
                <CardDescription className="break-words line-clamp-3">
                  {membership.society.description || "No description"}
                </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full">
                        {membership.role === "committee" ? "View Dashboard" : "View Society"}
                      </Button>
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
              <AlertDialogCancel className="w-full mt-0">
                Cancel
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
