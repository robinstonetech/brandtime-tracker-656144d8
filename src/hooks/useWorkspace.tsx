import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import { getWorkspace, type Workspace, type WorkspaceMembership } from "@/lib/workspace.functions";

const ACTIVE_ORG_STORAGE_KEY = "rbs-time.active-organization";

type WorkspaceState = {
  workspace: Workspace | undefined;
  isLoading: boolean;
  error: Error | null;
  memberships: WorkspaceMembership[];
  activeMembership: WorkspaceMembership | null;
  setActiveOrganization: (organizationId: string) => void;
  refetch: () => void;
};

const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const fetchWorkspace = useServerFn(getWorkspace);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["workspace"],
    queryFn: async (): Promise<Workspace> => {
      try {
        return await fetchWorkspace();
      } catch (cause) {
        // An expired/missing session makes the protected server fn throw a raw
        // 401 Response, which otherwise surfaces as "Error: [object Response]".
        if (cause instanceof Response) {
          if (cause.status === 401 || cause.status === 403) {
            return { profile: null, memberships: [] };
          }
          throw new Error(`Workspace request failed (${cause.status})`);
        }
        throw cause;
      }
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 60_000,
  });

  const memberships = useMemo(() => query.data?.memberships ?? [], [query.data]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setActiveOrganizationId(window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY));
  }, []);

  const activeMembership = useMemo(() => {
    if (memberships.length === 0) return null;
    return (
      memberships.find((membership) => membership.organizationId === activeOrganizationId) ??
      memberships[0]
    );
  }, [memberships, activeOrganizationId]);

  const value = useMemo<WorkspaceState>(
    () => ({
      workspace: query.data,
      isLoading: query.isLoading,
      error: (query.error as Error | null) ?? null,
      memberships,
      activeMembership,
      setActiveOrganization: (organizationId: string) => {
        setActiveOrganizationId(organizationId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, organizationId);
        }
      },
      refetch: () => {
        void query.refetch();
      },
    }),
    [query, memberships, activeMembership],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceState {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  }
  return context;
}
