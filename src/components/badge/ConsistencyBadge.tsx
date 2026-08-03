import { forwardRef } from "react";
import { Badge, type BadgeColor, type BadgeProps } from "./Badge";
import type { ConsistencyStatus } from "@/domain/trajectory/ConsistencyTracker";

export interface ConsistencyBadgeProps extends Omit<BadgeProps, "color" | "font"> {
  status: ConsistencyStatus;
}

export const CONSISTENCY_MAP: Record<ConsistencyStatus, { label: string; color: BadgeColor }> = {
  warming_up: { label: "Warming Up", color: "consistencyWarmingUp" },
  dialed_in: { label: "Dialed In", color: "consistencyDialedIn" },
  on_track: { label: "On Track", color: "consistencyOnTrack" },
  finding_footing: { label: "Finding Footing", color: "consistencyFindingFooting" },
  uneven_ground: { label: "Uneven Ground", color: "consistencyUnevenGround" },
  choppy_waters: { label: "Choppy Waters", color: "consistencyChoppyWaters" },
  off_course: { label: "Off Course", color: "consistencyOffCourse" },
  in_the_storm: { label: "In The Storm", color: "consistencyInTheStorm" },
};

export const ConsistencyBadge = forwardRef<HTMLSpanElement, ConsistencyBadgeProps>(
  ({ status, children, ...props }, ref) => {
    const config = CONSISTENCY_MAP[status] ?? CONSISTENCY_MAP.warming_up;

    return (
      <Badge ref={ref} color={config.color} font="mono" {...props}>
        {children ?? config.label}
      </Badge>
    );
  },
);

ConsistencyBadge.displayName = "ConsistencyBadge";
