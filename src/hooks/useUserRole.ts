import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "admin" | "staff_cd" | "staff_medpro" | "staff_ms" | "staff_cc" | "requester";

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) throw error;

        setRoles(data?.map((r) => r.role as UserRole) || []);
      } catch (error) {
        console.error("Error fetching roles:", error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: UserRole) => roles.includes(role);
  const isAdmin = hasRole("admin");
  const isStaff = roles.some(r => r.startsWith("staff_"));
  const isRequester = hasRole("requester");
  
  const getStaffDivision = (): "CD" | "MEDPRO" | "MS" | "CC" | null => {
    if (hasRole("staff_cd")) return "CD";
    if (hasRole("staff_medpro")) return "MEDPRO";
    if (hasRole("staff_ms")) return "MS";
    if (hasRole("staff_cc")) return "CC";
    return null;
  };

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isStaff,
    isRequester,
    getStaffDivision,
  };
};
