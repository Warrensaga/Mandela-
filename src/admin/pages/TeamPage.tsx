import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import type { AdminRole } from '../../lib/database.types';
import { ApiError, decideAccess, listTeam, type TeamMember } from '../../lib/api/admin';
import { formatLongDate } from '../../lib/format';
import { useAdmin } from '../auth';
import { Badge, Btn, Card, Empty, inputCls, Loading, Notice, PageHeader } from '../components/ui';

function Person({ m }: { m: TeamMember }) {
  return (
    <div className="min-w-0">
      <p className="font-medium text-navy-800">{m.full_name || m.email}</p>
      <p className="truncate text-xs text-muted">
        {m.email} · signed up {formatLongDate(m.requested_at)}
      </p>
    </div>
  );
}

export default function TeamPage() {
  const { isOwner, identity } = useAdmin();
  const team = useAsync(() => (isOwner ? listTeam() : Promise.resolve([])), [isOwner]);
  const [roles, setRoles] = useState<Record<string, AdminRole>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  if (!isOwner) {
    return (
      <>
        <PageHeader title="Team" />
        <Notice kind="info">Only the owner can approve sign-ups and manage the team.</Notice>
      </>
    );
  }

  const act = async (m: TeamMember, approve: boolean, role: AdminRole, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(m.user_id);
    setMsg(null);
    try {
      await decideAccess(m.user_id, approve, role);
      const who = m.full_name || m.email;
      setMsg({ kind: 'success', text: approve ? `${who} now has ${role} access.` : `${who} no longer has access.` });
      team.reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not update access.' });
    } finally {
      setBusy(null);
    }
  };

  const all = team.data ?? [];
  const pending = all.filter((m) => !m.role && m.status === 'pending');
  const members = all.filter((m) => m.role);
  const declined = all.filter((m) => !m.role && m.status !== 'pending');
  const roleFor = (m: TeamMember) => roles[m.user_id] ?? 'staff';

  return (
    <>
      <PageHeader
        title="Team"
        description="People sign up at /admin/signup. Nobody gets access until you approve them here. Staff can do everything except change Settings and the team."
      />
      {msg && <Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice>}
      {team.error && <Notice kind="error">{team.error.message}</Notice>}
      {team.loading && !team.data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <Card title={`Waiting for approval (${pending.length})`}>
            {pending.length === 0 ? (
              <Empty>No one is waiting.</Empty>
            ) : (
              <ul className="divide-y divide-paper-200">
                {pending.map((m) => (
                  <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-3">
                    <Person m={m} />
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Role for ${m.full_name || m.email}`}
                        className={`${inputCls} w-auto`}
                        value={roleFor(m)}
                        onChange={(e) => setRoles((r) => ({ ...r, [m.user_id]: e.target.value as AdminRole }))}
                      >
                        <option value="staff">Staff</option>
                        <option value="owner">Owner</option>
                      </select>
                      <Btn
                        disabled={busy === m.user_id}
                        onClick={() =>
                          void act(m, true, roleFor(m), roleFor(m) === 'owner' ? `Give ${m.email} full owner access, including Settings and the team?` : undefined)
                        }
                      >
                        Approve
                      </Btn>
                      <Btn variant="danger" disabled={busy === m.user_id} onClick={() => void act(m, false, 'staff', `Decline ${m.email}?`)}>
                        Decline
                      </Btn>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Team members (${members.length})`}>
            <ul className="divide-y divide-paper-200">
              {members.map((m) => {
                const self = m.user_id === identity.userId;
                return (
                  <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-3">
                    <Person m={m} />
                    <Badge tone={m.role === 'owner' ? 'info' : 'neutral'}>{m.role === 'owner' ? 'Owner' : 'Staff'}</Badge>
                    {self ? (
                      <span className="ml-auto text-xs text-muted">You</span>
                    ) : (
                      <div className="ml-auto flex gap-2">
                        <Btn
                          variant="secondary"
                          disabled={busy === m.user_id}
                          onClick={() =>
                            void act(
                              m,
                              true,
                              m.role === 'owner' ? 'staff' : 'owner',
                              m.role === 'owner' ? `Change ${m.email} to staff?` : `Give ${m.email} full owner access?`,
                            )
                          }
                        >
                          Make {m.role === 'owner' ? 'staff' : 'owner'}
                        </Btn>
                        <Btn variant="danger" disabled={busy === m.user_id} onClick={() => void act(m, false, 'staff', `Remove ${m.email}'s admin access?`)}>
                          Remove access
                        </Btn>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          {declined.length > 0 && (
            <Card title={`Declined or removed (${declined.length})`}>
              <ul className="divide-y divide-paper-200">
                {declined.map((m) => (
                  <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-3">
                    <Person m={m} />
                    <Btn variant="secondary" className="ml-auto" disabled={busy === m.user_id} onClick={() => void act(m, true, 'staff')}>
                      Approve as staff
                    </Btn>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
