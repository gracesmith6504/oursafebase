import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle, BarChart3, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-between pb-12">
          <div className="flex items-center gap-3">
            <img src={logo} alt="OurSafeBase" className="h-12" />
            <h1 className="text-2xl font-bold text-primary">OurSafeBase</h1>
          </div>
          <Button onClick={() => navigate("/auth")} variant="outline">
            Sign In
          </Button>
        </header>

        <section className="py-20 text-center">
          <h2 className="mb-6 text-4xl font-bold md:text-6xl">
            Create Safer Events for Your{" "}
            <span className="text-primary">Student Society</span>
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            A digital wellbeing platform that helps societies provide safety information,
            gather feedback, and respond to concerns at every event.
          </p>
          <Button onClick={() => navigate("/auth")} size="lg" className="text-lg">
            Get Started Free
          </Button>
        </section>

        <section className="grid gap-6 py-16 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <Shield className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Safety Pages</CardTitle>
              <CardDescription>
                Create dedicated safety pages for each event with welfare contacts,
                emergency info, and your code of conduct.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <AlertCircle className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Anonymous Reporting</CardTitle>
              <CardDescription>
                Attendees can report concerns anonymously or with their contact details.
                No account required.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Event Analytics</CardTitle>
              <CardDescription>
                Track safety page views, code of conduct acceptances, and gather
                post-event feedback automatically.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>
                Invite committee members with a single link. Everyone has equal access to
                manage events and respond to concerns.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="py-16 text-center">
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle className="text-3xl">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-left">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Create Your Society</h4>
                  <p className="text-muted-foreground">
                    Sign up and set up your society in seconds. Invite your team members with a permanent invite link.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Add Event Details</h4>
                  <p className="text-muted-foreground">
                    Create events, assign welfare officers, add emergency contacts, and set your code of conduct.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Share Safety Page</h4>
                  <p className="text-muted-foreground">
                    Each event gets a unique public safety page URL. Share it with attendees - no login needed.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Track & Respond</h4>
                  <p className="text-muted-foreground">
                    Monitor reports, gather feedback, and view analytics all from your dashboard.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="py-16 text-center">
          <h3 className="mb-6 text-3xl font-bold">Ready to Create Safer Events?</h3>
          <Button onClick={() => navigate("/auth")} size="lg" className="text-lg">
            Start Your Free Society
          </Button>
        </section>
      </div>
    </div>
  );
};

export default Landing;
