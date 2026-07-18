import { cn } from "@/lib/utils";

type Props = {
  slot: "top-banner" | "bottom-banner" | "left-sidebar" | "right-sidebar" | "processing-banner";
  className?: string;
};

const dims: Record<Props["slot"], { label: string; box: string }> = {
  "top-banner": { label: "Advertisement", box: "h-24 sm:h-28" },
  "bottom-banner": { label: "Advertisement", box: "h-24 sm:h-28" },
  "left-sidebar": { label: "Advertisement", box: "min-h-[600px] w-full" },
  "right-sidebar": { label: "Advertisement", box: "min-h-[600px] w-full" },
  "processing-banner": { label: "Advertisement", box: "h-20" },
};

export function AdPlaceholder({ slot, className }: Props) {
  const d = dims[slot];
  return (
    <div
      aria-label={d.label}
      role="complementary"
      className={cn(
        "flex w-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70",
        d.box,
        className,
      )}
    >
      {d.label}
    </div>
  );
}
