export type MemberAccessSnapshot = {
  member_external_id: string;
  role: string;
  status: string;
};

export function hasMemberAccessChanged(
  previous: MemberAccessSnapshot | null,
  next: MemberAccessSnapshot | null,
) {
  if (!previous) return false;
  if (!next) return true;

  return (
    previous.member_external_id !== next.member_external_id ||
    previous.role !== next.role ||
    previous.status !== next.status
  );
}
