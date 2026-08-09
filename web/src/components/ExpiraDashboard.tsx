import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { Fragment, useCallback, useMemo, useState } from "react";
import ExpiraFilterChips, { type Filter } from "./ExpiraFilterChips";
import ExpiraTable from "./ExpiraTable";
import {
  domainUrgency,
  type Domain,
  type DomainsPayload,
  type LoadState,
} from "./types";

export type { Domain, DomainStatus, DomainsPayload } from "./types";

const LOAD_DOT_CLASSES: Record<LoadState, string> = {
  live: "bg-expira-green",
  loading: "bg-expira-text-3",
  error: "bg-expira-red",
};

function relTime(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return "—";
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export interface ExpiraDashboardProps {
  endpoint?: string;
  soonThreshold?: number;
}

function ExpiraDashboardContent({
  endpoint = "/api/domains",
  soonThreshold = 30,
}: ExpiraDashboardProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [threshold, setThreshold] = useState(soonThreshold);

  const { data, dataUpdatedAt, isError, isPending, refetch } =
    useQuery<DomainsPayload>({
      queryKey: ["domains", endpoint],
      queryFn: async ({ signal }) => {
        const response = await fetch(endpoint, { cache: "no-store", signal });
        if (!response.ok) throw new Error(String(response.status));

        const data = (await response.json()) as DomainsPayload;
        if (!data || !Array.isArray(data.domains))
          throw new Error("unexpected payload");
        return data;
      },
      retry: 1,
    });

  const domains = data?.domains ?? [];
  const load: LoadState = isPending ? "loading" : isError ? "error" : "live";
  const refreshedAt = data?.lastRefreshed
    ? new Date(data.lastRefreshed)
    : dataUpdatedAt
      ? new Date(dataUpdatedAt)
      : null;

  const urgency = useCallback(
    (domain: Domain) => domainUrgency(domain, threshold),
    [threshold],
  );

  const counts = useMemo(() => {
    const c = {
      all: domains.length,
      active: 0,
      soon: 0,
      expired: 0,
      unknown: 0,
    };
    for (const d of domains) {
      if (d.status === "active") c.active++;
      const u = urgency(d);
      if (u === "soon") c.soon++;
      else if (u === "expired") c.expired++;
      else if (u === "unknown") c.unknown++;
    }
    return c;
  }, [domains, urgency]);

  const filteredDomains = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (d: Domain) =>
      filter === "all" ||
      (filter === "active" ? d.status === "active" : urgency(d) === filter);

    return domains.filter((d) => d.name.toLowerCase().includes(q) && match(d));
  }, [domains, query, filter, urgency]);

  const emptyText = `No domains match${query ? ` "${query}"` : ""}${
    filter !== "all" ? " in this view" : ""
  }.`;

  return (
    <div className="min-h-screen bg-expira-bg font-sans text-expira-text [background:radial-gradient(1100px_600px_at_80%_-10%,rgba(167,139,250,.07),transparent_60%),#131316]">
      <div className="mx-auto w-[calc(100%-40px)] max-w-235 pt-14 pb-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.25 text-[17px] font-semibold tracking-[-.01em]">
            <span className="h-2 w-2 rounded-full bg-expira-purple ring-3 ring-expira-purple/18" />
            expira
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.75 font-mono text-[11.5px] tracking-[.02em] text-expira-text-3">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ring-3 ring-expira-green/14 ${LOAD_DOT_CLASSES[load]}`}
              />
              {(load === "error" ? "error " : "checked ") +
                relTime(refreshedAt)}
            </div>
            <button
              type="button"
              className="flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-lg border border-expira-border bg-expira-surface text-expira-text-2 transition-all duration-140 hover:border-expira-focus hover:text-expira-text active:scale-[.94]"
              onClick={() => void refetch()}
              title="Refresh now"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.5 7a5.5 5.5 0 1 1-1.6-3.9" />
                <path d="M12.5 1.5V4H10" />
              </svg>
            </button>
          </div>
        </header>

        <div className="mt-8 mb-7.5 flex items-center gap-7.5">
          {(
            [
              [
                String(counts.all).padStart(2, "0"),
                "Tracked",
                "text-expira-text",
              ],
              [
                String(counts.active).padStart(2, "0"),
                "Active",
                "text-expira-text",
              ],
              [
                String(counts.soon).padStart(2, "0"),
                "Expiring soon",
                counts.soon ? "text-expira-amber" : "text-expira-text",
              ],
              [
                String(counts.expired).padStart(2, "0"),
                "Expired",
                counts.expired ? "text-expira-red" : "text-expira-text",
              ],
            ] as const
          ).map(([value, label, valueColor], i) => (
            <Fragment key={label}>
              {i > 0 && <span className="h-11 w-px bg-expira-border" />}
              <div>
                <div
                  className={`font-mono text-[40px] font-medium leading-none tracking-[-.02em] ${valueColor}`}
                >
                  {value}
                </div>
                <div className="mt-2.25 text-[11px] uppercase tracking-[.13em] text-expira-text-2">
                  {label}
                </div>
              </div>
            </Fragment>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex min-w-60 flex-1 items-center gap-2.25 rounded-[9px] border border-expira-border bg-expira-surface px-[13px] py-[9px] text-expira-text-3 focus-within:border-expira-focus">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <circle cx="6" cy="6" r="4.2" />
              <path d="M9.2 9.2L12.5 12.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search domains…"
              className="min-w-0 flex-1 border-0 bg-transparent font-sans text-[13px] text-expira-text outline-none placeholder:text-expira-text-3"
            />
          </div>
          <div
            title="Highlight domains expiring within…"
            className="flex items-center gap-1 rounded-[9px] border border-expira-border bg-expira-surface py-1 pr-1.5 pl-2.75"
          >
            <span className="mr-0.75 text-[11px] uppercase tracking-[.08em] text-expira-text-3">
              Soon ≤
            </span>
            {[7, 30, 60, 90].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setThreshold(t)}
                className={`cursor-pointer rounded-md border-0 px-2 py-1.25 font-mono text-[12px] transition-all duration-120 ${
                  threshold === t
                    ? "bg-expira-purple/16 text-expira-purple"
                    : "bg-transparent text-expira-text-2"
                }`}
              >
                {t}d
              </button>
            ))}
          </div>
        </div>

        <ExpiraFilterChips
          filter={filter}
          counts={counts}
          onChange={setFilter}
        />

        <ExpiraTable
          domains={filteredDomains}
          totalDomains={domains.length}
          load={load}
          soonThreshold={threshold}
          emptyText={emptyText}
        />

        <footer className="mt-4.5 flex w-full flex-wrap items-center justify-end gap-3 text-[11.5px] text-expira-text-3">
          <span className="inline-flex items-center gap-1">
            <span>Expira · Made with</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="size-4 shrink-0"
              aria-hidden="true"
            >
              <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
            </svg>
            <span>by iwa</span>
          </span>
        </footer>
      </div>
    </div>
  );
}

export default function ExpiraDashboard(props: ExpiraDashboardProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ExpiraDashboardContent {...props} />
    </QueryClientProvider>
  );
}
