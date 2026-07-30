import {
  X,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Pencil,
  Trash2,
  MoreVertical,
  Search,
  Info,
  TriangleAlert,
  CircleX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const iconRegistry = {
  close: X,
  check: Check,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  add: Plus,
  minus: Minus,
  edit: Pencil,
  delete: Trash2,
  more: MoreVertical,
  search: Search,
  info: Info,
  warning: TriangleAlert,
  error: CircleX,
  success: Check,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof iconRegistry;
