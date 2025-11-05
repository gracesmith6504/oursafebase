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

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [societyInfo, setSocietyInfo] = useState<{
    name: string;
    role: string;
  } | null>(null);
  const [loadingSocietyInfo, setLoadingSocietyInfo] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const inviteCode = searchParams.get("invite");
  const redirectPath = searchParams.get("redirect");

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
    // Don't redirect until society info is loaded (if invite code exists)
    if (user && (!inviteCode || !loadingSocietyInfo)) {
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
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) {
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

  return (
    <div className="min-h-screen bg-muted">
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-4">
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
                  The link will expire in 24 hours.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>📧 Check your inbox and spam folder</p>
                <p>⏱️ The email should arrive within a few minutes</p>
                <p>🔒 You must confirm your email before you can sign in</p>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowEmailConfirmation(false)}
              >
                Back to Sign In
              </Button>
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
                    placeholder="you@university.edu"
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
                    placeholder="you@university.edu"
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
      <Footer />
    </div>
  );
};

export default Auth;
