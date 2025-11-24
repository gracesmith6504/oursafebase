import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquare, TrendingUp, Star, ChevronDown, Download, FileText, Filter, X, CheckCircle2 } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";

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
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());

  const toggleQuestion = (questionId: string) => {
    setOpenQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const toggleAnswerExpanded = (answerId: string) => {
    setExpandedAnswers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(answerId)) {
        newSet.delete(answerId);
      } else {
        newSet.add(answerId);
      }
      return newSet;
    });
  };

  // Calculate multiple choice statistics
  const getMultipleChoiceStats = (group: GroupedResponse) => {
    if (!group.options) return null;
    
    const optionCounts: Record<string, number> = {};
    group.options.forEach(opt => optionCounts[opt.id] = 0);
    
    group.answers.forEach(answer => {
      if (answer.answerText) {
        try {
          const selectedIds = JSON.parse(answer.answerText);
          selectedIds.forEach((id: string) => {
            if (optionCounts[id] !== undefined) {
              optionCounts[id]++;
            }
          });
        } catch (e) {
          console.error("Error parsing multiple choice answer", e);
        }
      }
    });
    
    const totalResponses = group.answers.length;
    return group.options.map(option => ({
      ...option,
      count: optionCounts[option.id],
      percentage: totalResponses > 0 ? (optionCounts[option.id] / totalResponses) * 100 : 0,
    }));
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
            <div className="text-2xl font-bold">
              {activeFilterCount > 0 ? filteredMetrics.totalResponses : metrics.totalResponses}
            </div>
            {activeFilterCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                of {metrics.totalResponses} total
              </p>
            )}
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
            <div className="text-2xl font-bold">
              {activeFilterCount > 0 
                ? filteredMetrics.averageRating.toFixed(1)
                : metrics.averageRating.toFixed(1)}/5
            </div>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= Math.round(activeFilterCount > 0 ? filteredMetrics.averageRating : metrics.averageRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Questions Average Scores - Simple List */}
      {filteredRatingAverages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rating Questions Average Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredRatingAverages.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b last:border-b-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.question}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.count} response{item.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(Math.round(item.average * 10) / 10)}
                  </div>
                </div>
              ))}
            </div>
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
            <div className="flex flex-wrap gap-2 items-center">
              {textThemes.map((theme) => (
                <Badge key={theme.word} variant="secondary" className="text-sm px-3 py-1 whitespace-nowrap">
                  {theme.word} ({theme.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Responses
            </CardTitle>
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Rating</label>
              <Select value={selectedRating} onValueChange={setSelectedRating}>
                <SelectTrigger>
                  <SelectValue placeholder="All Ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Question</label>
              <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
                <SelectTrigger>
                  <SelectValue placeholder="All Questions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Questions</SelectItem>
                  {groupedResponses.map((group) => (
                    <SelectItem key={group.questionId} value={group.questionId}>
                      {group.question.substring(0, 50)}
                      {group.question.length > 50 ? "..." : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Responses */}
      <Card>
        <CardHeader>
          <CardTitle>All Responses by Question</CardTitle>
          {activeFilterCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Showing {filteredResponses.reduce((sum, group) => sum + group.answers.length, 0)} filtered responses
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredResponses.map((group) => (
              <Collapsible
                key={group.questionId}
                open={openQuestions.includes(group.questionId)}
                onOpenChange={() => toggleQuestion(group.questionId)}
              >
                <Card className="border-2">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 text-left space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="shrink-0">
                              {group.questionType === "rating" 
                                ? "Rating" 
                                : group.questionType === "multiple_choice"
                                ? "Multiple Choice"
                                : "Text"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {group.answers.length} response{group.answers.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <p className="font-medium text-base break-words pr-8">{group.question}</p>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 text-muted-foreground transition-transform shrink-0 mt-1 ${
                            openQuestions.includes(group.questionId) ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-4 space-y-6">
                      {/* Multiple Choice Summary */}
                      {group.questionType === "multiple_choice" && group.options && (
                        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Response Summary
                          </h4>
                          <div className="space-y-3">
                            {getMultipleChoiceStats(group)?.map((option) => (
                              <div key={option.id} className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium break-words flex-1 pr-4">{option.text}</span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-muted-foreground">{option.count}</span>
                                    <span className="font-semibold min-w-[3rem] text-right">
                                      {option.percentage.toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                                <Progress value={option.percentage} className="h-2" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Individual Answers */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm">Individual Responses</h4>
                        <div className="space-y-3">
                          {group.answers.map((answer) => {
                            const isLongText = answer.answerText && answer.answerText.length > 200;
                            const isExpanded = expandedAnswers.has(answer.answerId);
                            const displayText = isLongText && !isExpanded 
                              ? answer.answerText.substring(0, 200) + "..." 
                              : answer.answerText;

                            return (
                              <div
                                key={answer.answerId}
                                className="border-l-2 border-primary/20 pl-4 py-2 space-y-2"
                              >
                                <div className="space-y-2">
                                  {/* Rating Display */}
                                  {answer.answerRating !== undefined && (
                                    <div>{renderStars(answer.answerRating)}</div>
                                  )}

                                  {/* Multiple Choice Display */}
                                  {group.questionType === "multiple_choice" && group.options && answer.answerText && (
                                    <div className="flex flex-wrap gap-2">
                                      {(() => {
                                        try {
                                          const selectedIds = JSON.parse(answer.answerText);
                                          return group.options
                                            .filter(opt => selectedIds.includes(opt.id))
                                            .map(option => (
                                              <Badge key={option.id} variant="secondary" className="gap-1.5">
                                                <CheckCircle2 className="h-3 w-3" />
                                                {option.text}
                                              </Badge>
                                            ));
                                        } catch (e) {
                                          return null;
                                        }
                                      })()}
                                    </div>
                                  )}

                                  {/* Text Display */}
                                  {group.questionType === "text" && answer.answerText && (
                                    <div className="space-y-2">
                                      <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                                        {displayText}
                                      </p>
                                      {isLongText && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleAnswerExpanded(answer.answerId);
                                          }}
                                          className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                                        >
                                          {isExpanded ? "Show less" : "Show more"}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Metadata */}
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{format(new Date(answer.submittedAt), "MMM d, h:mm a")}</span>
                                  {answer.isAnonymous ? (
                                    <Badge variant="secondary" className="text-xs">Anonymous</Badge>
                                  ) : answer.submitterName ? (
                                    <span>• {answer.submitterName}</span>
                                  ) : answer.userEmail ? (
                                    <span>• {answer.userEmail}</span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
