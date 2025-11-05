import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import logo from "@/assets/logo.png";
import { Footer } from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-subtle bg-pattern-dots">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm shadow-sm border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <img 
                src={logo} 
                alt="OurSafeBase" 
                className="h-10 md:h-12 w-auto"
                width="48"
                height="48"
              />
              <h1 className="text-xl md:text-2xl font-heading font-bold text-primary">OurSafeBase</h1>
            </div>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="rounded-xl"
            >
              Home
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-20 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-6xl font-heading font-bold text-primary">404</h1>
              <h2 className="text-2xl font-heading font-semibold">Page Not Found</h2>
              <p className="text-muted-foreground">
                Sorry, the page you're looking for doesn't exist or has been moved.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button 
                onClick={() => navigate("/")} 
                className="rounded-xl"
              >
                Go to Home
              </Button>
              <Button 
                onClick={() => navigate("/dashboard")} 
                variant="outline"
                className="rounded-xl"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default NotFound;
