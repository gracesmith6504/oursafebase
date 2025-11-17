import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList } from "recharts";
import { MessageSquare, TrendingUp, Star, ChevronDown, Download, FileText, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { FeedbackMetrics, RatingAverage, TextTheme, GroupedResponse } from "@/lib/feedbackAnalytics";
import { exportFeedbackAsCSV, exportFeedbackAsPDF } from "@/lib/feedbackExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FeedbackAnalyticsSectionProps {
  eventName: string;
  societyName: string;
  metrics: FeedbackMetrics;
  ratingAverages: RatingAverage[];
  textThemes: TextTheme[];
  groupedResponses: GroupedResponse[];
}

const RATING_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

export const FeedbackAnalyticsSection = ({
  eventName,
  societyName,
  metrics,
  ratingAverages,
  textThemes,
  groupedResponses,
}: FeedbackAnalyticsSectionProps) => {
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [selectedQuestion, setSelectedQuestion] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const toggleQuestion = (questionId: string) => {
    setOpenQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  // Filter responses based on selected filters
  const filteredResponses = useMemo(() => {
    let filtered = groupedResponses;

    // Filter by rating
    if (selectedRating !== "all") {
      const ratingValue = parseInt(selectedRating);
      filtered = filtered.map(group => ({
        ...group,
        answers: group.answers.filter(answer => 
          group.questionType === "rating" && answer.answerRating === ratingValue
        )
      })).filter(group => group.answers.length > 0);
    }

    // Filter by question
    if (selectedQuestion !== "all") {
      filtered = filtered.filter(group => group.questionId === selectedQuestion);
    }

    return filtered;
  }, [groupedResponses, selectedRating, selectedQuestion]);

  // Calculate filtered metrics
  const filteredMetrics = useMemo(() => {
    const totalFilteredResponses = filteredResponses.reduce(
      (sum, group) => sum + group.answers.length, 
      0
    );
    
    const ratingAnswers = filteredResponses
      .filter(group => group.questionType === "rating")
      .flatMap(group => group.answers.map(a => a.answerRating || 0));
    
    const avgRating = ratingAnswers.length > 0
      ? ratingAnswers.reduce((sum, r) => sum + r, 0) / ratingAnswers.length
      : 0;

    return {
      totalResponses: totalFilteredResponses,
      averageRating: Math.round(avgRating * 10) / 10,
    };
  }, [filteredResponses]);

  // Update rating averages based on filters
  const filteredRatingAverages = useMemo(() => {
    if (selectedRating === "all" && selectedQuestion === "all") {
      return ratingAverages;
    }

    return filteredResponses
      .filter(group => group.questionType === "rating")
      .map(group => {
        const ratings = group.answers
          .map(a => a.answerRating || 0)
          .filter(r => r > 0);
        
        return {
          question: group.question,
          average: ratings.length > 0 
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
            : 0,
          count: ratings.length
        };
      });
  }, [filteredResponses, ratingAverages, selectedRating, selectedQuestion]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      exportFeedbackAsCSV({
        eventName,
        societyName,
        exportDate: format(new Date(), "MMMM dd, yyyy"),
        metrics,
        ratingAverages,
        textThemes,
        groupedResponses: filteredResponses,
      });
      toast.success("Feedback data exported as CSV");
    } catch (error) {
      toast.error("Failed to export CSV");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      exportFeedbackAsPDF({
        eventName,
        societyName,
        exportDate: format(new Date(), "MMMM dd, yyyy"),
        metrics,
        ratingAverages,
        textThemes,
        groupedResponses: filteredResponses,
      });
      toast.success("Opening print dialog for PDF export");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export PDF");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setSelectedRating("all");
    setSelectedQuestion("all");
  };

  const activeFilterCount = [
    selectedRating !== "all",
    selectedQuestion !== "all"
  ].filter(Boolean).length;

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 sm:h-4 sm:w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        ))}
        <span className="ml-2 text-xs sm:text-sm font-medium">{rating}</span>
      </div>
    );
  };

  if (metrics.totalResponses === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No feedback responses yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Post-Event Feedback Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive analysis of attendee feedback
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isExporting} className="gap-2">
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export Report"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
              <FileText className="h-4 w-4" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalResponses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responseRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Of attendees who accepted CoC
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageRating.toFixed(1)}/5</div>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= Math.round(metrics.averageRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Averages Chart */}
      {ratingAverages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rating Questions Average Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                average: {
                  label: "Average Rating",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ratingAverages}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" domain={[0, 5]} />
                  <YAxis
                    type="category"
                    dataKey="question"
                    width={200}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="average"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Common Themes */}
      {textThemes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Common Themes in Text Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {textThemes.map((theme) => (
                <Badge key={theme.word} variant="secondary" className="text-sm">
                  {theme.word} ({theme.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Responses */}
      <Card>
        <CardHeader>
          <CardTitle>All Responses by Question</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {groupedResponses.map((group) => (
                <Collapsible
                  key={group.questionId}
                  open={openQuestions.includes(group.questionId)}
                  onOpenChange={() => toggleQuestion(group.questionId)}
                >
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-start gap-3 text-left">
                          <Badge variant="outline" className="mt-1">
                            {group.questionType === "rating" ? "Rating" : "Text"}
                          </Badge>
                          <div>
                            <p className="font-medium">{group.question}</p>
                            <p className="text-sm text-muted-foreground">
                              {group.answers.length} response{group.answers.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 text-muted-foreground transition-transform ${
                            openQuestions.includes(group.questionId) ? "rotate-180" : ""
                          }`}
                        />
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {group.answers.map((answer) => (
                            <div
                              key={answer.answerId}
                              className="border-l-2 border-border pl-4 py-2"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  {answer.answerRating !== undefined ? (
                                    renderStars(answer.answerRating)
                                  ) : (
                                    <p className="text-sm">{answer.answerText}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(answer.submittedAt), "MMM d, h:mm a")}
                                  </p>
                                  {answer.isAnonymous && (
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                      Anonymous
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
