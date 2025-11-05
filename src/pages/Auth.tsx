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
import { useAuth } from "@/lib/auth";
import logo from "@/assets/logo.png";
import { Footer } from "@/components/Footer";
import { getAppUrl } from "@/lib/constants";

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const inviteCode = searchParams.get("invite");
  const redirectPath = searchParams.get("redirect");

  useEffect(() => {
    (async () => {
      // Check for auth callback parameters in URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Success-first: if access_token exists, treat as success and skip error handling
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        setAuthError(null);
        setAuthSuccess(true);
        toast.success('Email confirmed successfully!');
        
        // Clean up the URL but preserve query params
        const queryParams = inviteCode ? `?invite=${inviteCode}` : '';
        window.history.replaceState({}, document.title, window.location.pathname + queryParams);
        
        // Redirect after a brief delay
        setTimeout(() => {
          if (inviteCode) {
            if (societyInfo?.role === 'committee') {
              navigate(`/onboarding?invite=${inviteCode}`);
            } else {
              navigate(`/invite/${inviteCode}`);
            }
          } else if (redirectPath) {
            navigate(redirectPath);
          } else {
            navigate("/dashboard");
          }
        }, 1500);
        return;
      }
      
      // ONLY check for errors if there was NO access_token
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');
      const errorCode = hashParams.get('error_code');
      
      if (error) {
        // If a valid session already exists, suppress errors and redirect
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setAuthError(null);
          setAuthSuccess(true);
          
          const queryParams = inviteCode ? `?invite=${inviteCode}` : '';
          window.history.replaceState({}, document.title, window.location.pathname + queryParams);
          
          setTimeout(() => {
            if (inviteCode) {
              if (societyInfo?.role === 'committee') {
                navigate(`/onboarding?invite=${inviteCode}`);
              } else {
                navigate(`/invite/${inviteCode}`);
              }
            } else if (redirectPath) {
              navigate(redirectPath);
            } else {
              navigate("/dashboard");
            }
          }, 1000);
          return;
        }

        // Specifically suppress the "otp_expired" popup entirely
        if (errorCode === 'otp_expired') {
          // Clean up URL and do not show any popup
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        let errorMessage = errorDescription || error;
        if (error === 'access_denied') {
          errorMessage = 'Email confirmation failed. The link may be invalid or already used.';
        }
        
        setAuthError(errorMessage);
        toast.error(errorMessage);
        
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    })();
  }, [inviteCode, redirectPath, societyInfo, navigate]);

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
        const { data } = await supabase
          .rpc("validate_invite_code", { invite_code: inviteCode });
        
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
    // Don't redirect if we're processing an auth callback
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasAuthCallback = hashParams.has('access_token') || hashParams.has('error');
    
    // Don't redirect until society info is loaded (if invite code exists)
    // AND we're not processing an auth callback
    if (user && (!inviteCode || !loadingSocietyInfo) && !hasAuthCallback) {
      if (inviteCode && societyInfo?.role === 'committee') {
        navigate(`/onboarding?invite=${inviteCode}`);
      } else if (inviteCode) {
        navigate(`/invite/${inviteCode}`);
      } else if (redirectPath) {
        navigate(redirectPath);
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, navigate, inviteCode, redirectPath, societyInfo, loadingSocietyInfo]);

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
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getAppUrl()}/auth${inviteCode ? `?invite=${inviteCode}` : ''}`,
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) {
        // Check if the error is about email already being registered
        if (error.message.toLowerCase().includes('already registered') || 
            error.message.toLowerCase().includes('already been registered')) {
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
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
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
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${getAppUrl()}/auth${inviteCode ? `?invite=${inviteCode}` : ''}`,
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
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${getAppUrl()}/auth${inviteCode ? `?invite=${inviteCode}` : ''}`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      setPasswordResetSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-muted">
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          {authError && !authSuccess && !showEmailConfirmation && !showPasswordReset && (
            <Alert variant="destructive">
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          {authSuccess && !showEmailConfirmation && !showPasswordReset && (
            <Alert>
              <AlertDescription>✅ Email confirmed! Redirecting...</AlertDescription>
            </Alert>
          )}

          {showEmailConfirmation ? (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Mail className="h-12 w-12 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription>
                We've sent a confirmation link to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  <strong className="block mb-2">{email}</strong>
                  Please click the confirmation link in the email to activate your account.
                  University emails may take longer to reach
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>📧 Check your inbox and spam folder</p>
                <p>⏱️ The email should arrive within a few minutes</p>
                <p>🔒 You must confirm your email before you can sign in</p>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleResendConfirmation}
                  disabled={loading || resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Email"}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowEmailConfirmation(false)}
                >
                  Back to Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : showPasswordReset ? (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Mail className="h-12 w-12 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">
                {passwordResetSent ? "Check Your Email" : "Reset Password"}
              </CardTitle>
              <CardDescription>
                {passwordResetSent 
                  ? "We've sent you a password reset link"
                  : "Enter your email to receive a password reset link"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordResetSent ? (
                <>
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                      <strong className="block mb-2">{resetEmail}</strong>
                      Click the link in the email to reset your password.
                      University emails may take longer to reach.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>📧 Check your inbox and spam folder</p>
                    <p>⏱️ The email should arrive within a few minutes</p>
                    <p>🔒 The link is single-use and expires after 1 hour</p>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setShowPasswordReset(false);
                      setPasswordResetSent(false);
                      setResetEmail("");
                    }}
                  >
                    Back to Sign In
                  </Button>
                </>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@gmail.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setShowPasswordReset(false);
                      setResetEmail("");
                    }}
                  >
                    Back to Sign In
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <img src={logo} alt="OurSafeBase" className="h-16" />
          </div>
          <CardTitle className="text-2xl">Welcome to OurSafeBase</CardTitle>
          <CardDescription className="space-y-2">
            {inviteCode && societyInfo ? (
              <div className="text-center">
                <p className="mb-2">You have been invited to join</p>
                <p className="font-bold text-lg text-foreground">{societyInfo.name}</p>
                {societyInfo.role === 'committee' && (
                  <>
                    <p className="text-sm mt-1">as a committee member</p>
                    <p className="text-xs mt-2 text-muted-foreground">
                      You'll be asked to provide your phone number for safety purposes
                    </p>
                  </>
                )}
              </div>
            ) : inviteCode ? (
              "You're joining a society. Sign in or create an account to continue."
            ) : (
              "Create safer events for your student society"
            )}
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
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <PasswordInput
                    id="signin-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowPasswordReset(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot your password?
                  </button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <PasswordInput
                    id="signup-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <PasswordInput
                    id="signup-confirm-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  required
                  />
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    required
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      className="text-primary hover:underline"
                    >
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
      </Card>
        )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
