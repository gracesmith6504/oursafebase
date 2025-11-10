import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Footer } from "@/components/Footer";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl font-heading">Privacy Policy</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Last updated: January 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            {/* Introduction */}
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to OurSafeBase. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use our student event safety platform.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg mt-3">
                <p className="text-sm font-semibold mb-2">Data Controller:</p>
                <p className="text-sm text-muted-foreground">OurSafeBase</p>
                <p className="text-sm text-muted-foreground">Backed by Trinity LaunchBox</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  oursafebase@gmail.com
                </p>
              </div>
            </section>

            {/* What Data We Collect */}
            <section>
              <h2 className="text-xl font-semibold mb-3">2. What Data We Collect</h2>
              <p className="text-muted-foreground mb-3">We collect the following types of information:</p>
              
              <h3 className="text-lg font-semibold mt-4 mb-2">Account Information</h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Email address (for login and notifications)</li>
                <li>Name (display name for your profile)</li>
                <li>Phone number (optional, required for committee members for safety purposes)</li>
                <li>Password (stored encrypted)</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">Society & Event Data</h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Society memberships and roles (committee member or attendee)</li>
                <li>Event attendance and participation records</li>
                <li>Code of Conduct acceptance records</li>
                <li>Event contacts and emergency information</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">Reports & Feedback</h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Incident reports (anonymous or identified, your choice)</li>
                <li>Event feedback submissions</li>
                <li>Contact information (only if you choose to provide it)</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">Analytics Data</h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Safety page views and access times</li>
                <li>IP addresses (for security and analytics)</li>
                <li>Browser user agent information</li>
              </ul>
            </section>

            {/* How We Use Your Data */}
            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Data</h2>
              <p className="text-muted-foreground mb-3">We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Provide Safety Services:</strong> Enable access to welfare contacts, emergency information, and reporting tools during events</li>
                <li><strong>Process Reports:</strong> Handle incident reports and welfare concerns submitted through the platform</li>
                <li><strong>Send Notifications:</strong> Email committee members about new reports, concerns, or platform updates</li>
                <li><strong>Manage Memberships:</strong> Track society memberships and roles for access control</li>
                <li><strong>Improve Platform:</strong> Analyze usage patterns to enhance safety features and user experience</li>
                <li><strong>Ensure Security:</strong> Protect against fraud, abuse, and security threats</li>
                <li><strong>Comply with Legal Obligations:</strong> Meet legal requirements and respond to lawful requests</li>
              </ul>
            </section>

            {/* Legal Basis for Processing (GDPR) */}
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Legal Basis for Processing (GDPR Article 6)</h2>
              <p className="text-muted-foreground mb-3">Under GDPR, we process your data based on:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Consent:</strong> When you create an account and accept our Terms of Service</li>
                <li><strong>Legitimate Interests:</strong> To provide student safety services and prevent harm at events</li>
                <li><strong>Contractual Necessity:</strong> To deliver the services you signed up for</li>
                <li><strong>Legal Obligations:</strong> When required by law to retain or disclose information</li>
              </ul>
            </section>

            {/* Data Storage & Security */}
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Storage & Security</h2>
              <p className="text-muted-foreground mb-3">
                Your data is stored securely using industry-standard practices:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Infrastructure:</strong> Hosted on Supabase with EU-based servers</li>
                <li><strong>Encryption:</strong> All data encrypted in transit (TLS/SSL) and at rest</li>
                <li><strong>Access Control:</strong> Row-Level Security (RLS) policies ensure users only access authorized data</li>
                <li><strong>Authentication:</strong> Secure password hashing and session management</li>
                <li><strong>Backups:</strong> Regular automated backups for data recovery</li>
              </ul>
            </section>

            {/* Third-Party Services */}
            <section>
              <h2 className="text-xl font-semibold mb-3">6. Third-Party Services</h2>
              <p className="text-muted-foreground mb-3">We use the following trusted third-party services:</p>
              
              <div className="space-y-3">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-semibold text-sm">Supabase (Database, Authentication, Storage)</p>
                  <p className="text-sm text-muted-foreground">EU-based infrastructure, GDPR compliant</p>
                  <p className="text-sm text-muted-foreground">Purpose: Store user accounts, events, reports, and files</p>
                </div>
                
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-semibold text-sm">Resend (Email Service)</p>
                  <p className="text-sm text-muted-foreground">GDPR compliant email delivery</p>
                  <p className="text-sm text-muted-foreground">Purpose: Send email notifications to committee members</p>
                </div>
              </div>

              <p className="text-muted-foreground mt-3 text-sm">
                We have data processing agreements in place with all third-party services to ensure they comply with GDPR requirements.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Active Accounts:</strong> Data retained while your account is active</li>
                <li><strong>Reports & Feedback:</strong> Retained for safety records and accountability (minimum 2 years after event date)</li>
                <li><strong>Deleted Accounts:</strong> Personal data anonymized or deleted within 30 days of account deletion</li>
                <li><strong>Anonymous Reports:</strong> Cannot be traced back to individuals after submission</li>
                <li><strong>Analytics Data:</strong> Aggregated and anonymized for platform improvement (retained indefinitely)</li>
              </ul>
            </section>

            {/* Your Rights (GDPR) */}
            <section>
              <h2 className="text-xl font-semibold mb-3">8. Your Rights Under GDPR (Articles 15-22)</h2>
              <p className="text-muted-foreground mb-3">You have the following rights:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Right to Access (Article 15):</strong> Request a copy of your personal data</li>
                <li><strong>Right to Rectification (Article 16):</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Right to Erasure (Article 17):</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong>Right to Data Portability (Article 20):</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Right to Restrict Processing (Article 18):</strong> Limit how we use your data</li>
                <li><strong>Right to Object (Article 21):</strong> Object to processing based on legitimate interests</li>
                <li><strong>Right to Withdraw Consent (Article 7):</strong> Withdraw consent at any time</li>
                <li><strong>Right to Lodge a Complaint:</strong> File a complaint with your local Data Protection Authority</li>
              </ul>

              <p className="text-muted-foreground mt-3 text-sm italic">
                Note: Some reports may be retained for safety and accountability purposes even after account deletion, but they will be anonymized to remove personal identifiers.
              </p>
            </section>

            {/* Cookies & Tracking */}
            <section>
              <h2 className="text-xl font-semibold mb-3">9. Cookies & Tracking</h2>
              <p className="text-muted-foreground mb-3">
                We use minimal tracking technologies:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Essential Cookies:</strong> Session management via browser localStorage (required for login)</li>
                <li><strong>No Advertising Cookies:</strong> We do not use tracking cookies for advertising purposes</li>
                <li><strong>Analytics:</strong> Page view tracking for safety metrics and platform improvement (IP addresses stored temporarily)</li>
              </ul>
            </section>

            {/* Student Data Protections */}
            <section>
              <h2 className="text-xl font-semibold mb-3">10. Student Data Protections</h2>
              <p className="text-muted-foreground mb-3">
                OurSafeBase is designed specifically for university students with special care for safety and welfare:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Anonymous Reporting:</strong> Students can submit concerns without revealing their identity</li>
                <li><strong>Sensitive Data Handling:</strong> Welfare and safety reports treated with special confidentiality</li>
                <li><strong>No Data Selling:</strong> We will never sell your data to third parties</li>
                <li><strong>Limited Access:</strong> Only authorized committee members can view reports for their society</li>
                <li><strong>Educational Purpose:</strong> Platform designed to support student welfare, not for commercial exploitation</li>
              </ul>
            </section>

            {/* Contact for Data Requests */}
            <section>
              <h2 className="text-xl font-semibold mb-3">11. How to Exercise Your Rights</h2>
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="text-muted-foreground mb-2">
                  To request access, correction, or deletion of your data:
                </p>
                <p className="font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email: oursafebase@gmail.com
                </p>
                <p className="text-sm text-muted-foreground mt-2">Subject: "Data Request - [Your Name]"</p>
                <p className="text-sm text-muted-foreground">Include: Your registered email address</p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Response Time:</strong> We will respond within 30 days as required by GDPR
                </p>
              </div>
            </section>

            {/* Changes to Privacy Policy */}
            <section>
              <h2 className="text-xl font-semibold mb-3">12. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. Material changes will be communicated via email or prominent notice on the platform. Continued use after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Jurisdiction */}
            <section>
              <h2 className="text-xl font-semibold mb-3">13. Governing Law & Jurisdiction</h2>
              <p className="text-muted-foreground mb-2">
                This Privacy Policy is governed by the laws of Ireland and the European Union. Our supervisory authority is:
              </p>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-semibold">Data Protection Commission (Ireland)</p>
                <p className="text-sm text-muted-foreground">21 Fitzwilliam Square South, Dublin 2, D02 RD28, Ireland</p>
                <p className="text-sm text-muted-foreground">Website: www.dataprotection.ie</p>
              </div>
            </section>

            {/* Contact Section */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
              <p className="text-muted-foreground mb-3">
                If you have any questions about this Privacy Policy or our data practices:
              </p>
              <Button onClick={() => navigate("/contact")} variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
            </section>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button onClick={() => navigate("/")} variant="ghost">
            Back to Home
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
