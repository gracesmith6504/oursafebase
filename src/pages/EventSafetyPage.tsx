import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, MapPin, Calendar, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import logo from "@/assets/logo.png";

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  society: {
    name: string;
  };
}

interface WelfareContact {
  user_id: string;
  contact_info: string;
  profile: {
    display_name: string | null;
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
}

interface CodeOfConduct {
  content: string;
}

const EventSafetyPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [welfareContacts, setWelfareContacts] = useState<WelfareContact[]>([]);
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo | null>(null);
  const [codeOfConduct, setCodeOfConduct] = useState<CodeOfConduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(`
          id,
          title,
          event_date,
          location,
          society:societies(name)
        `)
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData as any);

      // Fetch welfare contacts
      const { data: contactsData } = await supabase
        .from("welfare_contacts")
        .select(`
          user_id,
          contact_info,
          profile:profiles(display_name)
        `)
        .eq("event_id", eventId)
        .order("display_order");

      setWelfareContacts((contactsData as any) || []);

      // Fetch emergency info
      const { data: emergencyData } = await supabase
        .from("emergency_info")
        .select("*")
        .eq("event_id", eventId)
        .single();

      setEmergencyInfo(emergencyData);

      // Fetch code of conduct
      if (eventData) {
        const { data: cocData } = await supabase
          .from("code_of_conduct")
          .select("content")
          .eq("society_id", (eventData as any).society_id)
          .eq("is_active", true)
          .single();

        setCodeOfConduct(cocData);
      }

      // Record page view
      await supabase.from("safety_page_views").insert({
        event_id: eventId,
      });
    } catch (error) {
      console.error("Error fetching event data:", error);
      toast.error("Failed to load event information");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${event?.title} - Safety Information`,
          url: url,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
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
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted pb-8">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <img src={logo} alt="OurSafeBase" className="h-8" />
            <Button onClick={handleShare} variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8">
        {/* Event Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">{event.title}</h1>
          <p className="text-lg text-muted-foreground">{event.society.name}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(event.event_date), "PPP")}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Welfare Contacts */}
        {welfareContacts.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Welfare Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {welfareContacts.map((contact) => (
                <div
                  key={contact.user_id}
                  className="rounded-lg border bg-muted/50 p-4"
                >
                  <p className="font-medium">{contact.profile?.display_name || "Anonymous"}</p>
                  <p className="text-sm text-muted-foreground">{contact.contact_info}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Emergency Information */}
        {emergencyInfo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Emergency Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {emergencyInfo.on_duty_contact && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="mb-1 text-sm font-medium text-muted-foreground">On Duty Contact</p>
                  <p className="font-medium">{emergencyInfo.on_duty_contact}</p>
                  {emergencyInfo.on_duty_phone && (
                    <a
                      href={`tel:${emergencyInfo.on_duty_phone}`}
                      className="mt-2 flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {emergencyInfo.on_duty_phone}
                    </a>
                  )}
                </div>
              )}

              {emergencyInfo.nearest_hospital && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="mb-1 text-sm font-medium text-muted-foreground">Nearest Hospital</p>
                  <p className="font-medium">{emergencyInfo.nearest_hospital}</p>
                  {emergencyInfo.hospital_address && (
                    <p className="mt-1 text-sm text-muted-foreground">{emergencyInfo.hospital_address}</p>
                  )}
                  {emergencyInfo.hospital_phone && (
                    <a
                      href={`tel:${emergencyInfo.hospital_phone}`}
                      className="mt-2 flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {emergencyInfo.hospital_phone}
                    </a>
                  )}
                </div>
              )}

              {emergencyInfo.nearest_pharmacy && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="mb-1 text-sm font-medium text-muted-foreground">Nearest Pharmacy</p>
                  <p className="font-medium">{emergencyInfo.nearest_pharmacy}</p>
                  {emergencyInfo.pharmacy_address && (
                    <p className="mt-1 text-sm text-muted-foreground">{emergencyInfo.pharmacy_address}</p>
                  )}
                  {emergencyInfo.pharmacy_phone && (
                    <a
                      href={`tel:${emergencyInfo.pharmacy_phone}`}
                      className="mt-2 flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {emergencyInfo.pharmacy_phone}
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Code of Conduct */}
        {codeOfConduct && (
          <Card>
            <CardHeader>
              <CardTitle>Code of Conduct</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{codeOfConduct.content}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default EventSafetyPage;
