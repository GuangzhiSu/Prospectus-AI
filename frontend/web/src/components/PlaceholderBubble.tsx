"use client";

import type { PlaceholderKind, PlaceholderMeta } from "@/lib/prospectus-placeholders";

const KIND_STYLES: Record<
  PlaceholderKind,
  { bg: string; text: string; ring: string }
> = {
  verify: {
    bg: "bg-amber-500/12",
    text: "text-amber-800 dark:text-amber-200",
    ring: "ring-amber-500/25",
  },
  cite: {
    bg: "bg-sky-500/12",
    text: "text-sky-800 dark:text-sky-200",
    ring: "ring-sky-500/25",
  },
  xref: {
    bg: "bg-violet-500/12",
    text: "text-violet-800 dark:text-violet-200",
    ring: "ring-violet-500/25",
  },
  lpd: {
    bg: "bg-[var(--foreground)]/6",
    text: "text-[var(--muted)]",
    ring: "ring-[var(--border)]",
  },
  locked: {
    bg: "bg-rose-500/10",
    text: "text-rose-800 dark:text-rose-200",
    ring: "ring-rose-500/20",
  },
  todo: {
    bg: "bg-[var(--foreground)]/5",
    text: "text-[var(--muted)]",
    ring: "ring-dashed ring-[var(--border)]",
  },
  dd: {
    bg: "bg-orange-500/12",
    text: "text-orange-800 dark:text-orange-200",
    ring: "ring-orange-500/25",
  },
  missing: {
    bg: "bg-orange-500/15",
    text: "text-orange-900 dark:text-orange-100",
    ring: "ring-orange-500/30",
  },
  counsel: {
    bg: "bg-fuchsia-500/12",
    text: "text-fuchsia-800 dark:text-fuchsia-200",
    ring: "ring-fuchsia-500/25",
  },
  info_gap: {
    bg: "bg-[var(--warning)]/12",
    text: "text-[var(--warning)]",
    ring: "ring-[var(--warning)]/25",
  },
  other: {
    bg: "bg-[var(--foreground)]/6",
    text: "text-[var(--muted)]",
    ring: "ring-[var(--border)]",
  },
};

export function PlaceholderBubble({ meta }: { meta: PlaceholderMeta }) {
  const style = KIND_STYLES[meta.kind];

  return (
    <span
      className={`group relative inline-flex max-w-[9rem] align-baseline ml-0.5 ${style.text}`}
    >
      <span
        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-medium leading-tight ring-1 ring-inset whitespace-nowrap ${style.bg} ${style.ring}`}
        tabIndex={0}
        role="note"
        aria-label={meta.tooltip}
      >
        <span
          className="inline-block h-1 w-1 shrink-0 rounded-full bg-current opacity-70"
          aria-hidden
        />
        <span className="truncate">{meta.shortLabel}</span>
      </span>
      <span
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-max max-w-[16rem] -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[10px] font-normal normal-case leading-snug text-[var(--foreground)] shadow-md group-hover:block group-focus-within:block"
        role="tooltip"
      >
        {meta.tooltip}
      </span>
    </span>
  );
}

export default PlaceholderBubble;
