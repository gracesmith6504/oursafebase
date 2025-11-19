import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionErrorFallbackProps {
  sectionName: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export const SectionErrorFallback = ({ 
  sectionName, 
  onRetry,
  showRetry = false 
}: SectionErrorFallbackProps) => {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive text-base">
          <AlertCircle className="h-5 w-5" />
          Failed to Load {sectionName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          This section couldn't be displayed. Other parts of the page are still available.
        </p>
        {showRetry && onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
