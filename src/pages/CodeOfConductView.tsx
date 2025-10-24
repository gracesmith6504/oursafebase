import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const CodeOfConductView = () => {
  const { cocId } = useParams<{ cocId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchCoCFile = async () => {
      if (!cocId) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const { data: cocData, error: cocError } = await supabase
          .from("code_of_conduct")
          .select("file_url, content")
          .eq("id", cocId)
          .maybeSingle();

        if (cocError || !cocData) {
          setError(true);
          setLoading(false);
          return;
        }

        // If it has a file URL, redirect to it
        if (cocData.file_url) {
          setTimeout(() => {
            window.location.href = cocData.file_url!;
          }, 500);
        } else {
          // Text-based CoC - no file to redirect to
          setError(true);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching CoC:", err);
        setError(true);
        setLoading(false);
      }
    };

    fetchCoCFile();
  }, [cocId]);

  if (error) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading Code of Conduct..." : "Redirecting to document..."}
        </p>
      </div>
    </div>
  );
};

export default CodeOfConductView;
