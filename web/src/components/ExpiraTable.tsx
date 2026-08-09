import { useMemo } from "react";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
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

const URGENCY_TEXT_CLASSES: Record<ReturnType<typeof domainUrgency>, string> = {
  ok: "text-expira-purple",
  soon: "text-expira-amber",
  expired: "text-expira-red",
  unknown: "text-expira-gray",
};

const URGENCY_DOT_CLASSES: Record<ReturnType<typeof domainUrgency>, string> = {
  ok: "bg-expira-purple",
  soon: "bg-expira-amber",
  expired: "bg-expira-red",
  unknown: "bg-expira-gray",
};

const URGENCY_FILL_CLASSES: Record<ReturnType<typeof domainUrgency>, string> = {
  ok: "bg-expira-purple",
  soon: "bg-expira-amber",
  expired: "bg-expira-border",
  unknown: "bg-expira-border",
};

const STATUS_CLASSES: Record<ReturnType<typeof domainUrgency>, string> = {
  ok: "border-expira-purple/28 bg-expira-purple/14 text-expira-purple",
  soon: "border-expira-amber/28 bg-expira-amber/14 text-expira-amber",
  expired: "border-expira-red/28 bg-expira-red/14 text-expira-red",
  unknown: "border-expira-gray/28 bg-expira-gray/14 text-expira-gray",
};

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
            <div className="font-mono text-[13.5px] text-expira-text">{getValue()}</div>
          ),
        }),
        columnHelper.accessor((domain) => expirySortValue(domain.expiryDate), {
          id: "expiry",
          header: COLUMN_LABELS.expiry,
          sortUndefined: "last",
          cell: ({ row }) => (
            <div className="font-mono text-[12.5px] text-expira-text-2">
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
            const fraction =
              domain.expiryDate == null || domain.remainingDays <= 0
                ? 0
                : Math.max(0, Math.min(1, domain.remainingDays / HORIZON));

            return (
              <div className="flex flex-col items-start gap-[7px]">
                <span className={`whitespace-nowrap font-mono text-[12.5px] ${URGENCY_TEXT_CLASSES[urgency]}`}>
                  {daysText(domain)}
                </span>
                <div className="h-1 w-[120px] overflow-hidden rounded-[3px] bg-expira-border">
                  <div
                    className={`h-full rounded-[3px] transition-[width] duration-300 ease-in-out ${URGENCY_FILL_CLASSES[urgency]}`}
                    style={{ width: `${fraction * 100}%` }}
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

            return (
              <span
                className={`inline-flex items-center gap-[6px] whitespace-nowrap rounded-[20px] border py-1 pr-[11px] pl-[9px] text-[11.5px] font-medium ${STATUS_CLASSES[urgency]}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${URGENCY_DOT_CLASSES[urgency]}`} />
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
    <div className="overflow-x-auto">
      <div className="min-w-[600px] overflow-hidden rounded-[13px] border border-expira-table-border bg-expira-surface">
        <table className="w-full min-w-[600px] table-fixed border-collapse">
          <colgroup>
            <col />
            <col className="w-[132px]" />
            <col className="w-[200px]" />
            <col className="w-[150px]" />
          </colgroup>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-expira-table-border bg-expira-surface-2">
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const label = COLUMN_LABELS[header.column.id as keyof typeof COLUMN_LABELS] ?? header.column.id;

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                      className="px-5 py-[13px] text-left align-middle font-normal"
                    >
                      <button
                        type="button"
                        className="flex cursor-pointer items-center gap-[5px] border-0 bg-transparent p-0 font-sans text-[10.5px] font-semibold uppercase tracking-[.1em] text-expira-text-3 hover:text-expira-text-2"
                        onClick={header.column.getToggleSortingHandler()}
                        aria-label={`Sort by ${label}`}
                      >
                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                        <svg
                          width="8"
                          height="11"
                          viewBox="0 0 8 11"
                          fill="none"
                          aria-hidden="true"
                          className={sorted === false ? "opacity-30" : "opacity-100"}
                        >
                          <path
                            d="M4 0l3 3.5H1z"
                            className={sorted === "asc" ? "text-expira-purple" : "text-expira-icon"}
                            fill="currentColor"
                          />
                          <path
                            d="M4 11l3-3.5H1z"
                            className={sorted === "desc" ? "text-expira-purple" : "text-expira-icon"}
                            fill="currentColor"
                          />
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
              <tr key={row.id} className="transition-[background] duration-[120ms] hover:bg-expira-surface-2">
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="border-t border-expira-table-border px-5 py-[15px] align-middle">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
            {tableRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-[30px] text-center text-[13px] text-expira-text-3">
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
