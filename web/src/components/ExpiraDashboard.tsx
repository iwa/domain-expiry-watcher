import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import ExpiraTable from "./ExpiraTable";
import { C, hexA, MONO } from "./styles";
import { domainUrgency, type Domain, type DomainsPayload, type LoadState } from "./types";

export type { Domain, DomainStatus, DomainsPayload } from "./types";

type Filter = "all" | "active" | "soon" | "expired" | "unknown";

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

  const { data, dataUpdatedAt, isError, isPending, refetch } = useQuery<DomainsPayload>({
    queryKey: ["domains", endpoint],
    queryFn: async ({ signal }) => {
      const response = await fetch(endpoint, { cache: "no-store", signal });
      if (!response.ok) throw new Error(String(response.status));

      const data = (await response.json()) as DomainsPayload;
      if (!data || !Array.isArray(data.domains)) throw new Error("unexpected payload");
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

  const urgency = useCallback((domain: Domain) => domainUrgency(domain, threshold), [threshold]);

  const counts = useMemo(() => {
    const c = { all: domains.length, active: 0, soon: 0, expired: 0, unknown: 0 };
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
      filter === "all" || (filter === "active" ? d.status === "active" : urgency(d) === filter);

    return domains.filter((d) => d.name.toLowerCase().includes(q) && match(d));
  }, [domains, query, filter, urgency]);

  const chips = (
    [
      ["all", "All", C.text2],
      ["active", "Active", C.purple],
      ["soon", "Expiring soon", C.amber],
      ["expired", "Expired", C.red],
      ["unknown", "Unknown", C.gray],
    ] as const
  ).map(([k, label, accent]) => {
    const on = filter === k;
    return {
      key: k,
      label,
      count: counts[k],
      onClick: () => setFilter(k),
      bg: on ? hexA(accent, 0.16) : C.surface,
      color: on ? C.text : C.text2,
      border: on ? hexA(accent, 0.4) : C.border,
      countBg: on ? hexA(accent, 0.22) : C.surface2,
      countColor: on ? accent : C.text3,
    };
  });

  const emptyText = `No domains match${query ? ` "${query}"` : ""}${
    filter !== "all" ? " in this view" : ""
  }.`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1100px 600px at 80% -10%, rgba(167,139,250,.07), transparent 60%), #131316",
        color: C.text,
        fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ width: "min(940px, 100% - 40px)", margin: "0 auto", padding: "56px 0 40px" }}>
        <header
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: "-.01em",
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: C.purple,
                boxShadow: "0 0 0 3px rgba(167,139,250,.18)",
              }}
            />
            expira
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontFamily: MONO,
                fontSize: 11.5,
                color: C.text3,
                letterSpacing: ".02em",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  flex: "none",
                   background: load === "error" ? C.red : load === "loading" ? C.text3 : C.green,
                  boxShadow: "0 0 0 3px rgba(95,185,139,.14)",
                }}
              />
              {(load === "error" ? "error " : "checked ") + relTime(refreshedAt)}
            </div>
            <button
              type="button"
              className="ex-refresh"
              onClick={() => void refetch()}
              title="Refresh now"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 8,
                background: C.surface,
                border: `1px solid ${C.border}`,
                color: C.text2,
                cursor: "pointer",
                transition: "all .14s",
              }}
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

        <div style={{ display: "flex", alignItems: "center", gap: 26, margin: "32px 0 30px" }}>
          {(
            [
              [String(counts.all).padStart(2, "0"), "Tracked", C.text],
              [String(counts.soon).padStart(2, "0"), "Expiring soon", counts.soon ? C.amber : C.text],
              [
                String(counts.expired).padStart(2, "0"),
                "Expired",
                counts.expired ? C.red : C.text,
              ],
            ] as const
          ).map(([value, label, valueColor], i) => (
            <Fragment key={label}>
              {i > 0 && <span style={{ width: 1, height: 44, background: C.border }} />}
              <div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 40,
                    fontWeight: 500,
                    lineHeight: 1,
                    letterSpacing: "-.02em",
                    color: valueColor,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: ".13em",
                    color: C.text2,
                    marginTop: 9,
                  }}
                >
                  {label}
                </div>
              </div>
            </Fragment>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            className="ex-search"
            style={{
              flex: 1,
              minWidth: 240,
              display: "flex",
              alignItems: "center",
              gap: 9,
              color: C.text3,
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 9,
              padding: "9px 13px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="6" cy="6" r="4.2" />
              <path d="M9.2 9.2L12.5 12.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search domains…"
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: C.text,
                fontSize: 13,
                fontFamily: "inherit",
              }}
            />
          </div>
          <div
            title="Highlight domains expiring within…"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 9,
              padding: "4px 6px 4px 11px",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: C.text3,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginRight: 3,
              }}
            >
              Soon ≤
            </span>
            {[7, 30, 60, 90].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setThreshold(t)}
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  border: "none",
                  cursor: "pointer",
                  padding: "5px 8px",
                  borderRadius: 6,
                  transition: "all .12s",
                  background: threshold === t ? hexA(C.purple, 0.16) : "none",
                  color: threshold === t ? C.purple : C.text2,
                }}
              >
                {t}d
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontSize: 12.5,
                fontWeight: 500,
                borderRadius: 20,
                padding: "6px 8px 6px 13px",
                cursor: "pointer",
                transition: "all .14s",
                fontFamily: "inherit",
                background: c.bg,
                color: c.color,
                border: `1px solid ${c.border}`,
              }}
            >
              {c.label}
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  minWidth: 18,
                  textAlign: "center",
                  padding: "1px 5px",
                  borderRadius: 10,
                  background: c.countBg,
                  color: c.countColor,
                }}
              >
                {c.count}
              </span>
            </button>
          ))}
        </div>

        <ExpiraTable
          domains={filteredDomains}
          totalDomains={domains.length}
          load={load}
          soonThreshold={threshold}
          emptyText={emptyText}
        />

        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 18,
            fontSize: 11.5,
            color: C.text3,
          }}
        >
          <span>
            Source ·{" "}
            <code style={{ fontFamily: MONO, color: C.text2 }}>{endpoint}</code>
          </span>
          <span>Expira · stateless domain expiry monitor</span>
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
