import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setChecking(false);
        // Clean the URL hash (#access_token=...&type=recovery...)
        window.history.replaceState({}, "", "/auth/reset-password");
      }
    });

    // Handle page refresh — Supabase may have already recovered the session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && window.location.hash.includes("type=recovery")) {
        setIsRecoveryMode(true);
        window.history.replaceState({}, "", "/auth/reset-password");
      }
      setChecking(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setSuccess(true);

      // Sign out + redirect to login with success message
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/auth", {
          state: { message: "Password updated successfully! Please log in." },
        });
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying reset link...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            {isRecoveryMode
              ? "Choose a strong new password"
              : "This link is invalid or has expired"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {success ? (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <AlertDescription>
                Password changed successfully! Redirecting to login...
              </AlertDescription>
            </Alert>
          ) : !isRecoveryMode ? (
            <div className="space-y-6">
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription>
                  {error || "This password reset link is no longer valid."}
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full"
                variant="outline"
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handlePasswordUpdate} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;