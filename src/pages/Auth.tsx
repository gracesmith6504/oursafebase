import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/logo.png";
import { Footer } from "@/components/Footer";
import { getAppUrl } from "@/lib/constants";

// Detect if user is using an in-app browser (WebView)
const detectInAppBrowser = () => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Common in-app browsers that block Google OAuth
  const inAppBrowsers = [/Instagram/i, /FBAN|FBAV/i,
  // Facebook
  /musical_ly|TikTok/i,
  // TikTok
  /Line\//i,
  // LINE
  /MicroMessenger/i,
  // WeChat
  /LinkedInApp/i,
  // LinkedIn
  /GSA\//i,
  // Google Search App (Gmail in-app)
  /twitter/i,
  // Twitter
  /snapchat/i // Snapchat
  ];
  return inAppBrowsers.some(pattern => pattern.test(ua));
};
const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);
  const [societyInfo, setSocietyInfo] = useState<{
    name: string;
    role: string;
  } | null>(null);
  const [loadingSocietyInfo, setLoadingSocietyInfo] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [hasAuthCallback, setHasAuthCallback] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [showConsentScreen, setShowConsentScreen] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [checkingConsent, setCheckingConsent] = useState(false);
  const [processingAuth, setProcessingAuth] = useState(false);
  const [authLoadingMessage, setAuthLoadingMessage] = useState("Signing you in...");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user
  } = useAuth();
  const inviteCode = searchParams.get("invite");
  const redirectPath = searchParams.get("redirect");

  // Check if user is on an in-app browser on mount
  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
  }, []);
  useEffect(() => {
    (async () => {
      // Check for auth callback parameters in URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get("type");
      const hashError = hashParams.get("error");
      const hashErrorCode = hashParams.get("error_code");
      const hashErrorDescription = hashParams.get("error_description");
      const accessToken = hashParams.get("access_token");

      // If we detect any auth callback, show loading state immediately
      if (accessToken || type || hashError) {
        setProcessingAuth(true);
        
        // Set appropriate loading message based on type
        if (type === "recovery") {
          setAuthLoadingMessage("Confirming your email...");
        } else if (accessToken) {
          setAuthLoadingMessage("Signing you in...");
        }
      }

      // Success-first: if access_token exists, treat as success and skip error handling
      if (accessToken) {
        setAuthError(null);
        setAuthSuccess(true);
        setHasAuthCallback(true);
        // Do NOT clean the URL here; let the redirect effect handle it after session is set
        return;
      }

      // ONLY check for errors if there was NO access_token and NO recovery flow
      if (hashError) {
        // If a valid session already exists, suppress errors
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        if (session) {
          setAuthError(null);
          setAuthSuccess(true);
          const queryParams = inviteCode ? `?invite=${inviteCode}` : "";
          window.history.replaceState({}, document.title, window.location.pathname + queryParams);
          // Don't redirect here - let the second useEffect handle it after society info loads
          return;
        }

        // Specifically suppress the "otp_expired" popup entirely
        if (hashErrorCode === "otp_expired") {
          // Clean up URL and do not show any popup
          window.history.replaceState({}, document.title, window.location.pathname);
          setProcessingAuth(false);
          return;
        }
        
        let errorMessage = hashErrorDescription || hashError;
        if (hashError === "access_denied") {
          errorMessage = "We couldn't sign you in. Please try again.";
        }
        setAuthError(errorMessage);
        setProcessingAuth(false);

        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    })();
  }, [inviteCode, redirectPath, navigate]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);
  useEffect(() => {
    const fetchSocietyInfo = async () => {
      if (inviteCode) {
        setLoadingSocietyInfo(true);
        const {
          data
        } = await supabase.rpc("validate_invite_code", {
          invite_code: inviteCode
        });
        if (data && data.length > 0) {
          setSocietyInfo({
            name: data[0].society_name,
            role: data[0].role_type
          });
        }
        setLoadingSocietyInfo(false);
      }
    };
    fetchSocietyInfo();
  }, [inviteCode]);
  useEffect(() => {
    // Check if user needs to provide consent
    const checkConsent = async () => {
      if (!user) {
        setCheckingConsent(false);
        setProcessingAuth(false);
        return;
      }

      // Don't check consent if we're still in the middle of showing other UI states
      if (showEmailConfirmation || showPasswordReset || loading) {
        setCheckingConsent(false);
        setProcessingAuth(false);
        return;
      }

      setCheckingConsent(true);
      setProcessingAuth(false); // Stop showing the auth processing screen

      const { data: consent } = await supabase
        .from("user_consents" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // If consent already exists, proceed with redirect
      if (consent) {
        // If there's an invite code, wait for society info to load
        if (inviteCode && loadingSocietyInfo) return;

        // Now we can safely clean the URL and redirect
        const cleaned = new URLSearchParams();
        if (inviteCode) cleaned.set("invite", inviteCode);
        if (redirectPath) cleaned.set("redirect", redirectPath);
        const newUrl = `${window.location.pathname}${cleaned.toString() ? `?${cleaned.toString()}` : ""}`;
        window.history.replaceState({}, document.title, newUrl);
        if (inviteCode && societyInfo?.role === "committee") {
          navigate(`/onboarding?invite=${inviteCode}`);
        } else if (inviteCode) {
          navigate(`/invite/${inviteCode}`);
        } else if (redirectPath) {
          navigate(redirectPath);
        } else {
          navigate("/dashboard");
        }
        return;
      }

      // Check if user signed in with Google OAuth
      const isGoogleUser = user.app_metadata?.provider === 'google';

      // Check if user accepted terms during email signup (stored in metadata)
      const acceptedTermsInMetadata = user.user_metadata?.accepted_terms;
      
      // For Google OAuth users without consent, show consent screen
      if (isGoogleUser && !consent) {
        setShowConsentScreen(true);
        setCheckingConsent(false);
        return;
      }

      // For email signup users with accepted terms in metadata, auto-record consent
      if (acceptedTermsInMetadata) {
        // Auto-record consent for email signups
        const { error: insertError } = await supabase.from("user_consents" as any).insert({
          user_id: user.id,
          accepted_terms: true,
          user_agent: navigator.userAgent,
        });

        if (!insertError) {
          // Proceed with redirect after recording consent
          if (inviteCode && loadingSocietyInfo) return;

          const cleaned = new URLSearchParams();
          if (inviteCode) cleaned.set("invite", inviteCode);
          if (redirectPath) cleaned.set("redirect", redirectPath);
          const newUrl = `${window.location.pathname}${cleaned.toString() ? `?${cleaned.toString()}` : ""}`;
          window.history.replaceState({}, document.title, newUrl);
          if (inviteCode && societyInfo?.role === "committee") {
            navigate(`/onboarding?invite=${inviteCode}`);
          } else if (inviteCode) {
            navigate(`/invite/${inviteCode}`);
          } else if (redirectPath) {
            navigate(redirectPath);
          } else {
            navigate("/dashboard");
          }
          return;
        }
      }

      // For any other case (shouldn't normally happen), just redirect
      if (!isGoogleUser && !consent) {
        if (inviteCode && loadingSocietyInfo) return;
        
        const cleaned = new URLSearchParams();
        if (inviteCode) cleaned.set("invite", inviteCode);
        if (redirectPath) cleaned.set("redirect", redirectPath);
        const newUrl = `${window.location.pathname}${cleaned.toString() ? `?${cleaned.toString()}` : ""}`;
        window.history.replaceState({}, document.title, newUrl);
        if (inviteCode && societyInfo?.role === "committee") {
          navigate(`/onboarding?invite=${inviteCode}`);
        } else if (inviteCode) {
          navigate(`/invite/${inviteCode}`);
        } else if (redirectPath) {
          navigate(redirectPath);
        } else {
          navigate("/dashboard");
        }
      }

      setCheckingConsent(false);
    };

    checkConsent();
  }, [user, navigate, inviteCode, redirectPath, societyInfo, loadingSocietyInfo, showEmailConfirmation, showPasswordReset, loading]);
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Please accept the Terms of Service and Privacy Policy");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const displayName = name.trim();
      const {
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getAppUrl()}/auth${inviteCode ? `?invite=${inviteCode}` : ""}`,
          data: {
            display_name: displayName,
            accepted_terms: true // Store consent in user metadata
          }
        }
      });
      if (error) {
        // Check if the error is about email already being registered
        if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already been registered")) {
          toast.error("This email is already registered. Please sign in instead.");
          setLoading(false);
          // Switch to sign-in tab after a brief delay
          setTimeout(() => {
            const signInTab = document.querySelector('[value="signin"]');
            if (signInTab) {
              (signInTab as HTMLElement).click();
            }
          }, 1500);
          return;
        }
        toast.error(error.message);
        setLoading(false);
        return;
      }
      setShowEmailConfirmation(true);
      
      // For email signups, consent will be recorded automatically when they first sign in
      // after email confirmation (via the consent check in useEffect)
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("An error occurred during signup");
    }
    setLoading(false);
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    const {
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      toast.error(error.message);
    }
    setLoading(false);
  };
  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    const {
      error
    } = await supabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo: `${getAppUrl()}/auth${inviteCode ? `?invite=${inviteCode}` : ""}`
      }
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Confirmation email sent! Check your inbox.");
      setResendCooldown(10); // Start 10 second cooldown
    }
    setLoading(false);
  };
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    const {
      error
    } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `https://oursafebase.com/auth/reset-password`
    });
    if (error) {
      toast.error(error.message);
    } else {
      setPasswordResetSent(true);
    }
    setLoading(false);
  };
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const {
      error
    } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth${inviteCode ? `?invite=${inviteCode}` : ""}`
      }
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
    // Don't set loading to false on success - user will be redirected
  };

  const handleConsentContinue = async () => {
    if (!consentAccepted) {
      toast.error("Please accept the Terms of Service and Privacy Policy to continue");
      return;
    }

    setRecordingConsent(true);

    try {
      // Record consent in database
      const { error } = await supabase.from("user_consents" as any).insert({
        user_id: user!.id,
        accepted_terms: true,
        ip_address: null, // Could fetch from an API if needed
        user_agent: navigator.userAgent,
      });

      if (error) {
        toast.error("Failed to record consent. Please try again.");
        setRecordingConsent(false);
        return;
      }

      setShowConsentScreen(false);
      setRecordingConsent(false);

      // Redirect based on invite code and role
      if (inviteCode) {
        if (societyInfo?.role === 'committee') {
          navigate(`/onboarding?invite=${inviteCode}`);
        } else {
          navigate(`/invite/${inviteCode}`);
        }
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error recording consent:", error);
      toast.error("An error occurred. Please try again.");
      setRecordingConsent(false);
    }
  };
  
  // Show loading spinner while processing auth callback (Google OAuth, email confirmation)
  if (processingAuth && !authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-lg font-medium text-foreground">{authLoadingMessage}</p>
          <p className="text-sm text-muted-foreground">Please wait a moment...</p>
        </div>
      </div>
    );
  }

  // Show loading spinner while checking consent
  if (checkingConsent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Show consent screen on its own page (no auth form underneath)
  if (showConsentScreen && user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3">
            <div className="flex justify-center mb-2">
              <img src={logo} alt="OurSafeBase" className="h-12" />
            </div>
            <CardTitle className="text-2xl">Welcome to OurSafeBase!</CardTitle>
            <CardDescription className="text-base">
              Before you get started, please review and accept our Terms of Service and Privacy Policy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3 rounded-lg border p-4">
              <Checkbox
                id="consent-terms"
                checked={consentAccepted}
                onCheckedChange={(checked) => setConsentAccepted(checked === true)}
                className="mt-1"
              />
              <label
                htmlFor="consent-terms"
                className="text-sm leading-relaxed cursor-pointer flex-1"
              >
                I agree to the{" "}
                <a
                  href="/terms-of-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </a>
              </label>
            </div>
            <Button
              onClick={handleConsentContinue}
              disabled={!consentAccepted || recordingConsent}
              className="w-full"
              size="lg"
            >
              {recordingConsent ? "Recording..." : "Continue to OurSafeBase"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <div className="min-h-screen bg-muted">
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          {isInAppBrowser && !showEmailConfirmation && !showPasswordReset && <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <AlertDescription className="text-sm">
                <strong className="block mb-1">⚠️ Please open in external browser</strong>
                <p className="mb-2">Google sign-in won't work in this app's browser.</p>
                <p className="text-xs">
                  Tap the <strong>three dots (⋯)</strong> menu and select <strong>"Open in browser"</strong> or{" "}
                  <strong>"Open in external browser"</strong>
                </p>
              </AlertDescription>
            </Alert>}

          {authError && !authSuccess && !showEmailConfirmation && !showPasswordReset && <Alert variant="destructive">
              <AlertDescription>{authError}</AlertDescription>
            </Alert>}

          {showEmailConfirmation ? <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Mail className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Check Your Email</CardTitle>
                <CardDescription>We've sent a confirmation link to</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    <strong className="block mb-2">{email}</strong>
                    Please click the confirmation link in the email to activate your account. University emails may take
                    longer to reach
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>📧 Check your inbox and spam folder</p>
                  <p>⏱️ The email should arrive within a few minutes</p>
                  <p>🔒 You must confirm your email before you can sign in</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleResendConfirmation} disabled={loading || resendCooldown > 0}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Email"}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowEmailConfirmation(false)}>
                    Back to Sign In
                  </Button>
                </div>
              </CardContent>
            </Card> : showPasswordReset ? <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Mail className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">{passwordResetSent ? "Check Your Email" : "Reset Password"}</CardTitle>
                <CardDescription>
                  {passwordResetSent ? "We've sent you a password reset link" : "Enter your email to receive a password reset link"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordResetSent ? <>
                    <Alert>
                      <Mail className="h-4 w-4" />
                      <AlertDescription className="ml-2">
                        <strong className="block mb-2">{resetEmail}</strong>
                        Click the link in the email to reset your password. University emails may take longer to reach.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>📧 Check your inbox and spam folder</p>
                      <p>⏱️ The email should arrive within a few minutes</p>
                      <p>🔒 The link is single-use and expires after 1 hour</p>
                    </div>

                    <Button variant="outline" className="w-full" onClick={() => {
                setShowPasswordReset(false);
                setPasswordResetSent(false);
                setResetEmail("");
              }}>
                      Back to Sign In
                    </Button>
                  </> : <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input id="reset-email" type="email" placeholder="you@gmail.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} disabled={loading} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Sending..." : "Send Reset Link"}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={() => {
                setShowPasswordReset(false);
                setResetEmail("");
              }}>
                      Back to Sign In
                    </Button>
                  </form>}
              </CardContent>
            </Card> : <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mb-4 flex justify-center">
                  <img src={logo} alt="OurSafeBase" className="h-16" />
                </div>
                <CardTitle className="text-2xl">Welcome to OurSafeBase</CardTitle>
                <CardDescription className="space-y-2">
                  {inviteCode && societyInfo ? <div className="text-center">
                      <p className="mb-2">You have been invited to join</p>
                      <p className="font-bold text-lg text-foreground">{societyInfo.name}</p>
                      {societyInfo.role === "committee" && (
                        <p className="text-sm mt-1">as a committee member</p>
                      )}
                    </div> : inviteCode ? "You're joining a society. Sign in or create an account to continue." : "Create safer events for your student society"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="signin">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input id="signin-email" type="email" placeholder="you@gmail.com" value={email} onChange={e => setEmail(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <PasswordInput id="signin-password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                      </Button>
                      <div className="text-center">
                        <button type="button" onClick={() => setShowPasswordReset(true)} className="text-sm text-primary hover:underline">
                          Forgot your password?
                        </button>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Name</Label>
                        <Input id="signup-name" type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} disabled={loading} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input id="signup-email" type="email" placeholder="you@gmail.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} required />
                        <p className="text-xs text-muted-foreground">Use a personal email like @gmail.com for best experience 
(university emails may be slower)</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <PasswordInput id="signup-password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                        <PasswordInput id="signup-confirm-password" placeholder="Re-enter your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} required />
                      </div>

                      <div className="flex items-start space-x-2">
                        <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={checked => setAcceptedTerms(checked as boolean)} required />
                        <label htmlFor="terms" className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          I agree to the{" "}
                          <a href="/terms" target="_blank" className="text-primary hover:underline">
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a href="/privacy" target="_blank" className="text-primary hover:underline">
                            Privacy Policy
                          </a>
                        </label>
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>}
        </div>
      </div>
      <Footer />
    </div>;
};
export default Auth;