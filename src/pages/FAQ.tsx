import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Shield, Lock, AlertTriangle, Users } from "lucide-react";
import { Footer } from "@/components/Footer";
import logo from "@/assets/logo.png";

const FAQ = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
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

      <main className="flex-1 container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Frequently Asked Questions</h1>
          <p className="text-muted-foreground">
            Everything you need to know about OurSafeBase
          </p>
        </div>

        <div className="space-y-6">
          {/* Platform Usage */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Platform Usage</h2>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="what-is">
                  <AccordionTrigger>What is OurSafeBase?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    OurSafeBase is a student event safety platform designed for university societies. 
                    It provides tools for creating Safety Pages for events, managing welfare contacts, 
                    collecting anonymous reports, and ensuring student safety during society activities.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="create-society">
                  <AccordionTrigger>How do I create a society?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    After signing up, click "Create Society" from your dashboard. You'll be prompted 
                    to enter your society's name and details. Once created, you'll receive invite codes 
                    for committee members and attendees. As the creator, you'll automatically be a 
                    committee member with full access.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="join-society">
                  <AccordionTrigger>How do I join a society?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    To join a society, you need an invite code from a committee member. Click "Join Society" 
                    on your dashboard and enter the code. There are two types of codes: committee codes 
                    (for organizers) and attendee codes (for members). Make sure to use the correct code 
                    for your role.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="create-event">
                  <AccordionTrigger>How do I create an event and Safety Page?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Committee members can create events by clicking "Create Event" in their society dashboard. 
                    Fill in event details including title, date, location, and description. You can then add 
                    welfare contacts, emergency information, and a code of conduct. The Safety Page is automatically 
                    generated and can be shared via QR code or URL with attendees.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="share-safety-page">
                  <AccordionTrigger>How do I share the Safety Page with attendees?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Each event has a unique Safety Page URL and QR code. Committee members can download the 
                    QR code from the event dashboard and display it at the event venue. Attendees can scan 
                    the code or visit the URL to access welfare contacts, emergency information, and submit 
                    reports or feedback.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="roles">
                  <AccordionTrigger>What's the difference between committee and attendee roles?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <strong>Committee members</strong> can create and manage events, view all reports and feedback, 
                    manage welfare contacts, and access analytics. <strong>Attendees</strong> can view Safety Pages, 
                    submit reports and feedback, and access emergency information. Committee members have full 
                    administrative access to their society, while attendees have read-only access.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Privacy & Data */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Privacy & Data</h2>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="data-collected">
                  <AccordionTrigger>What data does OurSafeBase collect?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We collect: account information (email, name, phone), profile data (display name, avatar), 
                    society membership details, event participation records, reports and feedback (anonymous or 
                    identified), page view analytics, and Code of Conduct acceptance records. All data is 
                    stored securely with encryption. See our{" "}
                    <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> for details.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="gdpr">
                  <AccordionTrigger>What are my GDPR rights?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Under GDPR, you have the right to: access your data, correct inaccurate data, delete your 
                    account ("right to be forgotten"), export your data (data portability), restrict processing, 
                    object to processing, and withdraw consent. You can export your data or delete your account 
                    from your Profile settings. For data requests, email{" "}
                    <a href="mailto:oursafebase@gmail.com" className="text-primary hover:underline">
                      oursafebase@gmail.com
                    </a>.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="data-storage">
                  <AccordionTrigger>Where is my data stored?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    All data is stored with Supabase, a secure EU-based infrastructure provider. Data is 
                    encrypted both in transit (using HTTPS) and at rest. We use Row-Level Security (RLS) 
                    policies to ensure users can only access data they're authorized to see. No data is 
                    sold to third parties.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="delete-account">
                  <AccordionTrigger>What happens when I delete my account?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Your profile information, society memberships, event notes, and login credentials are 
                    permanently deleted. Anonymous reports cannot be traced back to you. Non-anonymous reports 
                    have contact information removed but content is retained for legal compliance and student 
                    safety records. Events you created remain active with your name removed. See our{" "}
                    <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> for retention 
                    details.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="third-party">
                  <AccordionTrigger>Do you share data with third parties?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We only share data with essential service providers: Supabase (database, authentication, 
                    storage) and Resend (email notifications). Both have data processing agreements in place. 
                    We never sell your data to advertisers or marketing companies. Committee members can see 
                    reports submitted within their society for welfare purposes.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cookies">
                  <AccordionTrigger>Does OurSafeBase use cookies?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We only use essential cookies for session management (stored in localStorage). We do not 
                    use advertising cookies, tracking cookies, or analytics cookies. The only data collected 
                    for analytics purposes is page view counts for safety metrics (to see how many people 
                    accessed an event's Safety Page).
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Anonymity & Reporting */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Anonymity & Reporting</h2>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="anonymous-reports">
                  <AccordionTrigger>How do anonymous reports work?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    When submitting a report, you can choose to remain anonymous by not providing contact 
                    information. Anonymous reports are stored without any identifying information—committee 
                    members cannot see who submitted them. We do not track IP addresses or user agents for 
                    anonymous reports. However, this means we cannot follow up with you about the report.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="truly-anonymous">
                  <AccordionTrigger>Are anonymous reports truly anonymous?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes. When you submit an anonymous report, no identifying information is stored in the database. 
                    Even committee members with full access cannot trace the report back to you. The report contains 
                    only the concern type, description, and timestamp. We do not log IP addresses or device 
                    information for anonymous reports.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="non-anonymous">
                  <AccordionTrigger>What if I want to provide my contact information?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    You can choose to provide your name, email, and/or phone number when submitting a report. 
                    This allows committee members to follow up with you and provide support. Your contact 
                    information is only visible to committee members of that society. You control how much 
                    information you share—you can provide just an email, or full contact details.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="who-sees">
                  <AccordionTrigger>Who can see my reports?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Only committee members of the society that hosted the event can view reports. Regular 
                    attendees cannot see any reports. Committee members see the concern type, description, 
                    severity, status, and contact information (if you provided it). Row-Level Security policies 
                    in our database ensure reports are strictly isolated between societies.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="report-types">
                  <AccordionTrigger>What types of concerns can I report?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    You can report: harassment or bullying, safety hazards, medical concerns, alcohol/substance 
                    abuse, discrimination, sexual misconduct, mental health concerns, or other welfare issues. 
                    Each report can be marked with a severity level (low, medium, high, critical) and tracked 
                    with a status (new, in progress, resolved).
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="feedback">
                  <AccordionTrigger>What's the difference between reports and feedback?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <strong>Reports</strong> are for safety concerns, welfare issues, or incidents that require 
                    attention. <strong>Feedback</strong> is for general event feedback, suggestions, or comments 
                    about how safe attendees felt. Both can be submitted anonymously. Reports are prioritized 
                    and tracked with severity levels, while feedback is used to improve future events.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Emergency & Safety */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h2 className="text-xl font-semibold">Emergency & Safety</h2>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="emergency-disclaimer">
                  <AccordionTrigger className="text-destructive">
                    Is OurSafeBase an emergency service?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <strong className="text-destructive">NO.</strong> OurSafeBase is NOT an emergency service 
                    or crisis hotline. <strong>If you or someone else is in immediate danger, call 112 or 999 
                    immediately.</strong> For urgent mental health support, contact Samaritans at 116 123 (24/7) 
                    or your university's emergency welfare services. OurSafeBase is for reporting non-emergency 
                    concerns and accessing welfare contacts.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="when-call-999">
                  <AccordionTrigger>When should I call 999/112?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Call 999 or 112 immediately if: someone is seriously injured, someone is unconscious, 
                    there's a fire or major safety hazard, someone is being assaulted or threatened, someone 
                    is having a medical emergency (severe allergic reaction, chest pain, difficulty breathing), 
                    or someone is in immediate danger. Do not wait—call emergency services first, then inform 
                    event organizers.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="welfare-contacts">
                  <AccordionTrigger>What are welfare contacts?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Welfare contacts are committee members or designated individuals available during events 
                    to provide support and handle non-emergency concerns. They're displayed on the Safety Page 
                    with their name, role, phone number, and photo (optional). If you feel unsafe or need 
                    assistance during an event, contact them directly. For emergencies, always call 999/112 first.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="coc">
                  <AccordionTrigger>What is a Code of Conduct?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    A Code of Conduct (CoC) sets behavioral expectations for event attendees. It outlines 
                    acceptable behavior, consequences for violations, and reporting procedures. Committee members 
                    can upload a custom CoC for their society or individual events. Attendees may be required 
                    to accept the CoC before accessing event information, creating a record of acknowledgment.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="emergency-info">
                  <AccordionTrigger>What emergency information is available?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Each Safety Page includes: nearest hospital and pharmacy details with addresses and phone 
                    numbers, on-duty emergency contact information, custom emergency procedures specific to the 
                    event, and links to crisis helplines. This information is accessible to all event attendees 
                    without requiring login.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="incident-response">
                  <AccordionTrigger>How are incidents handled?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    When a report is submitted, committee members receive email notifications (if enabled). 
                    They can review the report, update its status (new → in progress → resolved), add internal 
                    notes, bookmark important reports, and track resolution progress. Committee members are 
                    responsible for investigating and responding appropriately. OurSafeBase provides the tools, 
                    but does not intervene in incident management.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="not-resolved">
                  <AccordionTrigger>What if my report isn't resolved?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    If you provided contact information and haven't received a response within a reasonable 
                    timeframe, or if you're not satisfied with the resolution, contact your university's 
                    student union, welfare officer, or student services. For serious incidents (assault, 
                    discrimination, harassment), you can also report to university administration or local 
                    authorities. OurSafeBase is a tool for societies, not a replacement for official channels.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Technical & Account */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Technical & Account</h2>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="email-verification">
                  <AccordionTrigger>Do I need to verify my email?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes. After signing up, check your email for a verification link. You must confirm your 
                    email address before signing in. If you don't receive the email, check your spam folder 
                    or request a new verification email from the login page.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="forgot-password">
                  <AccordionTrigger>I forgot my password. What do I do?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Click "Forgot Password" on the login page and enter your email address. You'll receive 
                    a password reset link via email. Follow the link to create a new password. If you don't 
                    receive the email, check your spam folder or contact{" "}
                    <a href="mailto:oursafebase@gmail.com" className="text-primary hover:underline">
                      oursafebase@gmail.com
                    </a>.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="mobile">
                  <AccordionTrigger>Does OurSafeBase work on mobile?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! OurSafeBase is fully responsive and works on all devices—phones, tablets, and desktops. 
                    Safety Pages are optimized for mobile viewing since attendees typically access them at events 
                    using their smartphones. There's no app to download; simply visit the website in your browser.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="notifications">
                  <AccordionTrigger>How do email notifications work?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Committee members receive email notifications when new reports are submitted to their society. 
                    You can enable or disable notifications in your Profile settings under "Notification Preferences." 
                    Notifications are sent via Resend (our email provider) and include the report's concern type 
                    and severity, but not sensitive details.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="browser-support">
                  <AccordionTrigger>Which browsers are supported?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    OurSafeBase works on all modern browsers including Chrome, Firefox, Safari, and Edge. 
                    We recommend keeping your browser up to date for the best experience and security. 
                    Internet Explorer is not supported.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="issues">
                  <AccordionTrigger>I'm experiencing technical issues. Who do I contact?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    For technical support, account issues, or general inquiries, email{" "}
                    <a href="mailto:oursafebase@gmail.com" className="text-primary hover:underline">
                      oursafebase@gmail.com
                    </a>. Include details about the issue (error messages, screenshots, browser/device info) 
                    and we'll respond within 2-3 business days. See our{" "}
                    <a href="/contact" className="text-primary hover:underline">Contact page</a> for more information.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Still have questions? */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-2">Still have questions?</h3>
              <p className="text-muted-foreground mb-4">
                If you couldn't find the answer you were looking for, we're here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => navigate("/contact")} variant="default">
                  Contact Support
                </Button>
                <Button onClick={() => navigate("/privacy")} variant="outline">
                  Privacy Policy
                </Button>
                <Button onClick={() => navigate("/terms")} variant="outline">
                  Terms of Service
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
