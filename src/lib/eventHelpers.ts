import { isBefore, isAfter, startOfDay, endOfDay } from "date-fns";

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
