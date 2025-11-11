import { Mail, GraduationCap, Linkedin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm mt-12">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-5 gap-8">
          {/* OurSafeBase */}
          <div className="space-y-3">
            <h3 className="font-heading font-semibold text-lg">OurSafeBase</h3>
            <p className="text-sm text-muted-foreground">
              Student event safety and welfare platform. Making events safer together.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="font-heading font-semibold">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Button
                  variant="link"
                  className="h-auto p-0 text-muted-foreground hover:text-primary"
                  onClick={() => navigate("/")}
                >
                  Home
                </Button>
              </li>
              <li>
                <Button
                  variant="link"
                  className="h-auto p-0 text-muted-foreground hover:text-primary"
                  onClick={() => navigate("/about")}
                >
                  About Us
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
            </ul>
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

          {/* Connect */}
          <div className="space-y-3">
            <h3 className="font-heading font-semibold">Connect</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:oursafebase@gmail.com"
                  className="text-muted-foreground hover:text-primary flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  oursafebase@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/company/oursafebase/"
                  className="text-muted-foreground hover:text-primary flex items-center gap-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <GraduationCap className="h-4 w-4" />
            <span>Backed by Trinity LaunchBox</span>
          </div>
          <p>© {new Date().getFullYear()} OurSafeBase. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
