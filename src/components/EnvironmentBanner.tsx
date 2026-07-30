import { useEffect, useState } from "react";

import { activeBrowserEnvironment } from "@/integrations/supabase/client";

/**
 * Persistent warning strip shown whenever the app is NOT pointed at the
 * production database, so dev data can never be mistaken for live data.
 */
export function EnvironmentBanner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || activeBrowserEnvironment.name === "production") return null;

  return (
    <div className="w-full bg-amber-500 px-4 py-1 text-center text-xs font-medium tracking-wide text-amber-950">
      Development database — {activeBrowserEnvironment.url || "not configured"}
    </div>
  );
}
