import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Package } from "lucide-react";
import LostFoundDialog from "./LostFoundDialog";

interface LostFoundSectionProps {
  eventId: string;
}

const LostFoundSection = ({ eventId }: LostFoundSectionProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"lost" | "found">("lost");

  const handleOpenDialog = (type: "lost" | "found") => {
    setDialogType(type);
    setDialogOpen(true);
  };

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Lost & Found
          </CardTitle>
          <CardDescription>
            Lost something or found something? Let the organisers know.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-colors"
              onClick={() => handleOpenDialog("lost")}
            >
              <Search className="h-5 w-5" />
              <span className="text-sm font-medium">I lost something</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-colors"
              onClick={() => handleOpenDialog("found")}
            >
              <Package className="h-5 w-5" />
              <span className="text-sm font-medium">I found something</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <LostFoundDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        eventId={eventId}
        initialType={dialogType}
      />
    </>
  );
};

export default LostFoundSection;
