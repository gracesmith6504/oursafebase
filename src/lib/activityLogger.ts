import { supabase } from "@/integrations/supabase/client";

export type ActivityType = 
  | 'login'
  | 'view_event'
  | 'submit_report'
  | 'update_report'
  | 'view_dashboard'
  | 'create_event'
  | 'accept_coc'
  | 'submit_feedback'
  | 'view_reports'
  | 'view_members';

interface LogActivityParams {
  activityType: ActivityType;
  societyId?: string;
  eventId?: string;
  metadata?: Record<string, any>;
}

export const logActivity = async ({
  activityType,
  societyId,
  eventId,
  metadata = {}
}: LogActivityParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await supabase.from('user_activity_logs').insert({
      user_id: user.id,
      activity_type: activityType,
      society_id: societyId || null,
      event_id: eventId || null,
      metadata: {
        ...metadata,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // Silently fail - don't disrupt user experience for logging errors
    console.error('Failed to log activity:', error);
  }
};

export const updateLastLogin = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);
    
    await logActivity({ activityType: 'login' });
  } catch (error) {
    console.error('Failed to update last login:', error);
  }
};
