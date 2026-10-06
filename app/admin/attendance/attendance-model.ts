import type { EventRecord } from "@/lib/domain";

export type Member = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
};

export type Attendance = {
  id: string;
  event_id: string;
  member_external_id: string;
  checked_in_at: string;
  method: "qr" | "manual";
};

export type Rsvp = {
  event_id: string;
  member_external_id: string;
  status: "attending" | "declined" | "maybe";
};

export type AttendanceSnapshot = {
  events: EventRecord[];
  members: Member[];
  attendance: Attendance[];
  rsvps: Rsvp[];
};

export const canManageAttendance = (role?: string) =>
  ["road_captain", "admin", "superadmin"].includes(role || "");

export function deriveAttendanceSummary(
  attendance: Attendance[],
  rsvps: Rsvp[],
  selectedEvent: string,
) {
  const eventAttendance = attendance.filter(
    (row) => row.event_id === selectedEvent,
  );
  const attendingRsvp = rsvps.filter(
    (row) => row.event_id === selectedEvent && row.status === "attending",
  );
  const checkedInIds = new Set(
    eventAttendance.map((row) => row.member_external_id),
  );
  const absentRsvp = attendingRsvp.filter(
    (row) => !checkedInIds.has(row.member_external_id),
  );
  const checkedInAttendingCount = attendingRsvp.reduce(
    (count, row) => count + (checkedInIds.has(row.member_external_id) ? 1 : 0),
    0,
  );
  const attendanceRate = attendingRsvp.length
    ? Math.round((checkedInAttendingCount / attendingRsvp.length) * 100)
    : 0;

  return {
    eventAttendance,
    attendingRsvp,
    absentRsvp,
    attendanceRate,
  };
}
