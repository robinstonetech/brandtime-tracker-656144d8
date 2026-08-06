import { useEffect, useState } from "react";

import { activeBrowserEnvironment } from "@/integrations/supabase/client";

/**
 * Persistent strip naming the database this app is connected to.
 */
export function EnvironmentBanner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;


  return (
    <div className="w-full bg-amber-500 px-4 py-1 text-center text-xs font-medium tracking-wide text-amber-950">
      Development database — {activeBrowserEnvironment.url || "not configured"}
    </div>
  );
}
