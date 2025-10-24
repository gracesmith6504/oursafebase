import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { useCommitteeRole } from "@/lib/useCommitteeRole";
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
  role: 'committee' | 'attendee';
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
  phone: string;
  role: string;
}

interface EmergencyField {
  id: string;
  label: string;
  name: string;
  address: string;
  phone: string;
}

const CreateEvent = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [society, setSociety] = useState<Society | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { isCommittee, loading: roleLoading } = useCommitteeRole(society?.id);

  // Form state
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<WelfareContact[]>([]);
  const [externalContacts, setExternalContacts] = useState<ExternalContact[]>([]);
  const [emergencyFields, setEmergencyFields] = useState<EmergencyField[]>([]);
  const [selectedCoCId, setSelectedCoCId] = useState("");
  const [availableCoCs, setAvailableCoCs] = useState<Array<{ id: string; version: number; content: string | null; file_url: string | null; name: string | null; is_active: boolean }>>([]);

  // Team member selection state
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [tempRole, setTempRole] = useState("");
  
  // External contact state
  const [externalName, setExternalName] = useState("");
  const [externalPhone, setExternalPhone] = useState("");
  const [externalRole, setExternalRole] = useState("");
  const [externalCountryCode, setExternalCountryCode] = useState("+353");
  
  const countryCodes = [
    { code: "+353", country: "Ireland", flag: "🇮🇪" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
  ];

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
          role,
          profile:profiles(id, display_name)
        `)
        .eq("society_id", societyData.id);

      if (!membersError && membersData) {
        setMembers(membersData as any);
      }

      // Fetch available society-level CoCs
      const { data: cocsData } = await supabase
        .from("code_of_conduct")
        .select("id, version, content, file_url, name, is_active")
        .eq("society_id", societyData.id)
        .is("event_id", null)
        .order("version", { ascending: false });

      if (cocsData) {
        setAvailableCoCs(cocsData);
        // Auto-select the active CoC, or the most recent if none is active
        const activeCoC = cocsData.find(c => c.is_active);
        if (activeCoC) {
          setSelectedCoCId(activeCoC.id);
        } else if (cocsData.length > 0) {
          setSelectedCoCId(cocsData[0].id);
        }
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

  const handleMemberSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const member = members.find(m => m.user_id === e.target.value);
    if (member) {
      setSelectedMember(member);
      setTempRole("");
    }
    e.target.value = "";
  };

  const handleAddMember = () => {
    if (!selectedMember) return;

    const exists = selectedContacts.some(c => c.userId === selectedMember.user_id);
    if (exists) {
      toast.error("Contact already added");
      setSelectedMember(null);
      setTempRole("");
      return;
    }

    setSelectedContacts([
      ...selectedContacts,
      {
        userId: selectedMember.user_id,
        displayName: selectedMember.profile?.display_name || "Anonymous",
        role: tempRole.trim(),
      },
    ]);
    setSelectedMember(null);
    setTempRole("");
  };

  const removeMemberContact = (userId: string) => {
    setSelectedContacts(selectedContacts.filter(c => c.userId !== userId));
  };

  const handleAddExternalContact = () => {
    if (!externalName.trim() || !externalPhone.trim()) {
      toast.error("Please provide name and phone number");
      return;
    }

    setExternalContacts([
      ...externalContacts,
      {
        id: crypto.randomUUID(),
        name: externalName.trim(),
        phone: `${externalCountryCode}${externalPhone}`,
        role: externalRole.trim(),
      },
    ]);
    
    setExternalName("");
    setExternalPhone("");
    setExternalRole("");
  };

  const removeExternalContact = (id: string) => {
    setExternalContacts(externalContacts.filter(c => c.id !== id));
  };

  const addEmergencyField = () => {
    setEmergencyFields([
      ...emergencyFields,
      {
        id: crypto.randomUUID(),
        label: "",
        name: "",
        address: "",
        phone: "",
      },
    ]);
  };

  const updateEmergencyField = (id: string, field: keyof EmergencyField, value: string) => {
    setEmergencyFields(
      emergencyFields.map(ef =>
        ef.id === id ? { ...ef, [field]: value } : ef
      )
    );
  };

  const removeEmergencyField = (id: string) => {
    setEmergencyFields(emergencyFields.filter(ef => ef.id !== id));
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

      // Fetch member profiles for snapshot fields
      let memberProfiles: any = {};
      if (selectedContacts.length > 0) {
        const memberIds = selectedContacts.map(c => c.userId);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, phone_number, avatar_url")
          .in("id", memberIds);
        
        if (profilesData) {
          memberProfiles = Object.fromEntries(
            profilesData.map(p => [p.id, p])
          );
        }
      }

      // Create event contacts with snapshot fields including avatar
      const contactsToInsert = [
        ...selectedContacts.map((contact, index) => {
          const profile = memberProfiles[contact.userId];
          return {
            event_id: eventData.id,
            user_id: contact.userId,
            contact_name: profile?.display_name || contact.displayName,
            contact_phone: profile?.phone_number,
            contact_avatar_url: profile?.avatar_url,
            external_name: null,
            external_phone: null,
            role: contact.role,
            display_order: index,
          };
        }),
        ...externalContacts.map((contact, index) => ({
          event_id: eventData.id,
          user_id: null,
          contact_name: contact.name,
          contact_phone: contact.phone,
          contact_avatar_url: null,
          external_name: contact.name,
          external_phone: contact.phone,
          role: contact.role,
          display_order: selectedContacts.length + index,
        }))
      ];

      if (contactsToInsert.length > 0) {
        const { error: contactsError } = await supabase
          .from("event_contacts")
          .insert(contactsToInsert);

        if (contactsError) throw contactsError;
      }

      // Create emergency info - store all fields as custom_emergency_info
      if (emergencyFields.length > 0) {
        const { error: emergencyError } = await supabase
          .from("emergency_info")
          .insert({
            event_id: eventData.id,
            custom_emergency_info: emergencyFields as any,
          });

        if (emergencyError) throw emergencyError;
      }

      // Create a copy of the selected CoC for this event
      if (selectedCoCId) {
        const selectedCoC = availableCoCs.find(c => c.id === selectedCoCId);
        if (selectedCoC) {
          const { error: cocError } = await supabase
            .from("code_of_conduct")
            .insert({
              event_id: eventData.id,
              content: selectedCoC.content,
              file_url: selectedCoC.file_url,
              name: selectedCoC.name,
              version: selectedCoC.version,
              is_active: true,
            } as any);

          if (cocError) {
            console.error("Error creating event CoC:", cocError);
            throw new Error(cocError.message || "Failed to create event Code of Conduct");
          }
        }
      }

      toast.success("Event created. Safety Page ready.");
      navigate(`/event/${eventData.id}`);
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast.error(error?.message || "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isCommittee) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Committee Access Required</CardTitle>
              <CardDescription>
                You need committee access to create events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/my-events')}>
                Back to My Events
              </Button>
            </CardContent>
          </Card>
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
                    <div className="space-y-2">
                      {selectedContacts.map((contact) => (
                        <div
                          key={contact.userId}
                          className="flex items-center gap-2 rounded-lg border bg-muted p-3"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{contact.displayName}</p>
                            <p className="text-sm text-muted-foreground">{contact.role}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMemberContact(contact.userId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="memberSelect">Add Team Member</Label>
                    <select
                      id="memberSelect"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      onChange={handleMemberSelect}
                    >
                      <option value="">Select a member...</option>
                      {members
                        .filter(m => m.role === 'committee' && !selectedContacts.some(c => c.userId === m.user_id))
                        .map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.profile?.display_name || "Anonymous"}
                          </option>
                        ))}
                    </select>

                    {selectedMember && (
                      <div className="rounded-lg border bg-muted p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{selectedMember.profile?.display_name || "Anonymous"}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMember(null);
                              setTempRole("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tempRole" className="text-sm">
                            Role (optional)
                          </Label>
                          <Input
                            id="tempRole"
                            value={tempRole}
                            onChange={(e) => setTempRole(e.target.value)}
                            placeholder="e.g., Welfare Officer"
                            className="h-9"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddMember}
                          className="w-full"
                        >
                          Add Contact
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* External Contacts */}
                <div className="space-y-4 pt-6 border-t">
                  <Label>External Contacts</Label>
                  <p className="text-sm text-muted-foreground">Add contacts who are not society members (e.g., venue staff, security)</p>
                  
                  {externalContacts.length > 0 && (
                    <div className="space-y-2">
                      {externalContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center gap-2 rounded-lg border bg-muted p-3"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">{contact.phone}</p>
                            {contact.role && <p className="text-sm text-muted-foreground">{contact.role}</p>}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeExternalContact(contact.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 rounded-lg border bg-muted p-3">
                    <div className="space-y-2">
                      <Label htmlFor="externalName">Name *</Label>
                      <Input
                        id="externalName"
                        value={externalName}
                        onChange={(e) => setExternalName(e.target.value)}
                        placeholder="Contact name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="externalPhone">Phone Number *</Label>
                      <div className="flex gap-2">
                        <select
                          value={externalCountryCode}
                          onChange={(e) => setExternalCountryCode(e.target.value)}
                          className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          {countryCodes.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>
                        <Input
                          id="externalPhone"
                          type="tel"
                          value={externalPhone}
                          onChange={(e) => setExternalPhone(e.target.value)}
                          placeholder="87 123 4567"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="externalRole">Role (optional)</Label>
                      <Input
                        id="externalRole"
                        value={externalRole}
                        onChange={(e) => setExternalRole(e.target.value)}
                        placeholder="e.g., Security, Venue Staff"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddExternalContact}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add External Contact
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Emergency Information */}
            <Card>
              <CardHeader>
                <CardTitle>Emergency Information</CardTitle>
                <CardDescription>Customizable emergency contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {emergencyFields.map((field) => (
                  <div key={field.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <Input
                        placeholder="Label (e.g., Nearest Hospital)"
                        value={field.label}
                        onChange={(e) => updateEmergencyField(field.id, "label", e.target.value)}
                        className="font-medium"
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
                      placeholder="Name"
                      value={field.name}
                      onChange={(e) => updateEmergencyField(field.id, "name", e.target.value)}
                    />
                    <Input
                      placeholder="Address (optional)"
                      value={field.address}
                      onChange={(e) => updateEmergencyField(field.id, "address", e.target.value)}
                    />
                    <Input
                      placeholder="Phone (optional)"
                      value={field.phone}
                      onChange={(e) => updateEmergencyField(field.id, "phone", e.target.value)}
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
                  Add Emergency Info
                </Button>
              </CardContent>
            </Card>

            {/* Code of Conduct */}
            <Card>
              <CardHeader>
                <CardTitle>Code of Conduct</CardTitle>
                <CardDescription>Select a code of conduct for this event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableCoCs.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="mb-2 text-sm text-muted-foreground">
                      No codes of conduct available. Create one first.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/society/${slug}/codes-of-conduct`)}
                    >
                      Manage Codes of Conduct
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="coc-select">Select Code of Conduct</Label>
                      <select
                        id="coc-select"
                        className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={selectedCoCId}
                        onChange={(e) => setSelectedCoCId(e.target.value)}
                      >
                        <option value="">None (optional)</option>
                        {availableCoCs.map((coc) => (
                          <option key={coc.id} value={coc.id}>
                            Version {coc.version}{coc.is_active ? ' (Active)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedCoCId && (
                      <div className="rounded-lg bg-muted p-4">
                        <p className="mb-2 text-sm font-medium">Preview:</p>
                        <div className="max-h-40 overflow-y-auto text-sm text-muted-foreground">
                          {(() => {
                            const selectedCoC = availableCoCs.find(c => c.id === selectedCoCId);
                            if (selectedCoC?.content) {
                              return `${selectedCoC.content.substring(0, 300)}...`;
                            } else if (selectedCoC?.file_url) {
                              return `File-based Code of Conduct${selectedCoC.name ? `: ${selectedCoC.name}` : ''}`;
                            }
                            return 'No content available';
                          })()}
                        </div>
                      </div>
                    )}
                  </>
                )}
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