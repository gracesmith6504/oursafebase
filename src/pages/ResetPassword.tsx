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
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    const verifyRecoveryToken = async () => {
      try {
        console.log("Starting token verification...");
        
        // Get the full URL and hash
        const hash = window.location.hash;
        console.log("URL hash:", hash);

        if (!hash || hash === "#") {
          console.log("No hash found in URL");
          setIsValidToken(false);
          setError("No password reset token found. Please request a new reset link.");
          setCheckingToken(false);
          return;
        }

        // Parse the hash parameters
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get("type");
        const accessToken = hashParams.get("access_token");
        
        console.log("Type:", type);
        console.log("Access token exists:", !!accessToken);

        // Check if it's a recovery flow
        if (type !== "recovery" || !accessToken) {
          console.log("Not a recovery flow or missing access token");
          setIsValidToken(false);
          setError("Invalid reset link format. Please request a new password reset link.");
          setCheckingToken(false);
          return;
        }

        // Try to set the session with the recovery token
        console.log("Attempting to set session with recovery token...");
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get("refresh_token") || "",
        });

        if (sessionError) {
          console.error("Session error:", sessionError);
          setIsValidToken(false);
          setError("This reset link is invalid or has expired. Please request a new one.");
          setCheckingToken(false);
          return;
        }

        console.log("Session set successfully:", sessionData);

        // Verify we have a user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData.user) {
          console.error("User verification failed:", userError);
          setIsValidToken(false);
          setError("Unable to verify your account. Please request a new reset link.");
          setCheckingToken(false);
          return;
        }

        console.log("User verified:", userData.user.email);
        setIsValidToken(true);
        
      } catch (err) {
        console.error("Unexpected error during token verification:", err);
        setIsValidToken(false);
        setError("An unexpected error occurred. Please try requesting a new password reset link.");
      } finally {
        setCheckingToken(false);
      }
    };

    verifyRecoveryToken();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
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
      console.log("Attempting to update password...");
      
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("Password update error:", updateError);
        throw updateError;
      }

      console.log("Password updated successfully:", data);
      setSuccess(true);

      // Clean up the URL
      window.history.replaceState(null, "", window.location.pathname);

      // Sign out the recovery session
      await supabase.auth.signOut();

      // Redirect after success
      setTimeout(() => {
        navigate("/auth");
      }, 3000);

    } catch (error: any) {
      console.error("Password update failed:", error);
      setError(error.message || "Failed to update password. The link may have expired. Please request a new reset link.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = () => {
    navigate("/auth?mode=reset");
  };

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
            {isValidToken
              ? "Enter your new password below"
              : "This link is invalid or has expired"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Password updated successfully! Redirecting to login...
              </AlertDescription>
            </Alert>
          ) : isValidToken === false ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button
                onClick={handleRequestNewLink}
                className="w-full"
              >
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
                  placeholder="Enter new password (min. 6 characters)"
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