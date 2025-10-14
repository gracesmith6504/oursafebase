import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import logo from "@/assets/logo.png";

interface Society {
  id: string;
  name: string;
  slug: string;
}

interface Member {
  user_id: string;
  profile: {
    id: string;
    display_name: string | null;
  };
}

interface WelfareContact {
  userId: string;
  displayName: string;
  role: string;
}

interface ExternalContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

interface EmergencyField {
  id: string;
  label: string;
  value: string;
}

const CreateEvent = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [society, setSociety] = useState<Society | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<WelfareContact[]>([]);
  const [externalContacts, setExternalContacts] = useState<ExternalContact[]>([]);
  const [emergencyFields, setEmergencyFields] = useState<EmergencyField[]>([
    { id: "hospital", label: "Nearest Hospital", value: "" },
    { id: "hospital_address", label: "Hospital Address", value: "" },
    { id: "hospital_phone", label: "Hospital Phone", value: "" },
    { id: "pharmacy", label: "Nearest Pharmacy", value: "" },
    { id: "pharmacy_address", label: "Pharmacy Address", value: "" },
    { id: "pharmacy_phone", label: "Pharmacy Phone", value: "" },
    { id: "on_duty", label: "On Duty Contact", value: "" },
    { id: "on_duty_phone", label: "On Duty Phone", value: "" },
  ]);
  const [codeOfConduct, setCodeOfConduct] = useState("");
  const [pendingMemberRole, setPendingMemberRole] = useState("");
  const [pendingMember, setPendingMember] = useState<Member | null>(null);

  useEffect(() => {
    if (user && slug) {
      fetchData();
    }
  }, [user, slug]);

  const fetchData = async () => {
    try {
      // Fetch society
      const { data: societyData, error: societyError } = await supabase
        .from("societies")
        .select("*")
        .eq("slug", slug)
        .single();

      if (societyError || !societyData) {
        toast.error("Society not found");
        navigate("/dashboard");
        return;
      }

      setSociety(societyData);

      // Check membership
      const { data: membershipData } = await supabase
        .from("society_members")
        .select("*")
        .eq("society_id", societyData.id)
        .eq("user_id", user!.id)
        .single();

      if (!membershipData) {
        toast.error("You are not a member of this society");
        navigate("/dashboard");
        return;
      }

      // Fetch all members
      const { data: membersData, error: membersError } = await supabase
        .from("society_members")
        .select(`
          user_id,
          profile:profiles(id, display_name)
        `)
        .eq("society_id", societyData.id);

      if (!membersError && membersData) {
        setMembers(membersData as any);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
      navigate("/dashboard");
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const addMemberContact = (member: Member) => {
    const exists = selectedContacts.some(c => c.userId === member.user_id);
    if (exists) {
      toast.error("Contact already added");
      return;
    }

    setSelectedContacts([
      ...selectedContacts,
      {
        userId: member.user_id,
        displayName: member.profile?.display_name || "Anonymous",
        role: "",
      },
    ]);
  };

  const updateMemberContactRole = (userId: string, role: string) => {
    setSelectedContacts(
      selectedContacts.map(contact =>
        contact.userId === userId ? { ...contact, role } : contact
      )
    );
  };

  const removeMemberContact = (userId: string) => {
    setSelectedContacts(selectedContacts.filter(c => c.userId !== userId));
  };

  const addExternalContact = () => {
    setExternalContacts([
      ...externalContacts,
      {
        id: crypto.randomUUID(),
        name: "",
        role: "",
        phone: "",
        email: "",
      },
    ]);
  };

  const updateExternalContact = (id: string, field: keyof ExternalContact, value: string) => {
    setExternalContacts(
      externalContacts.map(contact =>
        contact.id === id ? { ...contact, [field]: value } : contact
      )
    );
  };

  const removeExternalContact = (id: string) => {
    setExternalContacts(externalContacts.filter(c => c.id !== id));
  };

  const addEmergencyField = () => {
    setEmergencyFields([
      ...emergencyFields,
      { id: crypto.randomUUID(), label: "", value: "" },
    ]);
  };

  const updateEmergencyField = (id: string, field: "label" | "value", newValue: string) => {
    setEmergencyFields(
      emergencyFields.map(f =>
        f.id === id ? { ...f, [field]: newValue } : f
      )
    );
  };

  const removeEmergencyField = (id: string) => {
    setEmergencyFields(emergencyFields.filter(f => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventName.trim()) {
      toast.error("Event name is required");
      return;
    }

    if (!eventDate) {
      toast.error("Event date is required");
      return;
    }

    if (!society) return;

    setSubmitting(true);

    try {
      // Combine date and time
      let eventDateTime = new Date(eventDate);
      if (eventTime) {
        const [hours, minutes] = eventTime.split(":");
        eventDateTime.setHours(parseInt(hours), parseInt(minutes));
      }

      // Create event
      const eventSlug = generateSlug(eventName);
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert({
          title: eventName.trim(),
          slug: eventSlug,
          event_date: eventDateTime.toISOString(),
          location: location.trim() || null,
          society_id: society.id,
          created_by: user!.id,
          status: "upcoming",
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create welfare contacts
      const welfareContactsToInsert = selectedContacts.map((contact, index) => ({
        event_id: eventData.id,
        user_id: contact.userId,
        contact_info: contact.role,
        display_order: index,
      }));

      if (welfareContactsToInsert.length > 0) {
        const { error: contactsError } = await supabase
          .from("welfare_contacts")
          .insert(welfareContactsToInsert);

        if (contactsError) throw contactsError;
      }

      // Create emergency info
      const emergencyData: any = { event_id: eventData.id };
      emergencyFields.forEach(field => {
        if (field.value.trim()) {
          const fieldKey = field.id.includes("_") ? field.id : field.label.toLowerCase().replace(/\s+/g, "_");
          emergencyData[fieldKey] = field.value.trim();
        }
      });

      if (Object.keys(emergencyData).length > 1) {
        const { error: emergencyError } = await supabase
          .from("emergency_info")
          .insert(emergencyData);

        if (emergencyError) throw emergencyError;
      }

      // Create code of conduct if provided
      if (codeOfConduct.trim()) {
        const { error: cocError } = await supabase
          .from("code_of_conduct")
          .insert({
            society_id: society.id,
            content: codeOfConduct.trim(),
            is_active: true,
          });

        if (cocError) throw cocError;
      }

      toast.success("Event created. Safety Page ready.");
      navigate(`/event/${eventData.id}`);
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted pb-24">
        <header className="border-b bg-background">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/society/${slug}/events`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img src={logo} alt="OurSafeBase" className="h-8" />
              <div>
                <h1 className="text-xl font-bold">Create Event</h1>
                <p className="text-sm text-muted-foreground">{society?.name}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto max-w-2xl px-4 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
                <CardDescription>Basic information about your event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eventName">
                    Event Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="eventName"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g., Spring Formal 2025"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      Date <span className="text-destructive">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !eventDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={eventDate}
                          onSelect={setEventDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventTime">Time (optional)</Label>
                    <Input
                      id="eventTime"
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (optional)</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., College Hall"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Important Contacts */}
            <Card>
              <CardHeader>
                <CardTitle>Important Contacts</CardTitle>
                <CardDescription>
                  Welfare officers and emergency contacts for attendees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Society Members */}
                <div className="space-y-4">
                  <Label>Society Team Members</Label>
                  
                  {selectedContacts.length > 0 && (
                    <div className="space-y-3">
                      {selectedContacts.map((contact) => (
                        <div
                          key={contact.userId}
                          className="space-y-2 rounded-lg border bg-muted p-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{contact.displayName}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMemberContact(contact.userId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            placeholder="Role (e.g., Welfare Officer)"
                            value={contact.role}
                            onChange={(e) => updateMemberContactRole(contact.userId, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="memberSelect">Add Team Member</Label>
                    <select
                      id="memberSelect"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      onChange={(e) => {
                        const member = members.find(m => m.user_id === e.target.value);
                        if (member) {
                          addMemberContact(member);
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">Select a member...</option>
                      {members
                        .filter(m => !selectedContacts.some(c => c.userId === m.user_id))
                        .map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.profile?.display_name || "Anonymous"}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* External Contacts */}
                <div className="space-y-4">
                  {externalContacts.length > 0 && (
                    <div className="space-y-4">
                      {externalContacts.map((contact) => (
                        <div key={contact.id} className="space-y-3 rounded-lg border p-4">
                          <div className="flex items-center justify-between">
                            <Label>External Contact</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeExternalContact(contact.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              placeholder="Name"
                              value={contact.name}
                              onChange={(e) =>
                                updateExternalContact(contact.id, "name", e.target.value)
                              }
                            />
                            <Input
                              placeholder="Role"
                              value={contact.role}
                              onChange={(e) =>
                                updateExternalContact(contact.id, "role", e.target.value)
                              }
                            />
                            <Input
                              placeholder="Phone"
                              value={contact.phone}
                              onChange={(e) =>
                                updateExternalContact(contact.id, "phone", e.target.value)
                              }
                            />
                            <Input
                              placeholder="Email"
                              type="email"
                              value={contact.email}
                              onChange={(e) =>
                                updateExternalContact(contact.id, "email", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addExternalContact}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add External Contact
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Information */}
            <Card>
              <CardHeader>
                <CardTitle>Emergency Information</CardTitle>
                <CardDescription>Add and customize emergency contact fields</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {emergencyFields.map((field) => (
                  <div key={field.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        placeholder="Field label (e.g., Nearest Hospital)"
                        value={field.label}
                        onChange={(e) => updateEmergencyField(field.id, "label", e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmergencyField(field.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Value (e.g., City Hospital, 123-456-7890)"
                      value={field.value}
                      onChange={(e) => updateEmergencyField(field.id, "value", e.target.value)}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addEmergencyField}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Emergency Field
                </Button>
              </CardContent>
            </Card>

            {/* Code of Conduct */}
            <Card>
              <CardHeader>
                <CardTitle>Code of Conduct</CardTitle>
                <CardDescription>Event guidelines and expectations</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter your code of conduct or event guidelines..."
                  value={codeOfConduct}
                  onChange={(e) => setCodeOfConduct(e.target.value)}
                  rows={6}
                />
              </CardContent>
            </Card>
          </form>
        </main>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
          <div className="container mx-auto flex max-w-2xl gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/society/${slug}/events`)}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              className="flex-1"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Save & Create Safety Page"}
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default CreateEvent;