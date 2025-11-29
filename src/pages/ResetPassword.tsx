import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    const checkRecoveryToken = async () => {
      try {
        const hash = window.location.hash;
        const search = window.location.search;

        const params = new URLSearchParams(hash ? hash.substring(1) : search);
        const type = params.get("type");
        const errorParam = params.get("error");
        const errorCode = params.get("error_code");
        const errorDescription = params.get("error_description");
        const accessToken = params.get("access_token");

        // Handle errors in the URL
        if (errorParam) {
          setIsValidToken(false);
          if (errorCode === "otp_expired") {
            setError("This password reset link has expired. Please request a new one.");
          } else {
            setError(errorDescription || "Invalid or expired reset link. Please request a new one.");
          }
          setCheckingToken(false);
          return;
        }

        // Check if this is a recovery token
        if (type === "recovery" && accessToken) {
          // Set session with Supabase
          const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken });
          if (sessionError) throw sessionError;

          setIsValidToken(true);
        } else {
          setIsValidToken(false);
          setError("No valid password reset token found. Please request a new password reset link.");
        }
      } catch (err: any) {
        console.error("Error checking recovery token:", err);
        setIsValidToken(false);
        setError("An error occurred. Please try requesting a new password reset link.");
      } finally {
        setCheckingToken(false);
      }
    };

    checkRecoveryToken();
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
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setSuccess(true);

      // Clean URL
      window.history.replaceState(null, "", window.location.pathname);

      // Redirect after 2 seconds
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: any) {
      console.error("Password update error:", err);
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = () => navigate("/auth");

  if (checkingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            {isValidToken ? "Enter your new password below" : "This link is invalid or has expired"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Password updated successfully! Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          ) : isValidToken === false ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button onClick={handleRequestNewLink} className="w-full" variant="outline">
                Request New Reset Link
              </Button>
            </div>
          ) : (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
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
