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
import { ArrowLeft, Plus, X, ChevronRight, GripVertical, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import logo from "@/assets/logo.png";
import { EventSafetyPreviewDialog } from "@/components/EventSafetyPreviewDialog";
import { Eye, HelpCircle } from "lucide-react";
import { BatchCreateFAQDialog } from "@/components/BatchCreateFAQDialog";
import { EditFAQDialog } from "@/components/EditFAQDialog";
import { FAQSection, FAQ } from "@/components/FAQSection";
import { BatchCreateFeedbackQuestionDialog } from "@/components/BatchCreateFeedbackQuestionDialog";
import { EditFeedbackQuestionDialog } from "@/components/EditFeedbackQuestionDialog";
import { FeedbackSection, FeedbackQuestionType } from "@/components/FeedbackSection";
import { Switch } from "@/components/ui/switch";
import { MessageSquare } from "lucide-react";

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
              className="h-8 text-sm"
            />
          </div>
          {profilePhone ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <p className="text-sm px-3 py-1.5 rounded-md bg-background border">{profilePhone}</p>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor={`phone-${contact.userId}`} className="text-xs text-muted-foreground">
                Phone (optional)
              </Label>
              <Input
                id={`phone-${contact.userId}`}
                value={contact.phone || ""}
                onChange={(e) => onUpdatePhone(contact.userId, e.target.value)}
                placeholder="e.g., +353 87 123 4567"
                className="h-8 text-sm"
              />
            </div>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(contact.userId)}
        className="shrink-0 h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const EditEvent = () => {
  const { slug, eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [society, setSociety] = useState<Society | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { isCommittee, loading: roleLoading } = useCommitteeRole(society?.id);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Form state
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [eventEndDate, setEventEndDate] = useState<Date>();
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<WelfareContact[]>([]);
  const [memberPhones, setMemberPhones] = useState<Record<string, string>>({});
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
  
  // Preview dialog state
  const [showSafetyPreview, setShowSafetyPreview] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // FAQ state
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [batchCreateFAQDialogOpen, setBatchCreateFAQDialogOpen] = useState(false);
  const [editFAQDialogOpen, setEditFAQDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [originalFAQIds, setOriginalFAQIds] = useState<Set<string>>(new Set());
  
  // Feedback state
  const [feedbackAutoSend, setFeedbackAutoSend] = useState(false);
  const [feedbackQuestions, setFeedbackQuestions] = useState<FeedbackQuestionType[]>([]);
  const [batchFeedbackDialogOpen, setBatchFeedbackDialogOpen] = useState(false);
  const [editFeedbackDialogOpen, setEditFeedbackDialogOpen] = useState(false);
  const [editingFeedbackQuestion, setEditingFeedbackQuestion] = useState<FeedbackQuestionType | null>(null);
  const [originalFeedbackQuestionIds, setOriginalFeedbackQuestionIds] = useState<Set<string>>(new Set());
  const [feedbackConfigId, setFeedbackConfigId] = useState<string | null>(null);
  
  const countryCodes = [
    { code: "+353", country: "Ireland", flag: "🇮🇪" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
  ];

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

      // Fetch event data
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError || !eventData) {
        navigate(`/society/${slug}/events`);
        return;
      }

      // Set event data
      setEventName(eventData.title);
      setEventDate(new Date(eventData.event_date));
      if (eventData.event_end_date) {
        setEventEndDate(new Date(eventData.event_end_date));
      }
      setEventTime(format(new Date(eventData.event_date), "HH:mm"));
      setLocation(eventData.location || "");

      // Fetch event contacts using snapshot fields
      const { data: contactsData } = await supabase
        .from("event_contacts")
        .select("id, role, user_id, contact_name, contact_phone, external_name, external_phone, display_order")
        .eq("event_id", eventId)
        .order("display_order");

      if (contactsData) {
        const internalContacts = contactsData
          .filter((c: any) => c.user_id)
          .map((c: any) => ({
            userId: c.user_id,
            displayName: c.contact_name || "Anonymous",
            role: c.role || "",
            phone: c.contact_phone || "",
          }));
        
        const externalContactsList = contactsData
          .filter((c: any) => !c.user_id)
          .map((c: any) => ({
            id: crypto.randomUUID(),
            name: c.contact_name || c.external_name || "",
            phone: c.contact_phone || c.external_phone || "",
            role: c.role || "",
          }));
        
        setSelectedContacts(internalContacts);
        setExternalContacts(externalContactsList);
      }

      // Fetch emergency info
      const { data: emergencyData } = await supabase
        .from("emergency_info")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

      if (emergencyData && emergencyData.custom_emergency_info) {
        const fields = (emergencyData.custom_emergency_info || []) as any as EmergencyField[];
        setEmergencyFields(fields);
      }

      // Fetch FAQs
      const { data: faqsData } = await supabase
        .from("event_faqs")
        .select("*")
        .eq("event_id", eventId)
        .order("display_order");

      if (faqsData) {
        const fetchedFAQs = faqsData.map((faq: any) => ({
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
          displayOrder: faq.display_order,
          isVisible: faq.is_visible,
        }));
        setFaqs(fetchedFAQs);
        setOriginalFAQIds(new Set(fetchedFAQs.map((f: FAQ) => f.id)));
      }

      // Fetch feedback config
      const { data: feedbackConfigData } = await supabase
        .from("event_feedback_config")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

      if (feedbackConfigData) {
        setFeedbackConfigId(feedbackConfigData.id);
        setFeedbackAutoSend(feedbackConfigData.auto_send_enabled);
      }

      // Fetch feedback questions
      const { data: feedbackQuestionsData } = await supabase
        .from("event_feedback_questions")
        .select("*")
        .eq("event_id", eventId)
        .order("display_order");

      if (feedbackQuestionsData) {
        const fetchedQuestions = feedbackQuestionsData.map((q: any) => ({
          id: q.id,
          question: q.question,
          question_type: q.question_type,
          display_order: q.display_order,
          is_required: q.is_required,
        }));
        setFeedbackQuestions(fetchedQuestions);
        setOriginalFeedbackQuestionIds(new Set(fetchedQuestions.map((q: FeedbackQuestionType) => q.id)));
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
      }

      // Check if this event has an associated CoC and find matching society CoC
      const { data: eventCoCData } = await supabase
        .from("code_of_conduct")
        .select("version")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .maybeSingle();

      if (eventCoCData && cocsData) {
        // Find the society CoC with the same version
        const matchingCoC = cocsData.find(c => c.version === eventCoCData.version);
        if (matchingCoC) {
          setSelectedCoCId(matchingCoC.id);
        }
      } else if (cocsData && cocsData.length > 0 && !eventCoCData) {
        // If no event CoC exists, auto-select the active society CoC
        const activeCoC = cocsData.find(c => c.is_active);
        if (activeCoC) {
          setSelectedCoCId(activeCoC.id);
        }
      }

      // Fetch all members
    const { data: membersData, error: membersError } = await supabase
      .from("society_members")
      .select(`
        user_id,
        role,
        profile:profiles(id, display_name, phone_number)
      `)
      .eq("society_id", societyData.id);

      if (!membersError && membersData) {
        setMembers(membersData as any);
        
        // Store member phone numbers for display
        const phones: Record<string, string> = {};
        membersData.forEach((member: any) => {
          if (member.profile?.phone_number) {
            phones[member.user_id] = member.profile.phone_number;
          }
        });
        setMemberPhones(phones);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      navigate("/dashboard");
    }
  };

  const handleMemberSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const memberId = e.target.value;
    if (!memberId) return;

    const member = members.find(m => m.user_id === memberId);
    if (!member) return;

    // Check if already added
    const exists = selectedContacts.some(c => c.userId === member.user_id);
    if (exists) {
      e.target.value = "";
      return;
    }

    // Instantly add member to selected contacts
    setSelectedContacts([
      ...selectedContacts,
      {
        userId: member.user_id,
        displayName: member.profile?.display_name || "Anonymous",
        role: "",
        phone: "",
      },
    ]);
    
    e.target.value = "";
  };

  const updateMemberRole = (userId: string, role: string) => {
    setSelectedContacts(
      selectedContacts.map(c =>
        c.userId === userId ? { ...c, role } : c
      )
    );
  };

  const updateMemberPhone = (userId: string, phone: string) => {
    setSelectedContacts(
      selectedContacts.map(c =>
        c.userId === userId ? { ...c, phone } : c
      )
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSelectedContacts((contacts) => {
        const oldIndex = contacts.findIndex((c) => c.userId === active.id);
        const newIndex = contacts.findIndex((c) => c.userId === over.id);
        return arrayMove(contacts, oldIndex, newIndex);
      });
    }
  };

  const handleAddMember = () => {
    if (!selectedMember) return;

    const exists = selectedContacts.some(c => c.userId === selectedMember.user_id);
    if (exists) {
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
      return;
    }

    if (externalName.trim().length > 100) {
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

  // FAQ handlers
  const handleBatchAddFAQ = (newFAQs: { question: string; answer: string }[]) => {
    const currentMaxOrder = faqs.length;
    const createdFAQs: FAQ[] = newFAQs.map((faq, index) => ({
      id: crypto.randomUUID(),
      question: faq.question,
      answer: faq.answer,
      displayOrder: currentMaxOrder + index,
      isVisible: true,
    }));
    setFaqs([...faqs, ...createdFAQs]);
  };

  const handleEditFAQ = (id: string, question: string, answer: string, isVisible: boolean) => {
    setFaqs(faqs.map(faq => faq.id === id ? { ...faq, question, answer, isVisible } : faq));
  };

  const handleDeleteFAQ = (id: string) => {
    setFaqs(faqs.filter(faq => faq.id !== id));
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

  // Feedback handlers
  const handleBatchAddFeedbackQuestions = (questions: Omit<FeedbackQuestionType, 'id' | 'display_order'>[]) => {
    const nextOrder = feedbackQuestions.length;
    const createdQuestions = questions.map((q, index) => ({
      ...q,
      id: crypto.randomUUID(),
      display_order: nextOrder + index,
      is_required: false,
    }));
    setFeedbackQuestions([...feedbackQuestions, ...createdQuestions]);
  };

  const handleEditFeedbackQuestion = (id: string, updates: Partial<FeedbackQuestionType>) => {
    setFeedbackQuestions(feedbackQuestions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleDeleteFeedbackQuestion = (id: string) => {
    const updated = feedbackQuestions.filter(q => q.id !== id);
    setFeedbackQuestions(updated);
    // Auto-disable auto-send when no questions remain
    if (updated.length === 0) {
      setFeedbackAutoSend(false);
    }
  };

  const handleFeedbackQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setFeedbackQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, index) => ({ ...item, display_order: index }));
      });
    }
  };

  const handleMoveFeedbackQuestionUp = (id: string) => {
    const index = feedbackQuestions.findIndex(q => q.id === id);
    if (index > 0) {
      const reordered = arrayMove(feedbackQuestions, index, index - 1);
      setFeedbackQuestions(reordered.map((item, idx) => ({ ...item, display_order: idx })));
    }
  };

  const handleMoveFeedbackQuestionDown = (id: string) => {
    const index = feedbackQuestions.findIndex(q => q.id === id);
    if (index < feedbackQuestions.length - 1) {
      const reordered = arrayMove(feedbackQuestions, index, index + 1);
      setFeedbackQuestions(reordered.map((item, idx) => ({ ...item, display_order: idx })));
    }
  };

  const openEditFeedbackQuestionDialog = (question: FeedbackQuestionType) => {
    setEditingFeedbackQuestion(question);
    setEditFeedbackDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventName.trim()) {
      toast.error("Event name is required");
      return;
    }

    if (eventName.trim().length > 200) {
      toast.error("Event name must be less than 200 characters");
      return;
    }

    if (!eventDate) {
      toast.error("Event date is required");
      return;
    }

    if (location.trim().length > 300) {
      toast.error("Location must be less than 300 characters");
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

      // Combine end date and time if provided
      let eventEndDateTime = null;
      if (eventEndDate) {
        eventEndDateTime = new Date(eventEndDate);
        if (eventTime) {
          const [hours, minutes] = eventTime.split(":");
          eventEndDateTime.setHours(parseInt(hours), parseInt(minutes));
        }
      }

      // Update event
      const { error: eventError } = await supabase
        .from("events")
        .update({
          title: eventName.trim(),
          event_date: eventDateTime.toISOString(),
          event_end_date: eventEndDateTime?.toISOString() || null,
          location: location.trim() || null,
        })
        .eq("id", eventId);

      if (eventError) throw eventError;

      // Delete and recreate event contacts
      await supabase.from("event_contacts").delete().eq("event_id", eventId);

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

      const contactsToInsert = [
        ...selectedContacts.map((contact, index) => {
          const profile = memberProfiles[contact.userId];
          return {
            event_id: eventId,
            user_id: contact.userId,
            contact_name: profile?.display_name || contact.displayName,
            contact_phone: contact.phone || profile?.phone_number,
            contact_avatar_url: profile?.avatar_url,
            external_name: null,
            external_phone: null,
            role: contact.role,
            display_order: index,
          };
        }),
        ...externalContacts.map((contact, index) => ({
          event_id: eventId,
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

      // Update emergency info
      await supabase.from("emergency_info").delete().eq("event_id", eventId);

      if (emergencyFields.length > 0) {
        const { error: emergencyError } = await supabase
          .from("emergency_info")
          .insert({
            event_id: eventId!,
            custom_emergency_info: emergencyFields as any,
          });

        if (emergencyError) throw emergencyError;
      }

      // Update FAQs - delete all and reinsert
      await supabase.from('event_faqs').delete().eq('event_id', eventId);
      
      const faqsToInsert = faqs.map(f => ({
        event_id: eventId!,
        question: f.question,
        answer: f.answer,
        display_order: f.displayOrder,
        is_visible: f.isVisible,
      }));
      
      if (faqsToInsert.length > 0) {
        const { error: faqError } = await supabase
          .from('event_faqs')
          .insert(faqsToInsert);
        
        if (faqError) throw faqError;
      }

      // Update feedback config and questions
      if (feedbackQuestions.length > 0) {
        // Upsert feedback config
        const { error: configError } = await supabase
          .from("event_feedback_config")
          .upsert({
            id: feedbackConfigId,
            event_id: eventId!,
            enabled: true,
            auto_send_enabled: feedbackAutoSend,
            auto_send_hours: 24,
          }, { onConflict: 'event_id' });

        if (configError) throw configError;

        // Delete all existing feedback questions and reinsert
        await supabase.from('event_feedback_questions').delete().eq('event_id', eventId);
        
        if (feedbackQuestions.length > 0) {
          const questionsToInsert = feedbackQuestions.map(q => ({
            event_id: eventId!,
            question: q.question,
            question_type: q.question_type,
            display_order: q.display_order,
            is_required: q.is_required,
          }));
          
          const { error: questionsError } = await supabase
            .from('event_feedback_questions')
            .insert(questionsToInsert);
          
          if (questionsError) throw questionsError;
        }
      } else {
        // If feedback is disabled, delete config and questions
        await supabase.from('event_feedback_config').delete().eq('event_id', eventId);
        await supabase.from('event_feedback_questions').delete().eq('event_id', eventId);
      }

      // Update CoC association
      // First, delete any existing event-specific CoC
      await supabase
        .from("code_of_conduct")
        .delete()
        .eq("event_id", eventId);

      // Create a copy of the selected society CoC for this event
      if (selectedCoCId) {
        const selectedCoC = availableCoCs.find(c => c.id === selectedCoCId);
        if (selectedCoC) {
          const { error: cocError } = await supabase
            .from("code_of_conduct")
            .insert({
              event_id: eventId,
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

      toast.success("Event updated successfully");
      navigate(`/event/${eventId}`);
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast.error(error?.message || "Failed to update event");
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
                You need committee access to edit events.
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
      <div className="min-h-screen bg-muted pb-24 overflow-x-hidden">
        <header className="border-b bg-background">
          <div className="container mx-auto px-4 py-4">
            {/* Breadcrumbs */}
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/society/${slug}/dashboard`}>{society?.name}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/society/${slug}/events`}>Events</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>Edit Event</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

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
                <h1 className="text-xl font-bold">Edit Event</h1>
                <p className="text-sm text-muted-foreground">{society?.name}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto max-w-2xl px-3 py-4 md:px-4 md:py-8">
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
                      Start Date <span className="text-destructive">*</span>
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
                  <Label>End Date (optional - for multi-day events)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !eventEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {eventEndDate ? format(eventEndDate, "PPP") : <span>Pick end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={eventEndDate}
                        onSelect={setEventEndDate}
                        initialFocus
                        disabled={(date) => eventDate ? date < eventDate : false}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
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
                <div className="space-y-4">
                  <Label>Society Team Members</Label>
                  
                  {selectedContacts.length > 0 && (
                    <div className="space-y-2">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={selectedContacts.map(c => c.userId)}
                          strategy={verticalListSortingStrategy}
                        >
                          {selectedContacts.map((contact) => (
                            <SortableContactItem
                              key={contact.userId}
                              contact={contact}
                              onUpdateRole={updateMemberRole}
                              onUpdatePhone={updateMemberPhone}
                              onRemove={removeMemberContact}
                              profilePhone={memberPhones[contact.userId]}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
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
                    <p className="text-xs text-muted-foreground">
                      Select to add instantly. Drag to reorder. Changes save automatically.
                    </p>
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

            {/* FAQs Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>Add common questions attendees might have about this event</CardDescription>
              </CardHeader>
              <CardContent>
            <FAQSection
              faqs={faqs}
              onDragEnd={handleFAQDragEnd}
              onEdit={openEditFAQDialog}
              onDelete={handleDeleteFAQ}
              onBatchAdd={() => setBatchCreateFAQDialogOpen(true)}
            />
              </CardContent>
            </Card>

            {/* Post-Event Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Post-Event Feedback
                </CardTitle>
                <CardDescription>Automatically collect feedback from attendees after the event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="auto-send" className="text-base">Auto-send Feedback Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Send feedback email 24 hours after event ends
                    </p>
                  </div>
                  <Switch
                    id="auto-send"
                    checked={feedbackAutoSend}
                    onCheckedChange={setFeedbackAutoSend}
                    disabled={feedbackQuestions.length === 0}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Feedback Questions</Label>
                  <FeedbackSection
                    questions={feedbackQuestions}
                    onDragEnd={handleFeedbackQuestionDragEnd}
                    onEdit={openEditFeedbackQuestionDialog}
                    onDelete={handleDeleteFeedbackQuestion}
                    onBatchAdd={() => setBatchFeedbackDialogOpen(true)}
                    onMoveUp={handleMoveFeedbackQuestionUp}
                    onMoveDown={handleMoveFeedbackQuestionDown}
                  />
                </div>
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
                            {coc.name || `Version ${coc.version}`}{coc.is_active ? ' (Active)' : ''}
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
              
              {/* Delete button - subtle and small */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                disabled={submitting}
              >
                <Trash2 className="h-4 w-4" />
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
                className="flex-1 text-sm sm:text-base"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Safety Page Preview Dialog */}
        <EventSafetyPreviewDialog
          open={showSafetyPreview}
          onOpenChange={setShowSafetyPreview}
          eventName={eventName}
          eventDate={eventDate}
          location={location}
          welfareContacts={selectedContacts.map(contact => ({
            ...contact,
            phone: contact.phone || memberPhones[contact.userId]
          }))}
          externalContacts={externalContacts}
          emergencyFields={emergencyFields}
          hasCodeOfConduct={!!selectedCoCId}
          cocName={availableCoCs.find(c => c.id === selectedCoCId)?.name || null}
        />

        {/* Delete Event Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this event? This action cannot be undone.
                All associated data including reports, feedback, and code acceptances will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from("events")
                      .delete()
                      .eq("id", eventId);

                    if (error) throw error;

                    toast.success("Event deleted successfully");
                    navigate(`/society/${slug}/events`);
                  } catch (error) {
                    console.error("Error deleting event:", error);
                    toast.error("Failed to delete event");
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Event
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* FAQ Dialogs */}
      <BatchCreateFAQDialog
        open={batchCreateFAQDialogOpen}
        onOpenChange={setBatchCreateFAQDialogOpen}
        onSuccess={handleBatchAddFAQ}
      />
        
        <EditFAQDialog
          open={editFAQDialogOpen}
          onOpenChange={setEditFAQDialogOpen}
          faq={editingFAQ}
          onSuccess={handleEditFAQ}
        />

        {/* Feedback Dialogs */}
        <BatchCreateFeedbackQuestionDialog
          open={batchFeedbackDialogOpen}
          onOpenChange={setBatchFeedbackDialogOpen}
          onSuccess={handleBatchAddFeedbackQuestions}
        />
        
        <EditFeedbackQuestionDialog
          open={editFeedbackDialogOpen}
          onOpenChange={setEditFeedbackDialogOpen}
          question={editingFeedbackQuestion}
          onSuccess={handleEditFeedbackQuestion}
        />
      </div>
    </ProtectedRoute>
  );
};

export default EditEvent;
