/**
 * Feedback Analytics Utilities
 * 
 * Functions for fetching and processing post-event feedback data
 */

import { supabase } from "@/integrations/supabase/client";

export interface FeedbackMetrics {
  totalResponses: number;
  responseRate: number;
  averageRating: number;
}

export interface RatingAverage {
  question: string;
  average: number;
  count: number;
}

export interface TextTheme {
  word: string;
  count: number;
}

export interface GroupedResponse {
  questionId: string;
  question: string;
  questionType: string;
  answers: Array<{
    answerId: string;
    answerText?: string;
    answerRating?: number;
    submittedAt: string;
    isAnonymous: boolean;
    userEmail?: string;
  }>;
}

// Common words to filter out from text analysis
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
  'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
  'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
  'one', 'all', 'would', 'there', 'their', 'was', 'were', 'is', 'are', 'been',
  'has', 'had', 'can', 'could', 'should', 'would', 'may', 'might', 'must'
]);

/**
 * Get overall feedback metrics for an event
 */
export async function getFeedbackMetrics(eventId: string): Promise<FeedbackMetrics> {
  // Get total responses
  const { data: responses, error: responsesError } = await supabase
    .from("feedback_responses")
    .select("id, submitted_at")
    .eq("event_id", eventId);

  if (responsesError) throw responsesError;

  const totalResponses = responses?.length || 0;

  // Get total code acceptances for response rate
  const { count: codeAcceptances } = await supabase
    .from("code_acceptances")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const responseRate = codeAcceptances && codeAcceptances > 0
    ? (totalResponses / codeAcceptances) * 100
    : 0;

  // Get all rating answers to calculate average
  const { data: ratingAnswers } = await supabase
    .from("feedback_answers")
    .select(`
      answer_rating,
      response_id
    `)
    .not("answer_rating", "is", null)
    .in("response_id", responses?.map(r => r.id) || []);

  const ratings = ratingAnswers?.map(a => a.answer_rating).filter(r => r !== null) || [];
  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + (r || 0), 0) / ratings.length
    : 0;

  return {
    totalResponses,
    responseRate: Math.round(responseRate),
    averageRating: Math.round(averageRating * 10) / 10,
  };
}

/**
 * Get average rating for each rating question
 */
export async function getRatingAverages(eventId: string): Promise<RatingAverage[]> {
  // Get all rating questions
  const { data: questions } = await supabase
    .from("event_feedback_questions")
    .select("id, question")
    .eq("event_id", eventId)
    .eq("question_type", "rating")
    .order("display_order");

  if (!questions || questions.length === 0) return [];

  // Get all responses for this event
  const { data: responses } = await supabase
    .from("feedback_responses")
    .select("id")
    .eq("event_id", eventId);

  const responseIds = responses?.map(r => r.id) || [];

  // Get answers for all rating questions
  const { data: answers } = await supabase
    .from("feedback_answers")
    .select("question_id, answer_rating")
    .in("response_id", responseIds)
    .in("question_id", questions.map(q => q.id))
    .not("answer_rating", "is", null);

  // Calculate averages
  const averages: RatingAverage[] = questions.map(question => {
    const questionAnswers = answers?.filter(a => a.question_id === question.id) || [];
    const ratings = questionAnswers.map(a => a.answer_rating).filter(r => r !== null) as number[];
    
    const average = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    return {
      question: question.question,
      average: Math.round(average * 10) / 10,
      count: ratings.length,
    };
  });

  return averages.filter(a => a.count > 0);
}

/**
 * Extract common themes from text answers
 */
export async function getTextAnswerThemes(eventId: string): Promise<TextTheme[]> {
  // Get all text questions
  const { data: questions } = await supabase
    .from("event_feedback_questions")
    .select("id")
    .eq("event_id", eventId)
    .eq("question_type", "text");

  if (!questions || questions.length === 0) return [];

  // Get all responses for this event
  const { data: responses } = await supabase
    .from("feedback_responses")
    .select("id")
    .eq("event_id", eventId);

  const responseIds = responses?.map(r => r.id) || [];

  // Get all text answers
  const { data: answers } = await supabase
    .from("feedback_answers")
    .select("answer_text")
    .in("response_id", responseIds)
    .in("question_id", questions.map(q => q.id))
    .not("answer_text", "is", null);

  if (!answers || answers.length === 0) return [];

  // Simple word frequency analysis
  const wordFrequency: Record<string, number> = {};
  
  answers.forEach(answer => {
    if (!answer.answer_text) return;
    
    const words = answer.answer_text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 3 && !STOP_WORDS.has(word));

    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
  });

  // Convert to array and sort by frequency
  const themes: TextTheme[] = Object.entries(wordFrequency)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8 themes

  return themes;
}

/**
 * Get all responses grouped by question
 */
export async function getGroupedResponses(eventId: string): Promise<GroupedResponse[]> {
  // Get all questions for this event
  const { data: questions } = await supabase
    .from("event_feedback_questions")
    .select("id, question, question_type")
    .eq("event_id", eventId)
    .order("display_order");

  if (!questions || questions.length === 0) return [];

  // Get all responses with user info
  const { data: responses } = await supabase
    .from("feedback_responses")
    .select("id, submitted_at, is_anonymous, user_id")
    .eq("event_id", eventId)
    .order("submitted_at", { ascending: false });

  if (!responses || responses.length === 0) return [];

  // Get user emails for non-anonymous responses
  const userIds = responses
    .filter(r => !r.is_anonymous && r.user_id)
    .map(r => r.user_id) as string[];

  let userEmails: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .in("id", userIds);

    if (users) {
      // Get emails from auth.users via RPC or direct query
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const emailMap = new Map(authUsers.users.map(u => [u.id, u.email || '']));
      
      users.forEach(user => {
        const email = emailMap.get(user.id);
        if (email) {
          userEmails[user.id] = email;
        }
      });
    }
  }

  const responseIds = responses.map(r => r.id);

  // Get all answers
  const { data: answers } = await supabase
    .from("feedback_answers")
    .select("id, question_id, answer_text, answer_rating, response_id")
    .in("response_id", responseIds);

  // Group by question
  const grouped: GroupedResponse[] = questions.map(question => {
    const questionAnswers = answers?.filter(a => a.question_id === question.id) || [];
    
    return {
      questionId: question.id,
      question: question.question,
      questionType: question.question_type,
      answers: questionAnswers.map(answer => {
        const response = responses.find(r => r.id === answer.response_id);
        const userEmail = response?.user_id && !response.is_anonymous 
          ? userEmails[response.user_id] 
          : undefined;
        
        return {
          answerId: answer.id,
          answerText: answer.answer_text || undefined,
          answerRating: answer.answer_rating || undefined,
          submittedAt: response?.submitted_at || "",
          isAnonymous: response?.is_anonymous || false,
          userEmail,
        };
      }),
    };
  });

  return grouped.filter(g => g.answers.length > 0);
}
