import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, ArrowLeft, AlertTriangle, Phone, Users, FileQuestion, Briefcase, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const Contact = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    // Create mailto link as fallback (since we don't have a backend email service configured yet)
    const mailtoLink = `mailto:oursafebase@gmail.com?subject=${encodeURIComponent(
      formData.subject
    )}&body=${encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    )}`;

    window.location.href = mailtoLink;
    
    toast.success("Opening your email client...");
    setLoading(false);
    
    // Reset form
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="mb-8 border-b bg-background pb-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Back</span>
            </Button>
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <img src={logo} alt="OurSafeBase" className="h-8 md:h-10" />
              <h1 className="text-lg md:text-xl font-bold">OurSafeBase</h1>
            </div>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Emergency Disclaimer Banner */}
        <div className="bg-destructive/10 border-2 border-destructive/30 p-5 rounded-lg mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-destructive mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-destructive mb-2">⚠️ If you or someone else is in immediate danger:</h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <strong className="text-foreground">Call 112 or 999 immediately</strong>
                </li>
                <li>• Contact university security or campus welfare services</li>
                <li>• Samaritans: <strong className="text-foreground">116 123</strong> (24/7 helpline)</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                OurSafeBase is not an emergency service. For urgent help, use the numbers above.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contact OurSafeBase Support
              </CardTitle>
              <CardDescription>
                For general inquiries, technical support, or platform questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Email us at:</p>
                <a 
                  href="mailto:oursafebase@gmail.com" 
                  className="text-lg font-semibold text-primary hover:underline flex items-center gap-2"
                >
                  <Mail className="h-5 w-5" />
                  oursafebase@gmail.com
                </a>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Response Time:</strong> Within 2-3 business days
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <h3 className="font-semibold text-sm">We can help with:</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 mt-0.5 text-primary" />
                    <span>Technical support & bug reports</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mt-0.5 text-primary" />
                    <span>Account & society setup questions</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <FileQuestion className="h-4 w-4 mt-0.5 text-primary" />
                    <span>Data requests (GDPR)</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4 mt-0.5 text-primary" />
                    <span>Partnership inquiries</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Support Options */}
          <Card>
            <CardHeader>
              <CardTitle>Other Ways to Get Help</CardTitle>
              <CardDescription>Additional resources and information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-2">Data Requests (GDPR)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  To request your data or account deletion:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
                  <li>Email: oursafebase@gmail.com</li>
                  <li>Subject: "Data Request - [Your Name]"</li>
                  <li>Include: Your registered email address</li>
                  <li>Response within 30 days</li>
                </ul>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-2">Partnership Inquiries</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Interested in partnering with OurSafeBase?
                </p>
                <p className="text-xs text-muted-foreground">
                  We work with universities, student unions, and welfare organizations. Email us with "Partnership Inquiry" in the subject line.
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-2">Backed by Trinity LaunchBox</h3>
                <p className="text-xs text-muted-foreground">
                  OurSafeBase is supported by Trinity College Dublin's startup accelerator program.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send Us a Message</CardTitle>
            <CardDescription>
              Fill out the form below and we'll get back to you within 2-3 business days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@university.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical Support">Technical Support</SelectItem>
                    <SelectItem value="Data Request (GDPR)">Data Request (GDPR)</SelectItem>
                    <SelectItem value="Partnership Inquiry">Partnership Inquiry</SelectItem>
                    <SelectItem value="General Question">General Question</SelectItem>
                    <SelectItem value="Account Issue">Account Issue</SelectItem>
                    <SelectItem value="Society Setup Help">Society Setup Help</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Please describe your inquiry in detail..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="min-h-[150px]"
                  maxLength={1000}
                  required
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.message.length} / 1000 characters
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <Mail className="mr-2 h-4 w-4" />
                {loading ? "Sending..." : "Send Message"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By submitting this form, you agree to our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button onClick={() => navigate("/")} variant="ghost">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Contact;
