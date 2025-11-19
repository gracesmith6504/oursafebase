import { isBefore, isAfter, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type EventStatus = 'upcoming' | 'ongoing' | 'past';

export const getEventStatus = (eventDate: Date | string, eventEndDate?: Date | string | null): EventStatus => {
  const now = new Date();
  const eventStart = new Date(eventDate);
  
  // For multi-day events, use the end date; otherwise use start date
  const eventFinalDay = eventEndDate ? new Date(eventEndDate) : eventStart;
  
  const eventStartDay = startOfDay(eventStart);
  const eventEndDay = endOfDay(eventFinalDay);
  
  // If current time is before the event start, it's upcoming
  if (isBefore(now, eventStartDay)) {
    return 'upcoming';
  }
  
  // If current time is after the event end, it's past
  if (isAfter(now, eventEndDay)) {
    return 'past';
  }
  
  // Otherwise, it's happening (ongoing)
  return 'ongoing';
};

// Helper to determine if post-event feedback should be shown
export const shouldShowPostEventFeedback = (eventDate: Date | string, eventEndDate?: Date | string | null): boolean => {
  const now = new Date();
  const eventStart = new Date(eventDate);
  
  // For multi-day events
  if (eventEndDate) {
    const eventEnd = new Date(eventEndDate);
    const eventEndDayStart = startOfDay(eventEnd);
    const eventStartDayStart = startOfDay(eventStart);
    
    // Check if it's actually a multi-day event (end date is different from start date)
    if (eventEndDayStart.getTime() !== eventStartDayStart.getTime()) {
      // Show feedback starting from the final day (beginning of final day)
      return !isBefore(now, eventEndDayStart);
    }
  }
  
  // For single-day events, show feedback after the event ends
  return isAfter(now, endOfDay(eventStart));
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
