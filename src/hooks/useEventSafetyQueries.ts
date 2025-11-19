import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Query key factory for better organization and deduplication
export const eventSafetyKeys = {
  all: ["event-safety"] as const,
  event: (eventId: string, societySlug?: string, eventSlug?: string) =>
    [...eventSafetyKeys.all, "event", { eventId, societySlug, eventSlug }] as const,
  society: (societyId: string) => [...eventSafetyKeys.all, "society", societyId] as const,
  contacts: (eventId: string) => [...eventSafetyKeys.all, "contacts", eventId] as const,
  emergencyInfo: (eventId: string) => [...eventSafetyKeys.all, "emergency", eventId] as const,
  codeOfConduct: (eventId: string, societyId: string) =>
    [...eventSafetyKeys.all, "coc", { eventId, societyId }] as const,
  faqs: (eventId: string) => [...eventSafetyKeys.all, "faqs", eventId] as const,
  membership: (societyId: string, userId: string) =>
    [...eventSafetyKeys.all, "membership", { societyId, userId }] as const,
  cocAcceptance: (eventId: string, userId: string) =>
    [...eventSafetyKeys.all, "coc-acceptance", { eventId, userId }] as const,
};

// Fetch event by slug or UUID
export const useEvent = (eventId?: string, societySlug?: string, eventSlug?: string) => {
  return useQuery({
    queryKey: eventSafetyKeys.event(eventId || "", societySlug, eventSlug),
    queryFn: async () => {
      if (societySlug && eventSlug) {
        const { data, error } = await supabase
          .from("events")
          .select("*, societies!inner(slug)")
          .eq("slug", eventSlug)
          .eq("societies.slug", societySlug)
          .single();

        if (error) throw error;
        return data;
      } else if (eventId) {
        const { data, error } = await supabase
          .from("events")
          .select("*, societies!inner(slug)")
          .eq("id", eventId)
          .single();

        if (error) throw error;
        return data;
      }
      throw new Error("No event identifier provided");
    },
    enabled: !!(eventId || (societySlug && eventSlug)),
    staleTime: 5 * 60 * 1000, // 5 minutes - events rarely change during viewing
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Fetch society data
export const useSociety = (societyId?: string) => {
  return useQuery({
    queryKey: eventSafetyKeys.society(societyId || ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("societies")
        .select("slug")
        .eq("id", societyId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!societyId,
    staleTime: 10 * 60 * 1000, // 10 minutes - societies change very rarely
    gcTime: 15 * 60 * 1000,
  });
};

// Fetch event contacts
export const useEventContacts = (eventId?: string) => {
  return useQuery({
    queryKey: eventSafetyKeys.contacts(eventId || ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_contacts")
        .select("id, role, contact_name, contact_phone, contact_avatar_url, display_order")
        .eq("event_id", eventId!)
        .order("display_order");

      if (error) throw error;

      return data.map((contact) => ({
        id: contact.id,
        name: contact.contact_name || "Anonymous",
        phone: contact.contact_phone,
        avatar: contact.contact_avatar_url,
        role: contact.role,
      }));
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Fetch emergency info
export const useEmergencyInfo = (eventId?: string) => {
  return useQuery({
    queryKey: eventSafetyKeys.emergencyInfo(eventId || ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_info")
        .select("*")
        .eq("event_id", eventId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// OPTIMIZED: Combined query for event and society CoC
export const useCodeOfConduct = (eventId?: string, societyId?: string) => {
  return useQuery({
    queryKey: eventSafetyKeys.codeOfConduct(eventId || "", societyId || ""),
    queryFn: async () => {
      // Single optimized query using OR condition
      const { data, error } = await supabase
        .from("code_of_conduct")
        .select("id, name, content, file_url, version, event_id, society_id, content_type")
        .eq("is_active", true)
        .or(`event_id.eq.${eventId},and(society_id.eq.${societyId},event_id.is.null)`)
        .order("event_id", { ascending: false, nullsFirst: false }); // Prefer event-specific CoC

      if (error) throw error;

      // Return the first result (event-specific if exists, otherwise society template)
      const cocData = data && data.length > 0 ? data[0] : null;
      const hasEventLevelCoC = cocData?.event_id === eventId;

      return {
        codeOfConduct: cocData,
        hasEventLevelCoC,
      };
    },
    enabled: !!eventId && !!societyId,
    staleTime: 10 * 60 * 1000, // 10 minutes - CoC changes very rarely
    gcTime: 15 * 60 * 1000,
  });
};

// Fetch FAQs with conditional fetching
export const useFAQs = (eventId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: eventSafetyKeys.faqs(eventId || ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_faqs")
        .select("*")
        .eq("event_id", eventId!)
        .eq("is_visible", true)
        .order("display_order");

      if (error) throw error;
      return data;
    },
    enabled: !!eventId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Fetch feedback questions count (optimized - only fetches count)
export const useFeedbackQuestionsCount = (eventId?: string) => {
  return useQuery({
    queryKey: [...eventSafetyKeys.all, "feedback-questions-count", eventId] as const,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_feedback_questions")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId!);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!eventId,
    staleTime: 10 * 60 * 1000, // 10 minutes - questions rarely change
    gcTime: 15 * 60 * 1000,
  });
};

// Check membership
export const useMembership = (societyId?: string, userId?: string) => {
  return useQuery({
    queryKey: eventSafetyKeys.membership(societyId || "", userId || ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("society_members")
        .select("id")
        .eq("society_id", societyId!)
        .eq("user_id", userId!)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!societyId && !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Check CoC acceptance
export const useCoCAcceptance = (
  eventId?: string,
  userId?: string,
  cocId?: string,
  cocVersion?: number
) => {
  return useQuery({
    queryKey: eventSafetyKeys.cocAcceptance(eventId || "", userId || ""),
    queryFn: async () => {
      // Skip check if no CoC exists
      if (!cocId) {
        return { required: false, data: null };
      }

      const { data, error } = await supabase
        .from("code_acceptances")
        .select("accepted_version")
        .eq("user_id", userId!)
        .eq("event_id", eventId!)
        .eq("code_of_conduct_id", cocId)
        .gte("accepted_version", cocVersion || 1)
        .maybeSingle();

      if (error) throw error;

      return {
        required: !data,
        data: data,
      };
    },
    enabled: !!eventId && !!userId && !!cocId,
    staleTime: 1 * 60 * 1000, // 1 minute - acceptance status may change more frequently
    gcTime: 5 * 60 * 1000,
  });
};

// Track page view mutation
export const useTrackPageView = () => {
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from("safety_page_views").insert({
        event_id: eventId,
        ip_address: null,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;
    },
  });
};

// Invalidate queries after CoC acceptance
export const useInvalidateCoCQueries = () => {
  const queryClient = useQueryClient();

  return (eventId: string, userId: string) => {
    queryClient.invalidateQueries({
      queryKey: eventSafetyKeys.cocAcceptance(eventId, userId),
    });
  };
};
