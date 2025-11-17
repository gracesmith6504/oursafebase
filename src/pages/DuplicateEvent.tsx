import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute, useAuth } from "@/lib/auth";
import { useCommitteeRole } from "@/lib/useCommitteeRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, X, ChevronRight, GripVertical, Shield } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import logo from "@/assets/logo.png";
import { CreateCoCDialog } from "@/components/CreateCoCDialog";
import CoCAcceptanceDialog from "@/components/CoCAcceptanceDialog";
import { generateUniqueSlug } from "@/lib/eventHelpers";
import { EventSafetyPreviewDialog } from "@/components/EventSafetyPreviewDialog";
import { Eye, HelpCircle } from "lucide-react";
import { CreateFAQDialog } from "@/components/CreateFAQDialog";
import { EditFAQDialog } from "@/components/EditFAQDialog";
import { FAQSection, FAQ } from "@/components/FAQSection";

interface Society {
  id: string;
  name: string;
  slug: string;
}

interface Member {
  user_id: string;
  role: "committee" | "attendee";
  profile: {
    id: string;
    display_name: string | null;
  };
}

interface WelfareContact {
  userId: string;
  displayName: string;
  role: string;
  phone?: string;
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

// Sortable contact item component
const SortableContactItem = ({ contact, onUpdateRole, onUpdatePhone, onRemove, profilePhone }: { 
  contact: WelfareContact; 
  onUpdateRole: (userId: string, role: string) => void;
  onUpdatePhone: (userId: string, phone: string) => void;
  onRemove: (userId: string) => void;
  profilePhone?: string;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contact.userId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-1.5 sm:gap-2 rounded-lg border bg-muted p-2 sm:p-3"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing mt-0.5 touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
      </button>
      <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
        <p className="font-medium text-sm sm:text-base">{contact.displayName}</p>
        <div className="space-y-1.5 sm:space-y-2">
          <div className="space-y-1">
            <Label htmlFor={`role-${contact.userId}`} className="text-xs text-muted-foreground">
              Role (optional)
            </Label>
            <Input
              id={`role-${contact.userId}`}
              value={contact.role}
              onChange={(e) => onUpdateRole(contact.userId, e.target.value)}
              placeholder="e.g., Welfare Officer"
              className="h-8 sm:h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`phone-${contact.userId}`} className="text-xs text-muted-foreground">
              Phone {profilePhone && <span className="text-xs text-muted-foreground">(Profile: {profilePhone})</span>}
            </Label>
            <Input
              id={`phone-${contact.userId}`}
              value={contact.phone || ""}
              onChange={(e) => onUpdatePhone(contact.userId, e.target.value)}
              placeholder={profilePhone || "Enter phone number"}
              className="h-8 sm:h-9"
            />
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(contact.userId)}
        className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const DuplicateEvent = () => {
  const { slug, eventId } = useParams<{ slug: string; eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [society, setSociety] = useState<Society | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { isCommittee, loading: roleLoading } = useCommitteeRole(society?.id);

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [eventEndDate, setEventEndDate] = useState<Date | undefined>(undefined);
  const [eventTime, setEventTime] = useState("");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [location, setLocation] = useState("");
  
  // Create CoC dialog state
  const [createCoCDialogOpen, setCreateCoCDialogOpen] = useState(false);
  
  // CoC preview after event creation
  const [showCoCPreview, setShowCoCPreview] = useState(false);
  const [createdEventData, setCreatedEventData] = useState<any>(null);
  const [cocPreviewData, setCoCPreviewData] = useState<any>(null);
  
  // Preview dialog state
  const [showSafetyPreview, setShowSafetyPreview] = useState(false);
  
  const [selectedContacts, setSelectedContacts] = useState<WelfareContact[]>([]);
  const [memberPhones, setMemberPhones] = useState<Record<string, string>>({});
  const [externalContacts, setExternalContacts] = useState<ExternalContact[]>([]);
  const [emergencyFields, setEmergencyFields] = useState<EmergencyField[]>([]);
  const [selectedCoCId, setSelectedCoCId] = useState("");
  const [availableCoCs, setAvailableCoCs] = useState<
    Array<{
      id: string;
      version: number;
      content: string | null;
      file_url: string | null;
      name: string | null;
      is_active: boolean;
    }>
  >([]);

  // Team member selection state
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [tempRole, setTempRole] = useState("");

  // External contact state
  const [externalName, setExternalName] = useState("");
  const [externalPhone, setExternalPhone] = useState("");
  const [externalRole, setExternalRole] = useState("");
  const [externalCountryCode, setExternalCountryCode] = useState("+353");
  
  // FAQ state
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [createFAQDialogOpen, setCreateFAQDialogOpen] = useState(false);
  const [editFAQDialogOpen, setEditFAQDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);

  const countryCodes = [
    { code: "+353", country: "Ireland", flag: "🇮🇪" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user && slug && eventId) {
      fetchData();
    }
  }, [user, slug, eventId]);

  const fetchData = async () => {
    try {
      // Fetch society
      const { data: societyData, error: societyError } = await supabase
        .from("societies")
        .select("*")
        .eq("slug", slug)
        .single();

      if (societyError || !societyData) {
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
        navigate("/dashboard");
        return;
      }

      // Fetch all members with profiles including phone numbers
      const { data: membersData, error: membersError } = await supabase
        .from("society_members")
        .select(
          `
          user_id,
          role,
          profile:profiles!inner (
            id,
            display_name,
            phone_number
          )
        `
        )
        .eq("society_id", societyData.id)
        .eq("role", "committee");

      if (membersError) throw membersError;

      const transformedMembers = (membersData || []).map((member: any) => ({
        user_id: member.user_id,
        role: member.role,
        profile: {
          id: member.profile.id,
          display_name: member.profile.display_name,
          phone_number: member.profile.phone_number,
        },
      }));

      setMembers(transformedMembers);

      // Create phone lookup
      const phones: Record<string, string> = {};
      transformedMembers.forEach((member: any) => {
        if (member.profile.phone_number) {
          phones[member.user_id] = member.profile.phone_number;
        }
      });
      setMemberPhones(phones);

      // Fetch original event data
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;

      // Pre-fill basic event details
      setEventName(eventData.title + " (Copy)");
      setLocation(eventData.location || "");

      // Fetch event contacts
      const { data: contactsData } = await supabase
        .from("event_contacts")
        .select("*")
        .eq("event_id", eventId)
        .order("display_order");

      if (contactsData) {
        const internalContacts: WelfareContact[] = [];
        const externals: ExternalContact[] = [];

        contactsData.forEach((contact) => {
          if (contact.user_id) {
            internalContacts.push({
              userId: contact.user_id,
              displayName: contact.contact_name || "",
              role: contact.role || "",
              phone: contact.contact_phone || "",
            });
          } else if (contact.external_name) {
            externals.push({
              id: crypto.randomUUID(),
              name: contact.external_name,
              phone: contact.external_phone || "",
              role: contact.role || "",
            });
          }
        });

        setSelectedContacts(internalContacts);
        setExternalContacts(externals);
      }

      // Fetch emergency info
      const { data: emergencyData } = await supabase
        .from("emergency_info")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

      if (emergencyData && emergencyData.custom_emergency_info) {
        const fields = emergencyData.custom_emergency_info as any[];
        setEmergencyFields(
          fields.map((field) => ({
            id: crypto.randomUUID(),
            label: field.label || "",
            name: field.name || "",
            address: field.address || "",
            phone: field.phone || "",
          }))
        );
      }

      // Fetch FAQs from source event
      const { data: faqsData } = await supabase
        .from("event_faqs")
        .select("*")
        .eq("event_id", eventId)
        .order("display_order");

      if (faqsData) {
        setFaqs(faqsData.map((faq: any) => ({
          id: crypto.randomUUID(), // New ID for duplicated FAQ
          question: faq.question,
          answer: faq.answer,
          displayOrder: faq.display_order,
          isVisible: faq.is_visible,
        })));
      }

      // Fetch active CoC for the original event
      const { data: eventCoCData } = await supabase
        .from("code_of_conduct")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .maybeSingle();

      // Fetch available society CoCs
      const { data: societyCoCs } = await supabase
        .from("code_of_conduct")
        .select("id, version, content, file_url, name, is_active")
        .eq("society_id", societyData.id)
        .is("event_id", null)
        .order("version", { ascending: false });

      setAvailableCoCs(societyCoCs || []);

      // Decide which CoC to pre-select:
      if (societyCoCs && societyCoCs.length > 0) {
        let toSelect: string | null = null;

        if (eventCoCData) {
          const match = societyCoCs.find(
            (coc) => coc.name === eventCoCData.name || coc.version === eventCoCData.version
          );
          if (match) toSelect = match.id;
        }

        if (!toSelect) {
          const active = societyCoCs.find((c) => c.is_active);
          toSelect = active ? active.id : societyCoCs[0].id;
        }

        setSelectedCoCId(toSelect);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load event data");
      navigate(`/society/${slug}/events`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoCs = async () => {
    if (!society) return;
    
    const { data: cocsData } = await supabase
      .from("code_of_conduct")
      .select("id, version, content, file_url, name, is_active")
      .eq("society_id", society.id)
      .is("event_id", null)
      .order("version", { ascending: false });

    if (cocsData) {
      setAvailableCoCs(cocsData);
      // Auto-select the active CoC, or the most recent if none is active
      const activeCoC = cocsData.find((c) => c.is_active);
      if (activeCoC) {
        setSelectedCoCId(activeCoC.id);
      } else if (cocsData.length > 0) {
        setSelectedCoCId(cocsData[0].id);
      }
    }
  };

  const handleAddMember = () => {
    if (selectedMember && !selectedContacts.find((c) => c.userId === selectedMember.user_id)) {
      const newContact: WelfareContact = {
        userId: selectedMember.user_id,
        displayName: selectedMember.profile.display_name || "Unnamed Member",
        role: tempRole,
      };
      setSelectedContacts([...selectedContacts, newContact]);
      setSelectedMember(null);
      setTempRole("");
    }
  };

  const updateContactRole = (userId: string, role: string) => {
    setSelectedContacts((prev) => prev.map((c) => (c.userId === userId ? { ...c, role } : c)));
  };

  const updateContactPhone = (userId: string, phone: string) => {
    setSelectedContacts((prev) => prev.map((c) => (c.userId === userId ? { ...c, phone } : c)));
  };

  const removeContact = (userId: string) => {
    setSelectedContacts((prev) => prev.filter((c) => c.userId !== userId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedContacts((items) => {
        const oldIndex = items.findIndex((item) => item.userId === active.id);
        const newIndex = items.findIndex((item) => item.userId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddExternalContact = () => {
    if (externalName.trim() && externalPhone.trim()) {
      const fullPhone = externalCountryCode + externalPhone.trim();
      const newContact: ExternalContact = {
        id: crypto.randomUUID(),
        name: externalName.trim(),
        phone: fullPhone,
        role: externalRole.trim(),
      };
      setExternalContacts([...externalContacts, newContact]);
      setExternalName("");
      setExternalPhone("");
      setExternalRole("");
    }
  };

  const removeExternalContact = (id: string) => {
    setExternalContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const addEmergencyField = () => {
    setEmergencyFields([
      ...emergencyFields,
      { id: crypto.randomUUID(), label: "", name: "", address: "", phone: "" },
    ]);
  };

  const removeEmergencyField = (id: string) => {
    setEmergencyFields((prev) => prev.filter((f) => f.id !== id));
  };

  const updateEmergencyField = (id: string, field: keyof EmergencyField, value: string) => {
    setEmergencyFields((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  // FAQ handlers
  const handleAddFAQ = (question: string, answer: string) => {
    const newFAQ: FAQ = {
      id: crypto.randomUUID(),
      question,
      answer,
      displayOrder: faqs.length,
      isVisible: true,
    };
    setFaqs([...faqs, newFAQ]);
    toast.success("FAQ added");
  };

  const handleEditFAQ = (id: string, question: string, answer: string, isVisible: boolean) => {
    setFaqs(faqs.map(faq => faq.id === id ? { ...faq, question, answer, isVisible } : faq));
    toast.success("FAQ updated");
  };

  const handleDeleteFAQ = (id: string) => {
    setFaqs(faqs.filter(faq => faq.id !== id));
    toast.success("FAQ deleted");
  };

  const handleFAQDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setFaqs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, index) => ({ ...item, displayOrder: index }));
      });
    }
  };

  const openEditFAQDialog = (faq: FAQ) => {
    setEditingFAQ(faq);
    setEditFAQDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!eventName.trim() || !eventDate || !society) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedContacts.length === 0 && externalContacts.length === 0) {
      toast.error("Please add at least one contact");
      return;
    }

    setSubmitting(true);

    try {
      // Generate unique slug
      const slug = await generateUniqueSlug(eventName, society.id);

      // Combine date and time
      let finalEventDate = eventDate;
      if (eventTime) {
        const [hours, minutes] = eventTime.split(":");
        finalEventDate = new Date(eventDate);
        finalEventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      }

      // Create event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert({
          title: eventName.trim(),
          slug: slug,
          event_date: finalEventDate.toISOString(),
          event_end_date: eventEndDate?.toISOString() || null,
          location: location.trim() || null,
          society_id: society.id,
          created_by: user!.id,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Fetch profiles for snapshot data
      const memberIds = selectedContacts.map((c) => c.userId);
      let memberProfiles: Record<string, any> = {};

      if (memberIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, phone_number, avatar_url")
          .in("id", memberIds);

        if (profilesData) {
          memberProfiles = Object.fromEntries(profilesData.map((p) => [p.id, p]));
        }
      }

      // Create event contacts with snapshot fields including avatar
      const contactsToInsert = [
        ...selectedContacts.map((contact, index) => {
          const profile = memberProfiles[contact.userId];
          const phoneToUse = contact.phone?.trim() || profile?.phone_number;
          return {
            event_id: eventData.id,
            user_id: contact.userId,
            contact_name: profile?.display_name || contact.displayName,
            contact_phone: phoneToUse,
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
        })),
      ];

      if (contactsToInsert.length > 0) {
        const { error: contactsError } = await supabase.from("event_contacts").insert(contactsToInsert);

        if (contactsError) throw contactsError;
      }

      // Create emergency info
      if (emergencyFields.length > 0) {
        const { error: emergencyError } = await supabase.from("emergency_info").insert({
          event_id: eventData.id,
          custom_emergency_info: emergencyFields as any,
        });

        if (emergencyError) throw emergencyError;
      }

      // Create a copy of the selected CoC for this event
      if (selectedCoCId) {
        const selectedCoC = availableCoCs.find((c) => c.id === selectedCoCId);
        if (selectedCoC) {
          const { error: cocError } = await supabase.from("code_of_conduct").insert({
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

      // If there's a CoC, show preview dialog before navigating
      if (selectedCoCId) {
        const { data: eventCocData } = await supabase
          .from("code_of_conduct")
          .select("*")
          .eq("event_id", eventData.id)
          .eq("is_active", true)
          .maybeSingle();
        
        if (eventCocData) {
          setCreatedEventData(eventData);
          setCoCPreviewData(eventCocData);
          setShowCoCPreview(true);
          toast.success("Event duplicated! Preview the Code of Conduct.");
        } else {
          toast.success("Event duplicated successfully");
          navigate(`/event/${eventData.id}`);
        }
      } else {
        toast.success("Event duplicated successfully");
        navigate(`/event/${eventData.id}`);
      }
    } catch (error: any) {
      console.error("Error duplicating event:", error);
      toast.error(error?.message || "Failed to duplicate event");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isCommittee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>Only committee members can duplicate events</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/society/${slug}/events`)} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <img src={logo} alt="SafeSocial Logo" className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Duplicate Event</h1>
            </div>
          </div>

          {/* Breadcrumbs */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/society/${society?.slug}`}>{society?.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/society/${society?.slug}/events`}>Events</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Duplicate Event</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>Update the event information as needed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name *</Label>
                <Input
                  id="eventName"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g., Freshers Week Party"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !eventDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={eventDate}
                        onSelect={(date) => {
                          setEventDate(date);
                          setStartDateOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !eventEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {eventEndDate ? format(eventEndDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={eventEndDate}
                        onSelect={(date) => {
                          setEventEndDate(date);
                          setEndDateOpen(false);
                        }}
                        initialFocus
                        disabled={(date) => eventDate ? date < eventDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventTime">Time (Optional)</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Student Union Bar"
                />
              </div>
            </CardContent>
          </Card>

          {/* Important Contacts */}
          <Card>
            <CardHeader>
              <CardTitle>Important Contacts</CardTitle>
              <CardDescription>
                Add contacts for attendees to reach during the event (pre-filled from original event)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Society Members Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Society Members</h3>
                  <p className="text-sm text-muted-foreground mb-3">Add committee members as contacts</p>
                </div>

                {selectedContacts.length > 0 && (
                  <div className="space-y-2">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={selectedContacts.map((c) => c.userId)}
                        strategy={verticalListSortingStrategy}
                      >
                        {selectedContacts.map((contact) => (
                          <SortableContactItem
                            key={contact.userId}
                            contact={contact}
                            onUpdateRole={updateContactRole}
                            onUpdatePhone={updateContactPhone}
                            onRemove={removeContact}
                            profilePhone={memberPhones[contact.userId]}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}

                <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
                  <div className="space-y-2">
                    <Label htmlFor="memberSelect">Select Team Member</Label>
                    <select
                      id="memberSelect"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={selectedMember?.user_id || ""}
                      onChange={(e) => {
                        const member = members.find((m) => m.user_id === e.target.value);
                        setSelectedMember(member || null);
                      }}
                    >
                      <option value="">Choose a member...</option>
                      {members
                        .filter((m) => !selectedContacts.find((c) => c.userId === m.user_id))
                        .map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.profile.display_name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tempRole">Role (optional)</Label>
                    <Input
                      id="tempRole"
                      value={tempRole}
                      onChange={(e) => setTempRole(e.target.value)}
                      placeholder="e.g., Welfare Officer"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddMember}
                    disabled={!selectedMember}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </div>

              {/* External Contacts Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">External Contacts</h3>
                  <p className="text-sm text-muted-foreground mb-3">Add people outside your society</p>
                </div>

                {externalContacts.length > 0 && (
                  <div className="space-y-2">
                    {externalContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center gap-2 rounded-lg border p-3 bg-muted">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">{contact.phone}</p>
                          {contact.role && (
                            <p className="text-xs text-muted-foreground">{contact.role}</p>
                          )}
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

                <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
                  <div className="space-y-2">
                    <Label htmlFor="externalName">Name</Label>
                    <Input
                      id="externalName"
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="externalPhone">Phone Number</Label>
                    <div className="flex gap-2">
                      <select
                        value={externalCountryCode}
                        onChange={(e) => setExternalCountryCode(e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm w-24"
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
                  <Button type="button" size="sm" onClick={handleAddExternalContact} className="w-full">
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
              <CardDescription>Customizable emergency contact information (pre-filled from original event)</CardDescription>
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
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeEmergencyField(field.id)}>
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

              <Button type="button" variant="outline" onClick={addEmergencyField} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Emergency Info
              </Button>
            </CardContent>
          </Card>

          {/* FAQs Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>Copied from original event - edit as needed</CardDescription>
            </CardHeader>
            <CardContent>
              <FAQSection
                faqs={faqs}
                onDragEnd={handleFAQDragEnd}
                onEdit={openEditFAQDialog}
                onDelete={handleDeleteFAQ}
                onAdd={() => setCreateFAQDialogOpen(true)}
              />
            </CardContent>
          </Card>

          {/* Code of Conduct */}
          <Card>
            <CardHeader>
              <CardTitle>Code of Conduct</CardTitle>
              <CardDescription>Select a code of conduct for this event (pre-selected from original event if available)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableCoCs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">No codes of conduct available</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create one to attach to your events
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateCoCDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Code of Conduct
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={selectedCoCId}
                    onChange={(e) => setSelectedCoCId(e.target.value)}
                  >
                    <option value="">No code of conduct</option>
                    {availableCoCs.map((coc) => (
                      <option key={coc.id} value={coc.id}>
                        {coc.is_active ? "⭐ " : ""}
                        {coc.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateCoCDialogOpen(true)}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Code of Conduct
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-3 sm:p-4">
          <div className="container mx-auto max-w-2xl">
            <div className="flex gap-2 sm:gap-4">
              {/* Preview button - icon only */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowSafetyPreview(true)}
                className="shrink-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
              
              {/* Cancel - more discrete */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(`/society/${slug}/events`)}
                className="flex-1 text-sm sm:text-base"
                disabled={submitting}
              >
                Cancel
              </Button>
              
              {/* Primary action */}
              <Button 
                type="submit" 
                onClick={handleSubmit} 
                className="flex-1 text-sm sm:text-base whitespace-normal sm:whitespace-nowrap px-2 sm:px-4 leading-tight py-2" 
                disabled={submitting}
              >
                {submitting ? "Creating..." : <span className="inline sm:hidden">Save & Create</span>}
                {submitting ? "" : <span className="hidden sm:inline">Save & Create Safety Page</span>}
              </Button>
            </div>
          </div>
        </div>

        {/* Dialogs */}
        <CreateCoCDialog
          open={createCoCDialogOpen}
          onOpenChange={setCreateCoCDialogOpen}
          societyId={society?.id || ""}
          onSuccess={fetchCoCs}
        />

        {showSafetyPreview && society && (
          <EventSafetyPreviewDialog
            open={showSafetyPreview}
            onOpenChange={setShowSafetyPreview}
            eventName={eventName}
            eventDate={eventDate}
            location={location}
            welfareContacts={selectedContacts.map((c) => ({
              userId: c.userId,
              displayName: c.displayName,
              role: c.role,
              phone: c.phone || memberPhones[c.userId],
            }))}
            externalContacts={externalContacts}
            emergencyFields={emergencyFields}
            hasCodeOfConduct={!!selectedCoCId}
            cocName={selectedCoCId ? availableCoCs.find((c) => c.id === selectedCoCId)?.name : undefined}
          />
        )}

        {showCoCPreview && createdEventData && cocPreviewData && (
          <CoCAcceptanceDialog
            eventId={createdEventData.id}
            eventTitle={createdEventData.title}
            cocId={cocPreviewData.id}
            cocVersion={cocPreviewData.version}
            cocContent={cocPreviewData.content}
            cocFileUrl={cocPreviewData.file_url}
            cocContentType={cocPreviewData.content_type === 'text' ? 'text' : 'markdown'}
            onAccepted={() => {
              setShowCoCPreview(false);
              navigate(`/event/${createdEventData.id}`);
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
};

export default DuplicateEvent;
