export type Filter = "all" | "active" | "soon" | "expired" | "unknown";

const CHIP_DEFINITIONS = [
  ["all", "All"],
  ["active", "Active"],
  ["soon", "Expiring soon"],
  ["expired", "Expired"],
  ["unknown", "Unknown"],
] as const satisfies readonly [Filter, string][];

const CHIP_STYLES: Record<Filter, { active: string; count: string }> = {
  all: {
    active: "bg-expira-text-2/16 border-expira-text-2/40",
    count: "bg-expira-text-2/22 text-expira-text-2",
  },
  active: {
    active: "bg-expira-purple/16 border-expira-purple/40",
    count: "bg-expira-purple/22 text-expira-purple",
  },
  soon: {
    active: "bg-expira-amber/16 border-expira-amber/40",
    count: "bg-expira-amber/22 text-expira-amber",
  },
  expired: {
    active: "bg-expira-red/16 border-expira-red/40",
    count: "bg-expira-red/22 text-expira-red",
  },
  unknown: {
    active: "bg-expira-gray/16 border-expira-gray/40",
    count: "bg-expira-gray/22 text-expira-gray",
  },
};

export interface ExpiraFilterChipsProps {
  filter: Filter;
  counts: Record<Filter, number>;
  onChange: (filter: Filter) => void;
}

export default function ExpiraFilterChips({ filter, counts, onChange }: ExpiraFilterChipsProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {CHIP_DEFINITIONS.map(([key, label]) => {
        const on = filter === key;
        const styles = CHIP_STYLES[key];

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`inline-flex cursor-pointer items-center gap-[7px] rounded-[20px] border px-[13px] py-[6px] pr-2 font-sans text-[12.5px] font-medium transition-all duration-[140ms] ${
              on ? `${styles.active} text-expira-text` : "border-expira-border bg-expira-surface text-expira-text-2"
            }`}
          >
            {label}
            <span
              className={`min-w-[18px] rounded-[10px] px-[5px] py-px text-center font-mono text-[11px] ${
                on ? styles.count : "bg-expira-surface-2 text-expira-text-3"
              }`}
            >
              {counts[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
