import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft, Mail, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Footer } from "@/components/Footer";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="OurSafeBase" className="h-10 w-auto" />
            <h1 className="text-2xl font-heading font-bold text-primary">OurSafeBase</h1>
          </div>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Home
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl font-heading">Terms of Service</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Last updated: January 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            {/* Agreement */}
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Agreement to Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using OurSafeBase, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use the platform.
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Eligibility:</strong> You must be at least 18 years old or a current university student to use this platform.
              </p>
            </section>

            {/* Platform Purpose */}
            <section>
              <h2 className="text-xl font-semibold mb-3">2. Platform Purpose</h2>
              <p className="text-muted-foreground mb-3">
                OurSafeBase is a student event safety and welfare platform designed to:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Provide access to welfare contacts and emergency information during events</li>
                <li>Enable anonymous and identified reporting of safety concerns</li>
                <li>Help student societies manage event safety and accountability</li>
              </ul>

              <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg mt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-semibold text-destructive mb-1">IMPORTANT DISCLAIMER</p>
                    <p className="text-sm text-muted-foreground">
                      OurSafeBase is <strong>NOT an emergency service</strong> or crisis hotline. If you or someone else is in immediate danger, call <strong>112 or 999</strong> immediately. This platform is a supplement to, not a replacement for, official emergency services and university welfare support.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Account Responsibilities */}
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Account Creation & Responsibilities</h2>
              <p className="text-muted-foreground mb-3">When you create an account, you agree to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your login credentials</li>
                <li>Create only one account per person</li>
                <li>Notify us immediately of any unauthorized account access</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </section>

            {/* Acceptable Use */}
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Acceptable Use Policy</h2>
              <p className="text-muted-foreground mb-3">You agree to use OurSafeBase only for legitimate safety and welfare purposes. You must NOT:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Submit false, misleading, or malicious reports</li>
                <li>Harass, abuse, or threaten other users</li>
                <li>Share inappropriate, offensive, or harmful content</li>
                <li>Attempt to access data you are not authorized to view</li>
                <li>Use the platform for any illegal activities</li>
                <li>Violate the anonymity of report submitters</li>
                <li>Spam or abuse notification systems</li>
              </ul>
            </section>

            {/* Committee Responsibilities */}
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Committee Member Responsibilities</h2>
              <p className="text-muted-foreground mb-3">
                If you are a committee member, you have additional responsibilities:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Duty of Care:</strong> Respond to welfare concerns and reports in a timely, responsible manner</li>
                <li><strong>Confidentiality:</strong> Maintain confidentiality of sensitive information and anonymous reports</li>
                <li><strong>Truthful Information:</strong> Provide accurate event details, emergency contacts, and safety information</li>
                <li><strong>Fair Investigation:</strong> Investigate reports fairly and without bias</li>
                <li><strong>Respect Anonymity:</strong> Never attempt to identify anonymous report submitters</li>
                <li><strong>Professional Conduct:</strong> Treat all reports and feedback with seriousness and professionalism</li>
              </ul>
            </section>

            {/* Reports Accuracy */}
            <section>
              <h2 className="text-xl font-semibold mb-3">6. Report & Feedback Accuracy</h2>
              <p className="text-muted-foreground">
                Users are expected to provide truthful and accurate information when submitting reports or feedback. OurSafeBase is not liable for false or misleading reports submitted by users. Committee members have discretion in how they handle and investigate reports.
              </p>
            </section>

            {/* Emergency Disclaimer */}
            <section>
              <h2 className="text-xl font-semibold mb-3">7. Emergency Services Disclaimer</h2>
              <div className="bg-destructive/10 border-2 border-destructive/30 p-5 rounded-lg">
                <h3 className="text-lg font-bold text-destructive mb-3">⚠️ CRITICAL: This is NOT an Emergency Service</h3>
                <p className="text-muted-foreground mb-3">
                  <strong>If you or someone else is in immediate danger:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Call <strong className="text-foreground">112 or 999</strong> immediately</li>
                  <li>Contact campus security or university welfare services</li>
                  <li>For mental health support: Samaritans 116 123 (24/7)</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  OurSafeBase reports are reviewed by student committee members, not trained emergency responders. Do not rely on this platform for urgent or life-threatening situations.
                </p>
              </div>
            </section>

            {/* Anonymity & Privacy */}
            <section>
              <h2 className="text-xl font-semibold mb-3">8. Anonymity & Privacy</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Anonymous Reports:</strong> When you submit an anonymous report, your identity is not stored or visible to committee members</li>
                <li><strong>Non-Anonymous Reports:</strong> If you provide your contact information, committee members can see it to follow up</li>
                <li><strong>Privacy Protection:</strong> Committee members must respect the confidentiality of reports and not share sensitive information</li>
              </ul>
            </section>

            {/* Liability & Disclaimers */}
            <section>
              <h2 className="text-xl font-semibold mb-3">9. Liability & Disclaimers</h2>
              <p className="text-muted-foreground mb-3">
                OurSafeBase is provided "as is" without warranties of any kind. We make no guarantees about:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Specific outcomes from reports or feedback</li>
                <li>Actions taken (or not taken) by committee members</li>
                <li>Preventing incidents or ensuring event safety</li>
                <li>Availability or uninterrupted service</li>
              </ul>

              <p className="text-muted-foreground mt-4">
                <strong>Limitation of Liability:</strong> OurSafeBase and its operators are not liable for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Incidents, injuries, or harm occurring at society events</li>
                <li>Actions or inactions of committee members or event organizers</li>
                <li>Decisions made by student societies based on reports or feedback</li>
                <li>Loss of data, service interruptions, or platform errors</li>
                <li>Indirect, consequential, or incidental damages</li>
              </ul>

              <p className="text-muted-foreground mt-4 text-sm italic">
                The platform facilitates communication and reporting but does not provide medical, legal, or professional advice. Ultimate responsibility for event safety rests with the organizing society and attendees.
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-xl font-semibold mb-3">10. Intellectual Property</h2>
              <p className="text-muted-foreground mb-3">
                <strong>Platform Ownership:</strong> OurSafeBase owns all rights to the platform code, design, and branding.
              </p>
              <p className="text-muted-foreground mb-3">
                <strong>User Content:</strong> You retain rights to content you submit (reports, feedback, notes) but grant us a license to store, process, and display it as necessary to provide the service.
              </p>
            </section>

            {/* Account Suspension */}
            <section>
              <h2 className="text-xl font-semibold mb-3">11. Account Suspension & Termination</h2>
              <p className="text-muted-foreground mb-3">
                We reserve the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Suspend or terminate accounts for violations of these Terms</li>
                <li>Remove committee members who abuse their role or fail to respond to reports</li>
                <li>Delete false, malicious, or abusive content</li>
                <li>Ban users who repeatedly violate acceptable use policies</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                <strong>User-Initiated Deletion:</strong> You can delete your account at any time through your profile settings. See our Privacy Policy for data retention details.
              </p>
            </section>

            {/* Society Data Ownership */}
            <section>
              <h2 className="text-xl font-semibold mb-3">12. Society Ownership & Data</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Society Data:</strong> Reports, events, and feedback belong to the society (collective committee ownership)</li>
                <li><strong>Leaving a Society:</strong> If you leave a society, you lose access to that society's data</li>
                <li><strong>Committee Access:</strong> All committee members have equal access to society data</li>
              </ul>
            </section>

            {/* Modifications */}
            <section>
              <h2 className="text-xl font-semibold mb-3">13. Modifications to Service</h2>
              <p className="text-muted-foreground">
                We may update, modify, or discontinue features at any time. We will provide notice of material changes via email or platform announcements. Continued use after changes constitutes acceptance of the updated Terms.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-xl font-semibold mb-3">14. Indemnification</h2>
              <p className="text-muted-foreground">
                You agree to indemnify and hold harmless OurSafeBase from any claims, losses, or damages arising from your use of the platform, violation of these Terms, or violation of any third-party rights.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-xl font-semibold mb-3">15. Governing Law & Jurisdiction</h2>
              <p className="text-muted-foreground mb-2">
                These Terms are governed by the laws of Ireland and the European Union. Any disputes will be resolved in the courts of Ireland. EU consumer protections apply where applicable.
              </p>
            </section>

            {/* Dispute Resolution */}
            <section>
              <h2 className="text-xl font-semibold mb-3">16. Dispute Resolution</h2>
              <p className="text-muted-foreground">
                If you have a dispute or complaint, please contact us first at <strong>oursafebase@gmail.com</strong>. We prefer informal resolution before formal legal action. Mediation or alternative dispute resolution may be used before litigation.
              </p>
            </section>

            {/* Severability */}
            <section>
              <h2 className="text-xl font-semibold mb-3">17. Severability</h2>
              <p className="text-muted-foreground">
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
              </p>
            </section>

            {/* Contact */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-3">18. Contact Us</h2>
              <p className="text-muted-foreground mb-3">
                Questions about these Terms? Contact us:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  oursafebase@gmail.com
                </p>
              </div>
              <Button onClick={() => navigate("/contact")} variant="outline" className="mt-4">
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

export default TermsOfService;
