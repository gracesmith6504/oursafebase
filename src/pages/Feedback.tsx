import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Star, CheckCircle2 } from "lucide-react";
import { ProtectedRoute } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";

interface FeedbackQuestion {
  id: string;
  question: string;
  question_type: string;
  is_required: boolean;
  display_order: number;
}

interface Event {
  id: string;
  title: string;
  society_id: string;
  societies: {
    name: string;
    logo_url: string | null;
  };
}

const Feedback = () => {
  const { societySlug, eventSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    fetchEventAndQuestions();
  }, [societySlug, eventSlug]);

  const fetchEventAndQuestions = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to submit feedback");
        navigate("/auth");
        return;
      }

      // Fetch event by slug
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(`
          id,
          title,
          society_id,
          societies (
            name,
            logo_url
          )
        `)
        .eq("slug", eventSlug)
        .single();

      if (eventError || !eventData) {
        toast.error("Event not found");
        navigate("/");
        return;
      }

      setEvent(eventData);

      // Check if user is a member of the society
      const { data: memberData } = await supabase
        .from("society_members")
        .select("id")
        .eq("society_id", eventData.society_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!memberData) {
        toast.error("You must be a member of this society to submit feedback");
        navigate(`/${societySlug}/${eventSlug}`);
        return;
      }

      setIsMember(true);

      // Check if user has already submitted feedback
      const { data: existingResponse } = await supabase
        .from("feedback_responses")
        .select("id")
        .eq("event_id", eventData.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingResponse) {
        setSubmitted(true);
        return;
      }

      // Fetch feedback questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("event_feedback_questions")
        .select("*")
        .eq("event_id", eventData.id)
        .order("display_order", { ascending: true });

      if (questionsError) throw questionsError;

      setQuestions(questionsData || []);
    } catch (error) {
      console.error("Error fetching feedback form:", error);
      toast.error("Failed to load feedback form");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    for (const question of questions) {
      if (question.is_required && !answers[question.id]) {
        toast.error(`Please answer: ${question.question}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !event) return;

      // Create feedback response
      const { data: responseData, error: responseError } = await supabase
        .from("feedback_responses")
        .insert({
          event_id: event.id,
          user_id: isAnonymous ? null : user.id,
          is_anonymous: isAnonymous,
        })
        .select()
        .single();

      if (responseError) throw responseError;

      // Create feedback answers
      const answersToInsert = questions.map(question => ({
        response_id: responseData.id,
        question_id: question.id,
        answer_text: question.question_type === "text" ? answers[question.id] : null,
        answer_rating: question.question_type === "rating" ? parseInt(answers[question.id]) : null,
      }));

      const { error: answersError } = await supabase
        .from("feedback_answers")
        .insert(answersToInsert);

      if (answersError) throw answersError;

      toast.success("Feedback submitted successfully!");
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const renderRatingSelector = (questionId: string, currentValue: string) => {
    return (
      <div className="flex gap-2 mt-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => setAnswers({ ...answers, [questionId]: rating.toString() })}
            className={`p-2 rounded-lg transition-colors ${
              currentValue === rating.toString()
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <Star
              className={`h-6 w-6 ${
                currentValue === rating.toString() ? "fill-current" : ""
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Thank you for your feedback!</h2>
              <p className="text-muted-foreground">
                Your response has been submitted successfully.
              </p>
              <Button onClick={() => navigate(`/${societySlug}/${eventSlug}`)}>
                Return to Event
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event || !isMember) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-4">
              {event.societies.logo_url && (
                <img
                  src={event.societies.logo_url}
                  alt={event.societies.name}
                  className="h-16 w-16 object-contain rounded-lg"
                />
              )}
              <div>
                <CardTitle className="text-2xl">{event.title}</CardTitle>
                <CardDescription className="text-lg">
                  {event.societies.name}
                </CardDescription>
              </div>
            </div>
            <p className="text-muted-foreground">
              We value your feedback! Please take a moment to share your experience.
            </p>
          </CardHeader>
        </Card>

        {/* Anonymous Toggle */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="anonymous-mode" className="text-base font-medium">
                  Submit Anonymously
                </Label>
                <p className="text-sm text-muted-foreground">
                  Your identity will not be shared with the organizers
                </p>
              </div>
              <Switch
                id="anonymous-mode"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        {questions.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No feedback questions available for this event.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Feedback Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label htmlFor={question.id} className="text-base">
                    {question.question}
                    {question.is_required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  {question.question_type === "text" ? (
                    <Textarea
                      id={question.id}
                      value={answers[question.id] || ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [question.id]: e.target.value })
                      }
                      placeholder="Enter your response..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    renderRatingSelector(question.id, answers[question.id])
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        {questions.length > 0 && (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default () => (
  <ProtectedRoute>
    <Feedback />
  </ProtectedRoute>
);
