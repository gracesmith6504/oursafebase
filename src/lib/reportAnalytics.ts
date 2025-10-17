/**
 * Report Analytics Utilities
 * 
 * This file contains placeholder functions for future analytics features.
 * These will be implemented when the analytics dashboard is built.
 */

import { supabase } from "@/integrations/supabase/client";

// Get detailed metrics for a specific event
export const getEventDetailedMetrics = async (eventId: string) => {
  const [reports, feedback, pageViews, codeAcceptances] = await Promise.all([
    supabase.from("reports").select("*").eq("event_id", eventId),
    supabase.from("event_feedback").select("*").eq("event_id", eventId),
    supabase.from("safety_page_views").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("code_acceptances").select("id", { count: "exact", head: true }).eq("event_id", eventId),
  ]);

  const totalReports = reports.data?.length || 0;
  const totalFeedback = feedback.data?.length || 0;
  const resolvedReports = reports.data?.filter(r => r.status === "resolved").length || 0;
  
  // Calculate average safety rating
  const safetyRatings = feedback.data?.map(f => {
    const ratings = { very_safe: 5, mostly_safe: 4, neutral: 3, somewhat_unsafe: 2, unsafe: 1 };
    return ratings[f.felt_safe as keyof typeof ratings] || 0;
  }) || [];
  const avgSafetyRating = safetyRatings.length > 0 
    ? (safetyRatings.reduce((a, b) => a + b, 0) / safetyRatings.length).toFixed(1)
    : "N/A";

  return {
    reports: totalReports,
    feedback: totalFeedback,
    pageViews: pageViews.count || 0,
    codeAcceptances: codeAcceptances.count || 0,
    resolvedReports,
    responseRate: totalReports > 0 ? ((resolvedReports / totalReports) * 100).toFixed(0) : "0",
    avgSafetyRating,
  };
};

// Get report severity breakdown for charts
export const getReportSeverityBreakdown = async (eventId: string) => {
  const { data: reports } = await supabase
    .from("reports")
    .select("severity")
    .eq("event_id", eventId);

  const breakdown = {
    critical: reports?.filter(r => r.severity === "critical").length || 0,
    high: reports?.filter(r => r.severity === "high").length || 0,
    medium: reports?.filter(r => r.severity === "medium").length || 0,
    low: reports?.filter(r => r.severity === "low").length || 0,
  };

  return Object.entries(breakdown)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
};

// Get feedback safety ratings breakdown
export const getFeedbackSafetyBreakdown = async (eventId: string) => {
  const { data: feedback } = await supabase
    .from("event_feedback")
    .select("felt_safe")
    .eq("event_id", eventId);

  const breakdown = {
    very_safe: feedback?.filter(f => f.felt_safe === "very_safe").length || 0,
    mostly_safe: feedback?.filter(f => f.felt_safe === "mostly_safe").length || 0,
    neutral: feedback?.filter(f => f.felt_safe === "neutral").length || 0,
    somewhat_unsafe: feedback?.filter(f => f.felt_safe === "somewhat_unsafe").length || 0,
    unsafe: feedback?.filter(f => f.felt_safe === "unsafe").length || 0,
  };

  return Object.entries(breakdown)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ 
      name: name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), 
      value 
    }));
};

/**
 * Get count of reports grouped by event
 * Future: Will return { event_id, event_title, count }[]
 */
export async function getReportCountsByEvent(societyId: string) {
  // TODO: Implement with GROUP BY event_id, COUNT(*)
  // Join with events table to get event titles
  // Filter by society_id through events
  return [];
}

/**
 * Get count of reports grouped by category (concern_type)
 * Future: Will return { concern_type, count }[]
 */
export async function getReportCountsByCategory(societyId: string) {
  // TODO: Implement with GROUP BY concern_type, COUNT(*)
  // Filter by society_id through events
  return [];
}

/**
 * Get report submission trends over time
 * Future: Will return daily counts for the specified number of days
 */
export async function getReportTrends(societyId: string, days: number = 30) {
  // TODO: Implement to get daily report counts
  // GROUP BY DATE(submitted_at), COUNT(*)
  // Filter by society_id through events
  // Return data suitable for line chart
  return [];
}

