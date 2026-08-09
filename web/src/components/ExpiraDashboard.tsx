import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

const HORIZON = 365;

const C = {
  purple: "#a78bfa",
  amber: "#e6b65c",
  red: "#e8736a",
  gray: "#7c7c88",
  green: "#5fb98b",
  text: "#ededf1",
  text2: "#9a9aa6",
  text3: "#62626c",
  border: "#2b2b34",
  surface: "#1a1a1f",
  surface2: "#202027",
} as const;

const MONO = "'Geist Mono', ui-monospace, Menlo, monospace";

export type DomainStatus = "active" | "expired" | "unknown";

export interface Domain {
  name: string;
  status: DomainStatus;
  expiryDate: string | null;
  remainingDays: number;
}

export interface DomainsPayload {
  lastRefreshed: string;
  domains: Domain[];
}

type Urgency = "ok" | "soon" | "expired" | "unknown";
type Filter = "all" | "active" | "soon" | "expired" | "unknown";
type SortKey = "name" | "expiry" | "days" | "status";
type LoadState = "loading" | "live" | "error";

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",")},${a})`;
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" });

function formatExpiry(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

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

function statusText(status: DomainStatus) {
  if (status === "active") return "Active";
  if (status === "expired") return "Expired";
  if (status === "unknown") return "Unknown";
  return "Unknown";
}

export interface ExpiraDashboardProps {
  endpoint?: string;
  soonThreshold?: number;
}

export default function ExpiraDashboard({
  endpoint = "/api/domains",
  soonThreshold = 30,
}: ExpiraDashboardProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [load, setLoad] = useState<LoadState>("loading");
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [threshold, setThreshold] = useState(soonThreshold);
  const [sortKey, setSortKey] = useState<SortKey>("days");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const endpointRef = useRef(endpoint);
  endpointRef.current = endpoint;

  const fetchData = useCallback(() => {
    fetch(endpointRef.current, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<DomainsPayload>;
      })
      .then((data) => {
        if (!data || !Array.isArray(data.domains)) throw new Error("unexpected payload");
        setDomains(data.domains);
        setRefreshedAt(data.lastRefreshed ? new Date(data.lastRefreshed) : new Date());
        setLoad("live");
      })
      .catch(() => {
        setDomains([]);
        setRefreshedAt(null);
        setLoad("error");
      });
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const urgency = useCallback(
    (d: Domain): Urgency => {
      if (d.status === "unknown" || d.expiryDate == null) return "unknown";
      if (d.status === "expired" || d.remainingDays < 0) return "expired";
      if (d.remainingDays <= threshold) return "soon";
      return "ok";
    },
    [threshold],
  );

  const color = (u: Urgency) =>
    u === "expired" ? C.red : u === "soon" ? C.amber : u === "unknown" ? C.gray : C.purple;

  const daysText = (d: Domain) => {
    if (d.status === "unknown" || d.expiryDate == null) return "—";
    if (d.remainingDays < 0) return "0d";
    if (d.remainingDays === 0) return "today";
    return `${d.remainingDays}d`;
  };

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

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (d: Domain) =>
      filter === "all" || (filter === "active" ? d.status === "active" : urgency(d) === filter);
    const val = (d: Domain): string | number => {
      if (sortKey === "name") return d.name;
      if (sortKey === "status") return statusText(d.status);
      return d.expiryDate == null ? Infinity : d.remainingDays;
    };

    return domains
      .filter((d) => d.name.toLowerCase().includes(q) && match(d))
      .sort((a, b) => {
        const av = val(a);
        const bv = val(b);
        const cmp = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
        return sortDir === "asc" ? cmp : -cmp;
      })
      .map((d) => {
        const u = urgency(d);
        const col = color(u);
        const frac =
          d.expiryDate == null || d.remainingDays <= 0
            ? 0
            : Math.max(0, Math.min(1, d.remainingDays / HORIZON));
        return {
          key: d.name,
          name: d.name,
          expiry: formatExpiry(d.expiryDate),
          days: daysText(d),
          color: col,
          fillWidth: `${frac * 100}%`,
          fillColor: u === "ok" || u === "soon" ? col : C.border,
          pillBg: hexA(col, 0.14),
          pillBorder: hexA(col, 0.28),
          statusText: u === "soon" ? "Expiring soon" : statusText(d.status),
        };
      });
  }, [domains, query, filter, sortKey, sortDir, urgency]);

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

  const cols = (
    [
      ["name", "Domain"],
      ["expiry", "Expiry date"],
      ["days", "Remaining"],
      ["status", "Status"],
    ] as const
  ).map(([k, label]) => {
    const active = sortKey === k;
    return {
      key: k,
      label,
      onClick: () =>
        sortKey === k
          ? setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
          : (setSortKey(k), setSortDir("asc")),
      caretOpacity: active ? 1 : 0.3,
      upFill: active && sortDir === "asc" ? C.purple : "#44444e",
      downFill: active && sortDir === "desc" ? C.purple : "#44444e",
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
              onClick={fetchData}
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

        <div style={{ overflowX: "auto" }}>
          <div
            style={{
              border: "1px solid #232329",
              borderRadius: 13,
              overflow: "hidden",
              background: C.surface,
              minWidth: 600,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) 132px 200px 150px",
                padding: "13px 20px",
                background: C.surface2,
                borderBottom: "1px solid #232329",
              }}
            >
              {cols.map((col) => (
                <button
                  key={col.key}
                  type="button"
                  className="ex-col"
                  onClick={col.onClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                    fontSize: 10.5,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    color: C.text3,
                  }}
                >
                  {col.label}
                  <svg width="8" height="11" viewBox="0 0 8 11" fill="none" style={{ opacity: col.caretOpacity }}>
                    <path d="M4 0l3 3.5H1z" fill={col.upFill} />
                    <path d="M4 11l3-3.5H1z" fill={col.downFill} />
                  </svg>
                </button>
              ))}
            </div>
            <div>
              {rows.map((r) => (
                <div
                  key={r.key}
                  className="ex-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) 132px 200px 150px",
                    alignItems: "center",
                    padding: "15px 20px",
                    borderTop: "1px solid #232329",
                    transition: "background .12s",
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 13.5, color: C.text }}>{r.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 12.5, color: C.text2 }}>{r.expiry}</div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 7,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 12.5,
                        whiteSpace: "nowrap",
                        color: r.color,
                      }}
                    >
                      {r.days}
                    </span>
                    <div
                      style={{
                        width: 120,
                        height: 4,
                        borderRadius: 3,
                        background: C.border,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 3,
                          transition: "width .3s ease",
                          width: r.fillWidth,
                          background: r.fillColor,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 11px 4px 9px",
                        borderRadius: 20,
                        fontSize: 11.5,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        color: r.color,
                        background: r.pillBg,
                        border: `1px solid ${r.pillBorder}`,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          flex: "none",
                          background: r.color,
                        }}
                      />
                      {r.statusText}
                    </span>
                  </div>
                </div>
              ))}
              {load === "error" ? (
                <div style={{ padding: "30px 20px", color: C.text3, fontSize: 13, textAlign: "center" }}>
                  error while fetching data
                </div>
              ) : load === "live" && domains.length === 0 ? (
                <div style={{ padding: "30px 20px", color: C.text3, fontSize: 13, textAlign: "center" }}>
                  empty data, add domains in the config
                </div>
              ) : load === "live" && rows.length === 0 ? (
                <div style={{ padding: "30px 20px", color: C.text3, fontSize: 13, textAlign: "center" }}>
                  {emptyText}
                </div>
              ) : null}
            </div>
          </div>
        </div>

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
