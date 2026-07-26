import {
  X,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const iconRegistry = {
  close: X,
  check: Check,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  more: MoreVertical,
  search: Search,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof iconRegistry;
