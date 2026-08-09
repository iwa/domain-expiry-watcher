import { useMemo } from "react";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { C, hexA, MONO } from "./styles";
import { domainUrgency, type Domain, type LoadState } from "./types";

const HORIZON = 365;

const EXPIRA_TABLE_FEATURES = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof EXPIRA_TABLE_FEATURES, Domain>();
const INITIAL_TABLE_STATE = { sorting: [{ id: "days", desc: false }] };

const COLUMN_LABELS = {
  name: "Domain",
  expiry: "Expiry date",
  days: "Remaining",
  status: "Status",
} as const;

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" });

function formatExpiry(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateFmt.format(date);
}

function statusText(status: Domain["status"]) {
  if (status === "active") return "Active";
  if (status === "expired") return "Expired";
  return "Unknown";
}

function daysText(domain: Domain) {
  if (domain.status === "unknown" || domain.expiryDate == null) return "—";
  if (domain.remainingDays < 0) return "0d";
  if (domain.remainingDays === 0) return "today";
  return `${domain.remainingDays}d`;
}

function urgencyColor(urgency: ReturnType<typeof domainUrgency>) {
  return urgency === "expired"
    ? C.red
    : urgency === "soon"
      ? C.amber
      : urgency === "unknown"
        ? C.gray
        : C.purple;
}

function displayStatus(domain: Domain, threshold: number) {
  const urgency = domainUrgency(domain, threshold);
  return urgency === "soon" ? "Expiring soon" : statusText(domain.status);
}

function expirySortValue(expiryDate: string | null) {
  if (!expiryDate) return undefined;
  const timestamp = new Date(expiryDate).getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function daysSortValue(domain: Domain) {
  return domain.status === "unknown" || domain.expiryDate == null ? undefined : domain.remainingDays;
}

export interface ExpiraTableProps {
  domains: Domain[];
  totalDomains: number;
  load: LoadState;
  soonThreshold: number;
  emptyText: string;
}

export default function ExpiraTable({
  domains,
  totalDomains,
  load,
  soonThreshold,
  emptyText,
}: ExpiraTableProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: COLUMN_LABELS.name,
          cell: ({ getValue }) => (
            <div style={{ fontFamily: MONO, fontSize: 13.5, color: C.text }}>{getValue()}</div>
          ),
        }),
        columnHelper.accessor((domain) => expirySortValue(domain.expiryDate), {
          id: "expiry",
          header: COLUMN_LABELS.expiry,
          sortUndefined: "last",
          cell: ({ row }) => (
            <div style={{ fontFamily: MONO, fontSize: 12.5, color: C.text2 }}>
              {formatExpiry(row.original.expiryDate)}
            </div>
          ),
        }),
        columnHelper.accessor(daysSortValue, {
          id: "days",
          header: COLUMN_LABELS.days,
          sortUndefined: "last",
          cell: ({ row }) => {
            const domain = row.original;
            const urgency = domainUrgency(domain, soonThreshold);
            const color = urgencyColor(urgency);
            const fraction =
              domain.expiryDate == null || domain.remainingDays <= 0
                ? 0
                : Math.max(0, Math.min(1, domain.remainingDays / HORIZON));

            return (
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
                    color,
                  }}
                >
                  {daysText(domain)}
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
                      width: `${fraction * 100}%`,
                      background: urgency === "ok" || urgency === "soon" ? color : C.border,
                    }}
                  />
                </div>
              </div>
            );
          },
        }),
        columnHelper.accessor((domain) => displayStatus(domain, soonThreshold), {
          id: "status",
          header: COLUMN_LABELS.status,
          cell: ({ row }) => {
            const domain = row.original;
            const urgency = domainUrgency(domain, soonThreshold);
            const color = urgencyColor(urgency);

            return (
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
                  color,
                  background: hexA(color, 0.14),
                  border: `1px solid ${hexA(color, 0.28)}`,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    flex: "none",
                    background: color,
                  }}
                />
                {displayStatus(domain, soonThreshold)}
              </span>
            );
          },
        }),
      ]),
    [soonThreshold],
  );

  const table = useTable({
    features: EXPIRA_TABLE_FEATURES,
    data: domains,
    columns,
    getRowId: (domain) => domain.name,
    initialState: INITIAL_TABLE_STATE,
    sortDescFirst: false,
    enableSortingRemoval: false,
  });

  const tableRows = table.getRowModel().rows;
  const emptyMessage =
    load === "error"
      ? "error while fetching data"
      : load === "loading"
        ? "loading domains..."
        : totalDomains === 0
          ? "empty data, add domains in the config"
          : emptyText;

  return (
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
        <table
          style={{
            width: "100%",
            minWidth: 600,
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col />
            <col style={{ width: 132 }} />
            <col style={{ width: 200 }} />
            <col style={{ width: 150 }} />
          </colgroup>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                style={{
                  background: C.surface2,
                  borderBottom: "1px solid #232329",
                }}
              >
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const label = COLUMN_LABELS[header.column.id as keyof typeof COLUMN_LABELS] ?? header.column.id;

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                      style={{
                        padding: "13px 20px",
                        textAlign: "left",
                        fontWeight: "normal",
                        verticalAlign: "middle",
                      }}
                    >
                      <button
                        type="button"
                        className="ex-col"
                        onClick={header.column.getToggleSortingHandler()}
                        aria-label={`Sort by ${label}`}
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
                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                        <svg
                          width="8"
                          height="11"
                          viewBox="0 0 8 11"
                          fill="none"
                          aria-hidden="true"
                          style={{ opacity: sorted === false ? 0.3 : 1 }}
                        >
                          <path d="M4 0l3 3.5H1z" fill={sorted === "asc" ? C.purple : "#44444e"} />
                          <path d="M4 11l3-3.5H1z" fill={sorted === "desc" ? C.purple : "#44444e"} />
                        </svg>
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr
                key={row.id}
                className="ex-row"
                style={{
                  transition: "background .12s",
                }}
              >
                {row.getAllCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      padding: "15px 20px",
                      borderTop: "1px solid #232329",
                      verticalAlign: "middle",
                    }}
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
            {tableRows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "30px 20px", color: C.text3, fontSize: 13, textAlign: "center" }}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
