import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Heart, Users, Target, GraduationCap, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Footer } from "@/components/Footer";

const About = () => {
  const navigate = useNavigate();

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
              onClick={() => navigate("/auth")}
              variant="outline"
              className="rounded-xl"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Hero Section */}
        <section className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-heading font-bold">
            About <span className="text-primary">OurSafeBase</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            A platform built by students, for students, to make events safer and communities stronger.
          </p>
        </section>

        {/* Our Mission */}
        <section className="mb-16">
          <Card className="bg-gradient-card border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl md:text-3xl font-heading">Our Mission</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                OurSafeBase was created to address a critical need in student life: accessible, trustworthy safety 
                infrastructure for events. We believe that every student deserves to feel safe, supported, and heard 
                at the events they attend or organize.
              </p>
              <p>
                Our platform bridges the gap between event organizers and attendees, creating transparent communication 
                channels and ensuring that welfare contacts, emergency information, and reporting mechanisms are always 
                just a click away.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* What We Do */}
        <section className="mb-16">
          <h2 className="text-3xl font-heading font-bold text-center mb-8">What We Do</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-gradient-card hover:scale-[1.02] transition-all">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-success" />
                  </div>
                  <CardTitle className="text-xl font-heading">For Attendees</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
                <p>
                  We provide instant access to welfare contacts, emergency information, and safe reporting channels 
                  for every event you attend.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-success">✓</span>
                    <span>Anonymous or identified reporting options</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-success">✓</span>
                    <span>Direct access to welfare contacts</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-success">✓</span>
                    <span>Easy feedback submission</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-success">✓</span>
                    <span>Personal dashboard to track your events</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card hover:scale-[1.02] transition-all">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-heading">For Organizers</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
                <p>
                  We help you create comprehensive safety pages, manage reports responsibly, and build trust with 
                  your community.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span>Quick safety page setup</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span>Instant email notifications for reports</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span>Analytics and feedback insights</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span>Committee collaboration tools</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Our Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-heading font-bold text-center mb-8">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-card text-center">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg">Privacy First</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is protected. Anonymous reporting means truly anonymous. GDPR compliant.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card text-center">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-success" />
                </div>
                <h3 className="font-heading font-semibold text-lg">Student-Centered</h3>
                <p className="text-sm text-muted-foreground">
                  Built specifically for student communities, understanding your unique needs and challenges.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card text-center">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-heading font-semibold text-lg">Community Driven</h3>
                <p className="text-sm text-muted-foreground">
                  We listen to feedback and continuously improve based on real student experiences.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Backed By */}
        <section className="mb-16">
          <Card className="bg-gradient-card text-center border-amber-500/20">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <GraduationCap className="h-10 w-10 text-primary" />
                <h3 className="text-2xl font-heading font-bold">Backed by Trinity LaunchBox</h3>
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                OurSafeBase is supported by Trinity College Dublin's LaunchBox accelerator program, 
                helping us grow and better serve student communities.
              </p>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-full px-4 py-2">
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  🥈 2nd Place - ZEEUS Social Impact Hackathon 2025
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Get In Touch */}
        <section className="text-center space-y-6">
          <h2 className="text-3xl font-heading font-bold">Get In Touch</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Have questions or feedback? We'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => navigate("/contact")}
              size="lg"
              className="rounded-xl w-full sm:w-auto"
            >
              <Mail className="mr-2 h-5 w-5" />
              Contact Us
            </Button>
            <Button
              onClick={() => navigate("/faq")}
              size="lg"
              variant="outline"
              className="rounded-xl w-full sm:w-auto"
            >
              View FAQ
            </Button>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default About;
