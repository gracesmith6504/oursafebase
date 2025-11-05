import { Mail, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* About */}
          <div className="space-y-3">
            <h3 className="font-heading font-semibold text-lg">OurSafeBase</h3>
            <p className="text-sm text-muted-foreground">
              Student event safety and welfare platform. Making events safer together.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              Backed by Trinity LaunchBox
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="font-heading font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-muted-foreground hover:text-primary"
                  onClick={() => navigate("/privacy")}
                >
                  Privacy Policy
                </Button>
              </li>
              <li>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-muted-foreground hover:text-primary"
                  onClick={() => navigate("/terms")}
                >
                  Terms of Service
                </Button>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h3 className="font-heading font-semibold">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-muted-foreground hover:text-primary"
                  onClick={() => navigate("/faq")}
                >
                  FAQ
                </Button>
              </li>
              <li>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-muted-foreground hover:text-primary"
                  onClick={() => navigate("/contact")}
                >
                  Contact Us
                </Button>
              </li>
              <li>
                <a 
                  href="mailto:oursafebase@gmail.com"
                  className="text-muted-foreground hover:text-primary flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  oursafebase@gmail.com
                </a>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <h3 className="font-heading font-semibold">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-muted-foreground hover:text-primary"
                  onClick={() => navigate("/auth")}
                >
                  Sign In
                </Button>
              </li>
              <li>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-muted-foreground hover:text-primary"
                  onClick={() => navigate("/auth")}
                >
                  Create Account
                </Button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} OurSafeBase. All rights reserved.</p>
          <p className="mt-2 text-xs">
            Made with care for student safety and welfare.
          </p>
        </div>
      </div>
    </footer>
  );
};
