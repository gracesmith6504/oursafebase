import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "./AuthContext";

export const useCommitteeRole = (societyId: string | undefined) => {
  const { user } = useAuthContext();
  const [isCommittee, setIsCommittee] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !societyId) {
      setIsCommittee(false);
      setLoading(false);
      return;
    }

    const checkRole = async () => {
      const { data } = await supabase
        .from("society_members")
        .select("role")
        .eq("society_id", societyId)
        .eq("user_id", user.id)
        .single();

      setIsCommittee(data?.role === "committee");
      setLoading(false);
    };

    checkRole();
  }, [user, societyId]);

  return { isCommittee, loading };
};
