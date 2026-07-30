import { useEffect, type ReactNode } from "react";

import { useWorkspace } from "@/hooks/useWorkspace";

/**
 * Applies the active organization's branding as CSS custom properties on the
 * document root, so every semantic token (bg-primary, text-accent, ...) follows
 * the tenant's palette.
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const { activeMembership } = useWorkspace();
  const branding = activeMembership?.branding ?? null;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const applied: string[] = [];

    const set = (name: string, value: string | null | undefined) => {
      if (!value) return;
      root.style.setProperty(name, value);
      applied.push(name);
    };

    if (branding) {
      set("--primary", branding.primaryColor);
      set("--sidebar-primary", branding.primaryColor);
      set("--ring", branding.primaryColor);
      set("--accent", branding.accentColor);
      set("--sidebar-accent", branding.accentColor);
      if (branding.fontFamily) {
        root.style.setProperty("font-family", branding.fontFamily);
        applied.push("font-family");
      }
    }

    return () => {
      for (const name of applied) root.style.removeProperty(name);
    };
  }, [branding]);

  return <>{children}</>;
}
