import type { AccessRequestRow, AdminRole } from '../../database.types';
import { supabase } from '../../supabase';
import { toApiError } from '../errors';

export interface TeamMember extends AccessRequestRow {
  /** Current admin role, or null when the account has no access. */
  role: AdminRole | null;
}

/** Everyone who has an account: pending applicants, admins and declined. Owner only (RLS). */
export async function listTeam(): Promise<TeamMember[]> {
  const [requests, admins] = await Promise.all([
    supabase.from('admin_access_requests').select('*').order('requested_at', { ascending: false }),
    supabase.from('admin_users').select('user_id, role'),
  ]);
  if (requests.error) throw toApiError(requests.error);
  if (admins.error) throw toApiError(admins.error);
  const roles = new Map(admins.data.map((a) => [a.user_id, a.role]));
  return requests.data.map((r) => ({ ...r, role: roles.get(r.user_id) ?? null }));
}

/** Approve (with a role), change role, or decline / remove access. */
export async function decideAccess(userId: string, approve: boolean, role: AdminRole = 'staff'): Promise<void> {
  const { error } = await supabase.rpc('admin_decide_access', { p_user_id: userId, p_approve: approve, p_role: role });
  if (error) throw toApiError(error);
}
