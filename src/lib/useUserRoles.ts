import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export interface Membership {
  society: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  role: "committee" | "attendee";
}

export const useUserRoles = () => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    const fetchMemberships = async () => {
      const { data, error } = await supabase
        .from("society_members")
        .select("role, society:societies(id, name, slug, description)")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching memberships:", error);
        setMemberships([]);
      } else {
        setMemberships(
          data
            .map((item: any) => ({
              society: item.society,
              role: item.role,
            }))
            .filter((m) => m.society)
        );
      }
      setLoading(false);
    };

    fetchMemberships();
  }, [user]);

  const hasCommittee = memberships.some((m) => m.role === "committee");
  const hasAttendee = memberships.some((m) => m.role === "attendee");

  return { memberships, hasCommittee, hasAttendee, loading };
};