/**
 * Calculate average time to first response
 * Future: Will calculate time from submitted_at to first status change
 * (when status changes from 'new' to anything else)
 */
export async function getAverageResponseTime(societyId: string) {
  // TODO: Implement by:
  // 1. Track status change timestamps (may need new table)
  // 2. Calculate difference between submitted_at and first status change
  // 3. Return average in hours/days
  return null;
}

/**
 * Get resolution rate
 * Future: Will return percentage of reports that are resolved/closed
 */
export async function getResolutionRate(societyId: string) {
  // TODO: Implement
  // (COUNT where status IN ('resolved', 'closed')) / COUNT(*) * 100
  return null;
}

/**
 * Get severity distribution
 * Future: Will return counts grouped by severity level
 */
export async function getSeverityDistribution(societyId: string) {
  // TODO: Implement with GROUP BY severity, COUNT(*)
  return [];
}

/**
 * Get feedback by event
 * Future: Will return feedback counts per event
 */
export async function getFeedbackByEvent(societyId: string) {
  // TODO: Implement with GROUP BY event_id, COUNT(*)
  // Join with events table to get event titles
  // Filter by society_id through events
  return [];
}

/**
 * Get safety rating distribution
 * Future: Will return breakdown of safety ratings
 */
export async function getSafetyRatingDistribution(societyId: string) {
  // TODO: Implement with GROUP BY felt_safe, COUNT(*)
  return { very_safe: 0, mostly_safe: 0, somewhat_safe: 0, unsafe: 0, very_unsafe: 0 };
}

/**
 * Get average safety score
 * Future: Calculate average safety score (1-5 scale)
 * Map ratings to numbers and calculate average
 */
export async function getAverageSafetyScore(societyId: string) {
  // TODO: Implement
  // Map: very_unsafe=1, unsafe=2, somewhat_safe=3, mostly_safe=4, very_safe=5
  // Calculate AVG()
  return null;
}

/**
 * Get CoC acceptance details for an event
 * Returns all society members with their acceptance status
 */
export interface AttendeeAcceptance {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'committee' | 'attendee';
  has_accepted: boolean;
  accepted_at?: string;
  accepted_version?: number;
  code_of_conduct_id?: string;
}

export const getEventCoCAcceptances = async (eventId: string, societyId: string): Promise<AttendeeAcceptance[]> => {
  // Fetch all society members with their profiles
  const { data: membersData } = await supabase
    .from("society_members")
    .select(`
      user_id,
      role,
      profiles!inner(display_name, avatar_url)
    `)
    .eq("society_id", societyId);

  // Fetch code acceptances for this event
  const { data: acceptancesData } = await supabase
    .from("code_acceptances")
    .select("user_id, accepted_at, accepted_version, code_of_conduct_id")
    .eq("event_id", eventId);

  // Create a map of acceptances by user_id
  const acceptancesMap = new Map(
    acceptancesData?.map(a => [a.user_id, a]) || []
  );

  // Merge members with their acceptance status
  const attendeesWithStatus = membersData?.map(member => {
    const acceptance = acceptancesMap.get(member.user_id);
    return {
      user_id: member.user_id,
      display_name: (member.profiles as any)?.display_name || null,
      avatar_url: (member.profiles as any)?.avatar_url || null,
      role: member.role,
      has_accepted: !!acceptance,
      accepted_at: acceptance?.accepted_at,
      accepted_version: acceptance?.accepted_version,
      code_of_conduct_id: acceptance?.code_of_conduct_id,
    };
  }) || [];

  // Sort: committee first, then by name
  return attendeesWithStatus.sort((a, b) => {
    if (a.role !== b.role) {
      return a.role === 'committee' ? -1 : 1;
    }
    return (a.display_name || '').localeCompare(b.display_name || '');
  });
};

/**
 * Calculate acceptance rate percentage
 */
export const calculateAcceptanceRate = (total: number, accepted: number): number => {
  if (total === 0) return 0;
  return Math.round((accepted / total) * 100);
};
