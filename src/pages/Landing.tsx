import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  AlertCircle,
  BarChart3,
  Users,
  Heart,
  UserCheck,
  MessageSquare,
  Calendar,
  MessageCircle,
  TrendingUp,
  Lock,
  Zap,
  GraduationCap,
  Sparkles,
  Smartphone,
  Phone,
  HelpCircle,
  ChevronDown,
  Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Footer } from "@/components/Footer";

const Landing = () => {
  const navigate = useNavigate();

  const scrollToAttendee = () => {
    document.getElementById("attendee-features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle bg-pattern-dots">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between pb-4 md:pb-8 mb-4 md:mb-8 bg-card/80 backdrop-blur-sm shadow-sm border-b border-border/50 rounded-b-2xl sticky top-0 z-50 px-3 md:px-6 py-3 md:py-4 -mx-4">
          <div className="flex items-center gap-2 md:gap-3">
            <img
              src={logo}
              alt="OurSafeBase"
              className="h-8 md:h-12 w-auto object-contain"
              style={{ maxWidth: "48px", maxHeight: "48px" }}
              loading="eager"
              decoding="async"
              width="48"
              height="48"
            />
            <h1 className="text-lg md:text-2xl font-heading font-bold text-primary">OurSafeBase</h1>
          </div>
          <Button
            onClick={() => navigate("/auth")}
            variant="outline"
            className="rounded-xl text-sm md:text-base px-3 md:px-4"
          >
            Sign In
          </Button>
        </header>

        {/* Hero Section */}
        <section className="py-12 md:py-20 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Zap className="h-4 w-4" />
            Free to use for all students
          </div>
          <h2 className="mb-4 text-3xl font-heading font-bold md:text-5xl lg:text-6xl leading-tight">
            Student Events & Trips. <span className="text-primary">Made Safer Together.</span>
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
            Bring welfare contacts, emergency info, codes of conduct and reporting together in one place for safer
            events and trips.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="text-base md:text-lg rounded-xl w-full sm:w-auto"
            >
              Get Started
            </Button>
            <Button
              onClick={scrollToAttendee}
              size="lg"
              variant="outline"
              className="text-base md:text-lg rounded-xl w-full sm:w-auto"
            >
              See How It Works
            </Button>
          </div>
          <p className="text-sm text-muted-foreground/80 flex items-center justify-center gap-2 mt-6">
            <GraduationCap className="h-4 w-4" />
            Backed by Trinity LaunchBox
          </p>
        </section>

        {/* Dual Perspective Section */}
        <section className="py-20 grid gap-8 md:grid-cols-2 max-w-6xl mx-auto">
          <Card className="bg-gradient-card hover:scale-[1.02] transition-all duration-300 hover:shadow-xl border-2 border-success/20">
            <CardHeader className="space-y-4 pb-4">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                <Heart className="h-10 w-10 text-success" />
              </div>
              <CardTitle className="text-3xl font-heading">If You're Attending an Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="text-success">✓</span>
                  <span>Access welfare contacts instantly if you need support</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-success">✓</span>
                  <span>Get answers from event-specific FAQs created by organisers</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-success">✓</span>
                  <span>Report concerns anonymously or with your contact info, safely and privately</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-success">✓</span>
                  <span>Share feedback after events to help make future experiences even better</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-success">✓</span>
                  <span>Access all your event safety pages in one place from your personal dashboard</span>
                </li>
              </ul>
              <Button
                onClick={scrollToAttendee}
                variant="outline"
                className="w-full mt-6 border-success/30 hover:border-success rounded-xl"
              >
                Learn More
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card hover:scale-[1.02] transition-all duration-300 hover:shadow-xl border-2 border-primary/20">
            <CardHeader className="space-y-4 pb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl font-heading">If You're Organising an Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Give your society the tools to stay safe, connected, and cared for at every event.
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="text-primary">✓</span>
                  <span>Set up safety pages in seconds</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary">✓</span>
                  <span>Create event-specific FAQs to answer common questions</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary">✓</span>
                  <span>Collect post-event feedback via form and/or follow-up emails</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary">✓</span>
                  <span>Respond to concerns with care and accountability (instant email notifications)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary">✓</span>
                  <span>Collaborate with your whole committee seamlessly</span>
                </li>
              </ul>
              <Button onClick={() => navigate("/auth")} className="w-full mt-6 rounded-xl">
                Start Your Society
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Phone Mockup Section */}
        <section className="py-20 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-5 gap-12 items-center">
            {/* Phone Mockup */}
            <div className="md:col-span-2 flex justify-center">
              <div className="relative">
                {/* Phone Frame */}
                <div className="relative w-[280px] h-[560px] bg-gradient-to-br from-card to-card/80 rounded-[3rem] border-8 border-foreground/10 shadow-2xl overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-foreground/10 rounded-b-2xl z-10"></div>

                  {/* Screen Content */}
                  <div className="absolute inset-x-3 top-4 bottom-3 bg-background rounded-[1.75rem] overflow-hidden">
                    <div className="p-2.5 space-y-1.5">
                      {/* Event Header */}
                      <div className="pb-2 border-b">
                        <h3 className="font-bold text-sm">Ski Club</h3>
                        <p className="text-xs text-muted-foreground">January 15, 2025 • Ski Trip 2025</p>
                      </div>

                      {/* Welfare Contact Card */}
                      <div className="bg-muted/50 rounded-lg p-2.5 border">
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Important Contacts
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex gap-2 items-center">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">SM</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">Hannah Miller</p>
                              <p className="text-xs text-muted-foreground truncate">Safety Officer</p>
                              <p className="text-xs text-muted-foreground">+353 87 234 5678</p>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">JO</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">James O'Brien</p>
                              <p className="text-xs text-muted-foreground truncate">Sober Driver</p>
                              <p className="text-xs text-muted-foreground">+353 86 912 3456</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Emergency Info Card */}
                      <div className="bg-muted/50 rounded-lg p-2.5 border">
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-destructive" />
                          Emergency Info
                        </p>
                        <p className="text-xs text-muted-foreground">St. Mary's Hospital</p>
                        <p className="text-xs text-muted-foreground">Emergency: 999</p>
                      </div>

                      {/* FAQ Section */}
                      <div className="bg-muted/50 rounded-lg p-2.5 border">
                        <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" />
                          Frequently Asked Questions
                        </p>
                        <div className="bg-background rounded-lg p-2.5 border border-border/40 shadow-sm mt-1">
                          <p className="text-xs font-medium flex items-center justify-between">
                            What time do we meet?
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-1.5 pt-0.5">
                        <div className="bg-primary/10 text-primary rounded-lg py-1.5 px-3 text-xs font-medium text-center flex items-center justify-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Report Concern
                        </div>
                        <div className="bg-success/10 text-success rounded-lg py-1.5 px-3 text-xs font-medium text-center flex items-center justify-center gap-1">
                          <Heart className="h-3 w-3" />
                          Submit Feedback
                        </div>
                        <div className="bg-blue-500/10 text-blue-600 rounded-lg py-1.5 px-3 text-xs font-medium text-center flex items-center justify-center gap-1">
                          <Shield className="h-3 w-3" />
                          Code of Conduct
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Block */}
            <div className="md:col-span-3 space-y-6">
              <h3 className="text-3xl md:text-4xl font-heading font-bold">Every Event Gets Its Own Safety Page</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Attendees scan a QR code or click a link to instantly access welfare contacts, emergency info, FAQs, and
                reporting options.
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <span className="text-primary font-bold">✓</span>
                  <span className="text-muted-foreground">Instant access via link or QR code</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-primary font-bold">✓</span>
                  <span className="text-muted-foreground">Event-specific FAQs for quick answers</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-primary font-bold">✓</span>
                  <span className="text-muted-foreground">Post-event feedback collection</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-primary font-bold">✓</span>
                  <span className="text-muted-foreground">Anonymous reporting available</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="attendee-features" className="py-20 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-heading font-bold mb-4">Everything You Need for Safer Events</h3>
            <p className="text-lg text-muted-foreground">Whether you're attending or organising</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Attendee Features */}
            <Card className="bg-gradient-card hover:scale-[1.02] transition-all duration-300 border-success/20">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="h-12 w-12 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-success" />
                </div>
                <h4 className="text-lg font-heading font-semibold">Always Within Reach</h4>
                <p className="text-sm text-muted-foreground">
                  Welfare contacts and emergency numbers at your fingertips
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card hover:scale-[1.02] transition-all duration-300 border-success/20">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="h-12 w-12 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-success" />
                </div>
                <h4 className="text-lg font-heading font-semibold">Your Way, Your Voice</h4>
                <p className="text-sm text-muted-foreground">Anonymous or identified, you choose how to communicate</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card hover:scale-[1.02] transition-all duration-300 border-success/20">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="h-12 w-12 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                  <HelpCircle className="h-6 w-6 text-success" />
                </div>
                <h4 className="text-lg font-heading font-semibold">Get Quick Answers</h4>
                <p className="text-sm text-muted-foreground">
                  Access event-specific FAQs and give feedback after events
                </p>
              </CardContent>
            </Card>

            {/* Committee Features */}
            <Card className="bg-gradient-card hover:scale-[1.02] transition-all duration-300 border-primary/20">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-lg font-heading font-semibold">Ready in Minutes</h4>
                <p className="text-sm text-muted-foreground">Build comprehensive safety pages for every event</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card hover:scale-[1.02] transition-all duration-300 border-primary/20">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-lg font-heading font-semibold">Track & Follow Up</h4>
                <p className="text-sm text-muted-foreground">
                  Review concerns with care and accountability. See who's accepted your code of conduct.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card hover:scale-[1.02] transition-all duration-300 border-primary/20">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-lg font-heading font-semibold">Insights That Improve</h4>
                <p className="text-sm text-muted-foreground">
                  Collect post-event feedback and analyze trends to make better decisions
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works - Unified Journey */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h3 className="text-5xl font-heading font-bold mb-4">How It Works</h3>
            <p className="text-xl text-muted-foreground">A collaborative journey to safer events</p>
          </div>

          <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-16 right-16 h-1 bg-gradient-to-r from-primary via-accent to-success"></div>

            <div className="relative space-y-4 text-center">
              <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg relative z-10">
                <Shield className="h-12 w-12 text-primary-foreground" />
              </div>
              <h4 className="text-xl font-heading font-semibold">Committees Create Safety Infrastructure</h4>
              <p className="text-muted-foreground">
                Organisers set up their society, create events, and build comprehensive safety pages with contacts,
                emergency info, FAQs, and feedback collection.
              </p>
            </div>

            <div className="relative space-y-4 text-center">
              <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-lg relative z-10">
                <Smartphone className="h-12 w-12 text-accent-foreground" />
              </div>
              <h4 className="text-xl font-heading font-semibold">Attendees Access Support Instantly</h4>
              <p className="text-muted-foreground">
                Scan a QR code or click a link to view contacts, emergency info, and FAQs. Logged in users can accept
                the code of conduct, report concerns, and give feedback after events.
              </p>
            </div>

            <div className="relative space-y-4 text-center">
              <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-lg relative z-10">
                <MessageCircle className="h-12 w-12 text-success-foreground" />
              </div>
              <h4 className="text-xl font-heading font-semibold">Everyone Communicates Openly</h4>
              <p className="text-muted-foreground">
                Attendees get answers from FAQs, share concerns, and provide post-event feedback. Committees respond
                with care and use insights to improve. Real dialogue creates real progress.
              </p>
            </div>

            <div className="relative space-y-4 text-center">
              <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-primary to-success flex items-center justify-center shadow-lg relative z-10">
                <Sparkles className="h-12 w-12 text-primary-foreground" />
              </div>
              <h4 className="text-xl font-heading font-semibold">Communities Grow Safer Together</h4>
              <p className="text-muted-foreground">
                Every report reviewed, every piece of feedback considered. Over time, events become spaces where
                everyone truly feels they belong.
              </p>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-4xl font-heading font-bold text-center mb-12">
              Built for Student Communities, By People Who Care
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              <Card className="bg-gradient-card hover:scale-[1.02] transition-all">
                <CardContent className="pt-6 flex gap-4">
                  <Lock className="h-8 w-8 text-primary flex-shrink-0" />
                  <div>
                    <h4 className="font-heading font-semibold text-lg mb-2">Your privacy is protected</h4>
                    <p className="text-muted-foreground">Anonymous reporting truly means anonymous</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card hover:scale-[1.02] transition-all">
                <CardContent className="pt-6 flex gap-4">
                  <GraduationCap className="h-8 w-8 text-primary flex-shrink-0" />
                  <div>
                    <h4 className="font-heading font-semibold text-lg mb-2">Designed for student societies</h4>
                    <p className="text-muted-foreground">Built specifically for your unique needs</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card hover:scale-[1.02] transition-all sm:col-span-2 lg:col-span-1">
                <CardContent className="pt-6 flex gap-4">
                  <Zap className="h-8 w-8 text-success flex-shrink-0" />
                  <div>
                    <h4 className="font-heading font-semibold text-lg mb-2">Free to use</h4>
                    <p className="text-muted-foreground">Because every student deserves a safe base</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="py-12 max-w-4xl mx-auto">
          <Card className="bg-muted/50 border-muted-foreground/20">
            <CardContent className="pt-6 text-center space-y-3">
              <div className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed text-left">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                <p>
                  <strong className="text-foreground">Important:</strong> OurSafeBase is a support tool for student
                  societies and is not a substitute for professional medical, legal, or emergency services. If you're in
                  immediate danger, please contact emergency services (999/112) or professional support services. All
                  data is handled in accordance with GDPR and our privacy policy.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Final CTA */}
        <section className="py-20 text-center max-w-4xl mx-auto space-y-8">
          <h3 className="text-4xl md:text-5xl font-heading font-bold">Let's Build Safer Spaces Together</h3>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Whether you're heading to an event or organising one, OurSafeBase helps create communities where everyone
            feels supported, respected, and heard.
          </p>
          <div className="pt-4">
            <Button onClick={() => navigate("/auth")} size="lg" className="text-lg rounded-xl w-full sm:w-auto">
              Create Your First Safe Event
            </Button>
          </div>
        </section>
      </div>

      {/* Achievement Banner */}
      <div className="container mx-auto px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-full inline-flex">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            🥈 2nd Place - ZEEUS Social Impact Hackathon 2025
          </span>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Landing;
