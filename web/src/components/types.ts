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

export type Urgency = "ok" | "soon" | "expired" | "unknown";
export type LoadState = "loading" | "live" | "error";

export function domainUrgency(domain: Domain, threshold: number): Urgency {
  if (domain.status === "unknown" || domain.expiryDate == null) return "unknown";
  if (domain.status === "expired" || domain.remainingDays < 0) return "expired";
  if (domain.remainingDays <= threshold) return "soon";
  return "ok";
}
