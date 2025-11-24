import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Star, CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Footer } from "@/components/Footer";

interface MultipleChoiceOption {
  id: string;
  text: string;
}

interface FeedbackQuestion {
  id: string;
  question: string;
  question_type: string;
  is_required: boolean;
  display_order: number;
  options?: MultipleChoiceOption[];
  allow_multiple_answers?: boolean;
  placeholder_text?: string;
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [optionalName, setOptionalName] = useState("");
  const [optionalEmail, setOptionalEmail] = useState("");

  useEffect(() => {
    fetchEventAndQuestions();
  }, [societySlug, eventSlug]);

  const fetchEventAndQuestions = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      console.log("Fetching feedback form for:", { societySlug, eventSlug });

      // Try Pattern A first (matching useEvent pattern)
      let { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, title, society_id, slug, societies!inner(name, logo_url, slug)")
        .eq("slug", eventSlug)
        .eq("societies.slug", societySlug)
        .single();

      if (eventError) {
        console.error("Pattern A query failed:", {
          message: eventError.message,
          code: eventError.code,
          details: eventError.details,
          societySlug,
          eventSlug
        });
        
        // Fallback to Pattern B (two separate queries)
        console.log("Attempting fallback query pattern...");
        
        const { data: societyData, error: socErr } = await supabase
          .from("societies")
          .select("id, name, logo_url, slug")
          .eq("slug", societySlug)
          .single();

        if (socErr || !societyData) {
          console.error("Society not found:", societySlug, socErr);
          setLoadError("Event not found");
          return;
        }

        const { data: evtData, error: evtErr } = await supabase
          .from("events")
          .select("id, title, society_id, slug")
          .eq("slug", eventSlug)
          .eq("society_id", societyData.id)
          .single();

        if (evtErr || !evtData) {
          console.error("Event not found:", eventSlug, evtErr);
          setLoadError("Event not found");
          return;
        }

        eventData = {
          ...evtData,
          societies: {
            name: societyData.name,
            logo_url: societyData.logo_url,
            slug: societyData.slug,
          },
        };
      }

      if (!eventData) {
        console.error("No event data returned");
        setLoadError("Event not found");
        return;
      }

      console.log("Event fetched successfully:", eventData);
      setEvent(eventData);

      // Fetch feedback questions (no auth required)
      const { data: questionsData, error: questionsError } = await supabase
        .from("event_feedback_questions")
        .select("*")
        .eq("event_id", eventData.id)
        .order("display_order", { ascending: true });

      if (questionsError) {
        console.error("Questions fetch error:", questionsError);
        throw questionsError;
      }

      console.log(`Loaded ${questionsData?.length || 0} feedback questions`);

      // Parse options from JSON if they exist
      const parsedQuestions = (questionsData || []).map(q => ({
        ...q,
        options: q.options ? (Array.isArray(q.options) ? q.options : JSON.parse(JSON.stringify(q.options))) as MultipleChoiceOption[] : undefined,
      }));
      setQuestions(parsedQuestions);
    } catch (error) {
      console.error("Error fetching feedback form:", error);
      setLoadError("Failed to load feedback form. Please try again later.");
      toast.error("Failed to load feedback form");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    for (const question of questions) {
      if (question.is_required) {
        const answer = answers[question.id];
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          toast.error(`Please answer: ${question.question}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // Get user if logged in (optional)
      const { data: { user } } = await supabase.auth.getUser();
      if (!event) return;

      // Create feedback response (anonymous-friendly)
      const { data: responseData, error: responseError } = await supabase
        .from("feedback_responses")
        .insert({
          event_id: event.id,
          user_id: user?.id || null,
          is_anonymous: isAnonymous || !user,
          submitter_email: (!isAnonymous && optionalEmail) ? optionalEmail : null,
          optional_name: (!isAnonymous && optionalName) ? optionalName : null,
        })
        .select()
        .single();

      if (responseError) throw responseError;

    // Create feedback answers
    const answersToInsert = questions.map(question => {
      const answer = answers[question.id];
      return {
        response_id: responseData.id,
        question_id: question.id,
        answer_text: question.question_type === "text" 
          ? (typeof answer === 'string' ? answer : null)
          : question.question_type === "multiple_choice"
            ? JSON.stringify(
                Array.isArray(answer) 
                  ? answer 
                  : typeof answer === 'string' && answer 
                    ? [answer] 
                    : []
              )
            : null,
        answer_rating: question.question_type === "rating" 
          ? parseInt(typeof answer === 'string' ? answer : '') 
          : null,
      };
    });

      const { error: answersError } = await supabase
        .from("feedback_answers")
        .insert(answersToInsert);

      if (answersError) throw answersError;

      toast.success("Thank you for your feedback!");
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderRatingSelector = (questionId: string, currentValue: string) => {
    const selectedRating = parseInt(currentValue || '0');
    return (
      <div className="flex gap-2 mt-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => setAnswers({ ...answers, [questionId]: rating.toString() })}
            className={`p-2 rounded-lg transition-colors ${
              rating <= selectedRating
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <Star
              className={`h-6 w-6 ${
                rating <= selectedRating ? "fill-current" : ""
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

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
                <h2 className="text-2xl font-bold">
                  {loadError === "Event not found" ? "Event Not Found" : "Unable to Load Form"}
                </h2>
                <p className="text-muted-foreground">{loadError}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/")}>
                    Go to Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
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
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
                <h2 className="text-2xl font-bold">Event Not Found</h2>
                <p className="text-muted-foreground">
                  The feedback form you're looking for doesn't exist or has been removed.
                </p>
                <Button onClick={() => navigate("/")}>
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 flex flex-col">
      <div className="max-w-2xl mx-auto space-y-6 flex-1">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(user ? "/dashboard" : "/")}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {user ? "Back to Dashboard"}
        </Button>

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

        {/* Optional Identity Fields */}
        {!isAnonymous && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="optional-name">Name (Optional)</Label>
                <Input
                  id="optional-name"
                  value={optionalName}
                  onChange={(e) => setOptionalName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="optional-email">Email (Optional)</Label>
                <Input
                  id="optional-email"
                  type="email"
                  value={optionalEmail}
                  onChange={(e) => setOptionalEmail(e.target.value)}
                  placeholder="your.email@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Provide your email if you'd like the committee to follow up with you
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
                      placeholder={question.placeholder_text || "Enter your response..."}
                      className="min-h-[100px]"
                    />
                  ) : question.question_type === "rating" ? (
                    renderRatingSelector(question.id, typeof answers[question.id] === 'string' ? answers[question.id] as string : '')
                  ) : question.question_type === "multiple_choice" ? (
                    question.allow_multiple_answers ? (
                      <div className="space-y-3">
                        {question.options?.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${question.id}-${option.id}`}
                              checked={Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option.id)}
                              onCheckedChange={(checked) => {
                                const currentAnswers = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];
                                const newAnswers = checked
                                  ? [...currentAnswers, option.id]
                                  : currentAnswers.filter(id => id !== option.id);
                                setAnswers({ ...answers, [question.id]: newAnswers });
                              }}
                            />
                            <Label
                              htmlFor={`${question.id}-${option.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {option.text}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <RadioGroup
                        value={typeof answers[question.id] === 'string' ? answers[question.id] as string : ""}
                        onValueChange={(value) =>
                          setAnswers({ ...answers, [question.id]: value })
                        }
                      >
                        {question.options?.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                            <Label
                              htmlFor={`${question.id}-${option.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {option.text}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )
                  ) : null}
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
      <Footer />
    </div>
  );
};

export default Feedback;
