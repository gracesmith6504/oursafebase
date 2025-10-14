import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, AlertCircle, Shield, MessageSquare, FileText } from "lucide-react";
import { format } from "date-fns";
import logo from "@/assets/logo.png";

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  society_id: string;
}

interface WelfareContact {
  id: string;
  contact_info: string;
  profile: {
    display_name: string | null;
    phone_number: string | null;
    avatar_url: string | null;
  };
}

interface EmergencyInfo {
  nearest_hospital: string | null;
  hospital_address: string | null;
  hospital_phone: string | null;
  nearest_pharmacy: string | null;
  pharmacy_address: string | null;
  pharmacy_phone: string | null;
  on_duty_contact: string | null;
  on_duty_phone: string | null;
  custom_emergency_info: any;
}

interface CodeOfConduct {
  content: string;
}

const EventSafetyPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [welfareContacts, setWelfareContacts] = useState<WelfareContact[]>([]);
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo | null>(null);
  const [codeOfConduct, setCodeOfConduct] = useState<CodeOfConduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      fetchEventData();
      trackPageView();
    }
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch welfare contacts
      const { data: contactsData } = await supabase
        .from("welfare_contacts")
        .select(`
          id,
          contact_info,
          profile:profiles(display_name, phone_number, avatar_url)
        `)
        .eq("event_id", eventId)
        .order("display_order");

      if (contactsData) {
        setWelfareContacts(contactsData as any);
      }

      // Fetch emergency info
      const { data: emergencyData } = await supabase
        .from("emergency_info")
        .select("*")
        .eq("event_id", eventId)
        .single();

      if (emergencyData) {
        setEmergencyInfo(emergencyData);
      }

      // Fetch code of conduct
      const { data: cocData } = await supabase
        .from("code_of_conduct")
        .select("content")
        .eq("society_id", eventData.society_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (cocData) {
        setCodeOfConduct(cocData);
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
    } finally {
      setLoading(false);
    }
  };

  const trackPageView = async () => {
    try {
      await supabase.from("safety_page_views").insert({
        event_id: eventId,
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error("Error tracking page view:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This safety page does not exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customEmergencyFields = emergencyInfo?.custom_emergency_info || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img src={logo} alt="OurSafeBase" className="h-10" />
            <div>
              <h1 className="text-2xl font-bold">{event.title}</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(event.event_date), "PPP")}
                {event.location && ` • ${event.location}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Important Contacts */}
        {welfareContacts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Important Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {welfareContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex gap-3 rounded-lg border bg-muted/50 p-4"
                  >
                    {contact.profile?.avatar_url && (
                      <img 
                        src={contact.profile.avatar_url} 
                        alt={contact.profile.display_name || "Contact"} 
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{contact.profile?.display_name || "Anonymous"}</p>
                      {contact.contact_info && (
                        <p className="text-sm text-muted-foreground">{contact.contact_info}</p>
                      )}
                      {contact.profile?.phone_number && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {contact.profile.phone_number}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Emergency Information */}
        {emergencyInfo && customEmergencyFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Emergency Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {customEmergencyFields.map((field: any, index: number) => (
                <div key={index} className="space-y-2">
                  <h3 className="font-semibold text-lg">{field.label}</h3>
                  <div className="space-y-1">
                    {field.name && <p className="font-medium">{field.name}</p>}
                    {field.address && (
                      <p className="text-sm text-muted-foreground flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {field.address}
                      </p>
                    )}
                    {field.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {field.phone}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Code of Conduct */}
        {codeOfConduct && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Code of Conduct
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{codeOfConduct.content}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Button size="lg" className="w-full" variant="destructive">
            <FileText className="mr-2 h-5 w-5" />
            Report a Concern
          </Button>
          <Button size="lg" className="w-full" variant="outline">
            <MessageSquare className="mr-2 h-5 w-5" />
            Submit Feedback
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t bg-muted/50 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <span className="font-semibold">OurSafeBase</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default EventSafetyPage;
