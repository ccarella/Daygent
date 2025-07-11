import { useAuthStore } from "@/stores/auth.store";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Organization } from "@/types/organization";

const supabase = createClient();

export function useOrganization() {
  const { user, activeOrganization, setActiveOrganization } = useAuthStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setIsLoading(false);
      return;
    }

    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadOrganizations = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select(
          `
          *,
          organization_members!inner(
            user_id,
            role
          )
        `,
        )
        .eq("organization_members.user_id", user.id);

      if (error) throw error;

      setOrganizations(data || []);

      // Set active organization if not already set
      if (data && data.length > 0 && !activeOrganization) {
        // Check localStorage for saved preference
        const savedOrgId = localStorage.getItem("activeOrganizationId");
        const savedOrg = data.find((org) => org.id === savedOrgId);

        if (savedOrg) {
          setActiveOrganization(savedOrg);
        } else {
          // Default to first organization (likely the owner one)
          const ownerOrg =
            data.find((org) => org.organization_members[0].role === "owner") ||
            data[0];
          setActiveOrganization(ownerOrg);
        }
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    activeOrganization,
    organizations,
    isLoading,
    setActiveOrganization,
    reload: loadOrganizations,
  };
}
