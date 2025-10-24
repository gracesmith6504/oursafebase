import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle, BarChart3, Users, Heart, UserCheck, MessageSquare, Calendar, MessageCircle, TrendingUp, Lock, Zap, GraduationCap, Sparkles, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const Landing = () => {
  const navigate = useNavigate();

  const scrollToAttendee = () => {
    document.getElementById('attendee-features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle bg-pattern-dots">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between pb-8 mb-8 bg-card/80 backdrop-blur-sm shadow-sm border-b border-border/50 rounded-b-2xl sticky top-0 z-50 px-6 py-4 -mx-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="OurSafeBase" className="h-12" />
            <h1 className="text-2xl font-heading font-bold text-primary">OurSafeBase</h1>
          </div>
          <Button onClick={() => navigate("/auth")} variant="outline" className="rounded-xl">
            Sign In
          </Button>
        </header>

        {/* Hero Section */}
        <section className="py-20 text-center max-w-5xl mx-auto space-y-8">
          <h2 className="mb-6 text-5xl font-heading font-bold md:text-7xl leading-tight">
            Feel Safe. Connect Confidently.{" "}
            <span className="text-primary">Create Better Events Together.</span>
          </h2>
          <p className="mx-auto mb-10 max-w-3xl text-xl text-muted-foreground leading-relaxed">
            OurSafeBase brings attendees and committees together to make every student event a space where everyone feels supported, heard, and valued.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button onClick={scrollToAttendee} size="lg" variant="secondary" className="text-lg rounded-xl">
              Explore as an Attendee
            </Button>
            <Button onClick={() => navigate("/auth")} size="lg" className="text-lg rounded-xl">
              Start as a Committee
            </Button>
          </div>
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
                  <span>Report concerns privately and safely - your way</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-success">✓</span>
                  <span>Share feedback to help make future events even better</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-success">✓</span>
                  <span>No account needed - just care and community</span>
                </li>
              </ul>
              <Button onClick={scrollToAttendee} variant="outline" className="w-full mt-6 border-success/30 hover:border-success rounded-xl">
                See How It Helps You
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card hover:scale-[1.02] transition-all duration-300 hover:shadow-xl border-2 border-primary/20">
            <CardHeader className="space-y-4 pb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl font-heading">If You're Organizing an Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="text-primary">✓</span>
                  <span>Set up safety pages in minutes for every event</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary">✓</span>
                  <span>Respond to concerns with care and accountability</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary">✓</span>
                  <span>Track feedback to continuously improve</span>
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

        {/* Features Showcase - For Attendees */}
        <section id="attendee-features" className="py-20 space-y-24 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                <Shield className="h-10 w-10 text-success" />
              </div>
              <h3 className="text-4xl font-heading font-bold">Safety Information, Always Within Reach</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Every event has a dedicated safety page. Find welfare contacts, emergency numbers, and the code of conduct - all in one place, no login required.
              </p>
            </div>
            <div className="bg-accent/20 rounded-3xl p-8 h-64 flex items-center justify-center border border-accent/30">
              <Shield className="h-32 w-32 text-accent opacity-40" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-accent/20 rounded-3xl p-8 h-64 flex items-center justify-center border border-accent/30 order-2 md:order-1">
              <MessageSquare className="h-32 w-32 text-accent opacity-40" />
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-success" />
              </div>
              <h3 className="text-4xl font-heading font-bold">Speak Up Safely, On Your Terms</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Something not right? Report concerns anonymously or share your contact info for follow-up. You choose how to communicate - we make sure you're heard.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                <Heart className="h-10 w-10 text-success" />
              </div>
              <h3 className="text-4xl font-heading font-bold">Your Voice Shapes Future Events</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Share what made you feel safe and what could be better. Your honest feedback helps committees create even more welcoming events.
              </p>
            </div>
            <div className="bg-accent/20 rounded-3xl p-8 h-64 flex items-center justify-center border border-accent/30">
              <Heart className="h-32 w-32 text-accent opacity-40" />
            </div>
          </div>
        </section>

        {/* Features Showcase - For Committees */}
        <section className="py-20 space-y-24 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-accent/20 rounded-3xl p-8 h-64 flex items-center justify-center border border-accent/30 order-2 md:order-1">
              <Calendar className="h-32 w-32 text-accent opacity-40" />
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-4xl font-heading font-bold">Organize with Care and Confidence</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Build safety pages in minutes. Assign welfare officers, add emergency contacts, and share your code of conduct. Everything your attendees need to feel secure.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-4xl font-heading font-bold">Respond with Empathy and Action</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Review every concern with your team. Track status, add notes, and follow up thoughtfully. Show your community that their wellbeing matters.
              </p>
            </div>
            <div className="bg-accent/20 rounded-3xl p-8 h-64 flex items-center justify-center border border-accent/30">
              <MessageCircle className="h-32 w-32 text-accent opacity-40" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-accent/20 rounded-3xl p-8 h-64 flex items-center justify-center border border-accent/30 order-2 md:order-1">
              <TrendingUp className="h-32 w-32 text-accent opacity-40" />
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-4xl font-heading font-bold">Learn and Improve Together</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                See what's working. Track safety page views, feedback trends, and code of conduct acceptance. Use insights to make each event better than the last.
              </p>
            </div>
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
                Organizers set up their society, create events, and build comprehensive safety pages with all the information attendees need.
              </p>
            </div>

            <div className="relative space-y-4 text-center">
              <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-lg relative z-10">
                <Smartphone className="h-12 w-12 text-accent-foreground" />
              </div>
              <h4 className="text-xl font-heading font-semibold">Attendees Access Support Instantly</h4>
              <p className="text-muted-foreground">
                Every event gets a unique link. Attendees can view contacts, find emergency info, and accept the code of conduct - no account needed.
              </p>
            </div>

            <div className="relative space-y-4 text-center">
              <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-lg relative z-10">
                <MessageCircle className="h-12 w-12 text-success-foreground" />
              </div>
              <h4 className="text-xl font-heading font-semibold">Everyone Communicates Openly</h4>
              <p className="text-muted-foreground">
                Attendees share concerns or feedback. Committees receive, review, and respond. Real dialogue creates real improvement.
              </p>
            </div>

            <div className="relative space-y-4 text-center">
              <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-primary to-success flex items-center justify-center shadow-lg relative z-10">
                <Sparkles className="h-12 w-12 text-primary-foreground" />
              </div>
              <h4 className="text-xl font-heading font-semibold">Communities Grow Safer Together</h4>
              <p className="text-muted-foreground">
                Every report reviewed, every piece of feedback considered. Over time, events become spaces where everyone truly feels they belong.
              </p>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-4xl font-heading font-bold text-center mb-12">Built for Student Communities, By People Who Care</h3>
            <div className="grid md:grid-cols-2 gap-8">
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
                  <Heart className="h-8 w-8 text-success flex-shrink-0" />
                  <div>
                    <h4 className="font-heading font-semibold text-lg mb-2">No ads, no data selling</h4>
                    <p className="text-muted-foreground">Just tools for safer events</p>
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

              <Card className="bg-gradient-card hover:scale-[1.02] transition-all">
                <CardContent className="pt-6 flex gap-4">
                  <Zap className="h-8 w-8 text-success flex-shrink-0" />
                  <div>
                    <h4 className="font-heading font-semibold text-lg mb-2">Free to use</h4>
                    <p className="text-muted-foreground">Because every student deserves to feel safe</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 text-center max-w-4xl mx-auto space-y-8">
          <h3 className="text-5xl font-heading font-bold">Let's Build Safer Spaces Together</h3>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Whether you're heading to an event or organizing one, OurSafeBase helps create communities where everyone feels supported, respected, and heard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button onClick={scrollToAttendee} size="lg" variant="secondary" className="text-lg rounded-xl">
              Join as an Attendee
            </Button>
            <Button onClick={() => navigate("/auth")} size="lg" className="text-lg rounded-xl">
              Start Your Society
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Landing;
