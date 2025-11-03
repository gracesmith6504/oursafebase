import { isBefore, isAfter, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type EventStatus = 'upcoming' | 'ongoing' | 'past';

export const getEventStatus = (eventDate: Date | string): EventStatus => {
  const now = new Date();
  const event = new Date(eventDate);
  
  const eventStart = startOfDay(event);
  const eventEnd = endOfDay(event);
  
  // If current time is before the event start, it's upcoming
  if (isBefore(now, eventStart)) {
    return 'upcoming';
  }
  
  // If current time is after the event end, it's past
  if (isAfter(now, eventEnd)) {
    return 'past';
  }
  
  // Otherwise, it's happening today (ongoing)
  return 'ongoing';
};

export const generateUniqueSlug = async (
  eventName: string,
  societyId: string,
  excludeEventId?: string
): Promise<string> => {
  const baseSlug = eventName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  let slug = baseSlug;
  let suffix = 1;
  
  while (true) {
    // Check if this slug exists for this society
    const query = supabase
      .from("events")
      .select("id")
      .eq("society_id", societyId)
      .eq("slug", slug);
    
    // Exclude current event when editing
    if (excludeEventId) {
      query.neq("id", excludeEventId);
    }
    
    const { data } = await query.maybeSingle();
    
    // If no match found, this slug is available
    if (!data) {
      return slug;
    }
    
    // Otherwise, try with a numeric suffix
    suffix++;
    slug = `${baseSlug}-${suffix}`;
  }
};
