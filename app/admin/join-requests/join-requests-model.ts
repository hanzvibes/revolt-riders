export type JoinRequestStatus =
  | "pending"
  | "accepted"
  | "confirmed"
  | "active"
  | "rejected"
  | "expired";

export type JoinRequestTab =
  | "all"
  | "pending"
  | "accepted"
  | "confirmed"
  | "active"
  | "archived";

export type JoinRequest = {
  id: string;
  full_name: string;
  birth_place: string;
  birth_date: string;
  city: string;
  instagram: string;
  whatsapp: string;
  status: JoinRequestStatus;
  confirmation_token: string | null;
  accepted_at: string | null;
  confirmed_at: string | null;
  activated_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  assigned_member_id: string | null;
  created_at: string;
};

export type JoinRequestsSnapshot = {
  requests: JoinRequest[];
  suggestedMemberId: string;
};

export type JoinRequestToast = {
  text: string;
  type: "success" | "error";
};

export type JoinRequestCounts = Record<JoinRequestTab, number>;

export const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const getJoinRequestCounts = (requests: JoinRequest[]): JoinRequestCounts => ({
  all: requests.length,
  pending: requests.filter((request) => request.status === "pending").length,
  accepted: requests.filter((request) => request.status === "accepted").length,
  confirmed: requests.filter((request) => request.status === "confirmed").length,
  active: requests.filter((request) => request.status === "active").length,
  archived: requests.filter(
    (request) => request.status === "rejected" || request.status === "expired",
  ).length,
});

export const filterJoinRequests = (
  requests: JoinRequest[],
  tab: JoinRequestTab,
  search: string,
) =>
  requests.filter((request) => {
    if (tab === "pending" && request.status !== "pending") return false;
    if (tab === "accepted" && request.status !== "accepted") return false;
    if (tab === "confirmed" && request.status !== "confirmed") return false;
    if (tab === "active" && request.status !== "active") return false;
    if (
      tab === "archived" &&
      request.status !== "rejected" &&
      request.status !== "expired"
    ) {
      return false;
    }

    if (!search.trim()) return true;

    const query = search.toLowerCase();
    return (
      request.full_name.toLowerCase().includes(query) ||
      request.city.toLowerCase().includes(query) ||
      request.whatsapp.includes(query) ||
      request.instagram.toLowerCase().includes(query) ||
      Boolean(request.assigned_member_id?.toLowerCase().includes(query))
    );
  });
