import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PatientStatus } from "@repo/db/types";

export function PatientStatusBadge({
  status,
  className = "",
  size = 10,
}: {
  status: PatientStatus;
  className?: string;
  size?: number; // px
}) {
  const { bg, label } = getVisuals(status);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={`Patient status: ${label}`}
            className={`inline-block rounded-full ring-2 ring-white shadow ${className}`}
            style={{
              width: size,
              height: size,
              backgroundColor: bg,
              position: "absolute",
              top: "-6px", // stick out above card
              right: "-6px", // stick out right
            }}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="px-2 py-1 text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getVisuals(status: PatientStatus): { label: string; bg: string } {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", bg: "#16A34A" }; // MEDICAL GREEN (not same as staff green)
    case "INACTIVE":
      return { label: "Inactive", bg: "#DC2626" }; // ALERT RED (distinct from card red)
    default:
      return { label: "Unknown", bg: "#6B7280" }; // solid gray
  }
}
