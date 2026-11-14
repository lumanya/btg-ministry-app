import { FormEvent, useCallback, useEffect, useState } from 'react';

import { friendlyError } from '../lib';
import { db, StaffRole } from '../supabase';
import { Button, ConfirmButton, Field, Loading, PageHead, useToast } from '../ui';

type Member = { user_id: string; email: string; full_name: string | null; role: StaffRole };

export default function Staff({ role }: { role: StaffRole }) {
  const toast = useToast();
  const isAdmin = role === 'admin';
  const [rows, setRows] = useState<Member[] | null>(null);
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('editor');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    db()
      .rpc('list_staff')
      .then(({ data, error }) => {
        if (error) toast(friendlyError(error), 'error');
        setRows((data as Member[]) ?? []);
      });
  }, [toast]);

  useEffect(load, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter the email address they use in the app.');
    setBusy(true);
    setError(null);
    const { error } = await db().rpc('add_staff', { staff_email: email.trim(), staff_role: newRole });
    setBusy(false);
    if (error) return setError(friendlyError(error));
    toast(`${email.trim()} can now use the dashboard.`);
    setEmail('');
    load();
  };

  const changeRole = async (m: Member, to: StaffRole) => {
    const { error } = await db().from('staff').update({ role: to }).eq('user_id', m.user_id);
    if (error) return toast(friendlyError(error), 'error');
    toast(`${m.email} is now ${to === 'admin' ? 'an admin' : 'an editor'}.`);
    load();
  };

  const remove = async (m: Member) => {
    const { error } = await db().from('staff').delete().eq('user_id', m.user_id);
    if (error) return toast(friendlyError(error), 'error');
    toast(`${m.email} no longer has access.`);
    load();
  };

  return (
    <>
      <PageHead
        eyebrow="Access"
        title="Staff"
        intro="Editors post content and answer prayer requests. Admins can also add and remove staff."
      />
      <div className="stack" style={{ gap: 24 }}>
        {isAdmin ? (
          <form className="card stack" onSubmit={add} noValidate>
            <h3>Add someone</h3>
            <p className="small muted">They need an account first: ask them to sign up in the BTG Ministry app with this email.</p>
            <div className="row wrap" style={{ alignItems: 'flex-start' }}>
              <div className="grow" style={{ minWidth: 240 }}>
                <Field label="Email" error={error}>
                  {(p) => (
                    <input
                      {...p}
                      className="input"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                    />
                  )}
                </Field>
              </div>
              <Field label="Role">
                {(p) => (
                  <select {...p} className="select" value={newRole} onChange={(e) => setNewRole(e.target.value as StaffRole)}>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
              </Field>
              <div className="field">
                <span className="label" aria-hidden="true">
                  &nbsp;
                </span>
                <button className="btn primary" type="submit" aria-busy={busy || undefined}>
                  {busy ? 'Adding…' : 'Add to staff'}
                </button>
              </div>
            </div>
          </form>
        ) : null}

        {!rows ? (
          <Loading />
        ) : (
          <div className="list">
            {rows.map((m) => (
              <div key={m.user_id} className="list-row">
                <span className="grow stack" style={{ gap: 2 }}>
                  <strong>{m.full_name || m.email}</strong>
                  {m.full_name ? <span className="small muted">{m.email}</span> : null}
                </span>
                {isAdmin ? (
                  <>
                    <label className="sr-only" htmlFor={`role-${m.user_id}`}>
                      Role for {m.email}
                    </label>
                    <select
                      id={`role-${m.user_id}`}
                      className="select"
                      style={{ width: 130, minHeight: 38 }}
                      value={m.role}
                      onChange={(e) => changeRole(m, e.target.value as StaffRole)}>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ConfirmButton label="Remove" confirmLabel="Remove access?" onConfirm={() => remove(m)} />
                  </>
                ) : (
                  <span className={`pill ${m.role === 'admin' ? 'live' : 'draft'}`}>{m.role === 'admin' ? 'Admin' : 'Editor'}</span>
                )}
              </div>
            ))}
          </div>
        )}
        {!isAdmin ? (
          <p className="small muted">
            Only admins can change who has access. <Button variant="ghost" small onClick={load}>Refresh</Button>
          </p>
        ) : null}
      </div>
    </>
  );
}
