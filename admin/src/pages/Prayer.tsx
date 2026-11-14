import { useCallback, useEffect, useState } from 'react';

import { formatMoment, friendlyError } from '../lib';
import { db } from '../supabase';
import { Button, ConfirmButton, Empty, Loading, PageHead, Segment, useToast } from '../ui';

type Status = 'new' | 'prayed' | 'archived';
type Request = { id: string; message: string; name: string | null; contact: string | null; user_id: string | null; status: Status; created_at: string; handled_at: string | null };

export default function Prayer({ onChange }: { onChange: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState<Status>('new');
  const [rows, setRows] = useState<Request[] | null>(null);

  const load = useCallback(() => {
    setRows(null);
    db()
      .from('prayer_requests')
      .select('id,message,name,contact,user_id,status,created_at,handled_at')
      .eq('status', status)
      .order('created_at', { ascending: status === 'new' })
      .limit(300)
      .then(({ data, error }) => {
        if (error) toast(friendlyError(error), 'error');
        setRows((data as Request[]) ?? []);
      });
  }, [status, toast]);

  useEffect(load, [load]);

  const move = async (r: Request, to: Status) => {
    setRows((rs) => rs?.filter((x) => x.id !== r.id) ?? null);
    const { error } = await db().from('prayer_requests').update({ status: to }).eq('id', r.id);
    if (error) {
      toast(friendlyError(error), 'error');
      load();
    } else {
      toast(to === 'prayed' ? 'Marked as prayed for.' : to === 'archived' ? 'Archived.' : 'Moved back to new.');
      onChange();
    }
  };

  const remove = async (r: Request) => {
    setRows((rs) => rs?.filter((x) => x.id !== r.id) ?? null);
    const { error } = await db().from('prayer_requests').delete().eq('id', r.id);
    if (error) {
      toast(friendlyError(error), 'error');
      load();
    } else onChange();
  };

  return (
    <>
      <PageHead
        eyebrow="Care"
        title="Prayer requests"
        intro="Sent from the Live tab in the app. Only staff can read them."
        actions={
          <Segment<Status>
            label="Show"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'new', label: 'New' },
              { value: 'prayed', label: 'Prayed for' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        }
      />
      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty
          title={status === 'new' ? 'You’re all caught up' : 'Nothing here yet'}
          text={status === 'new' ? 'New prayer requests from members and guests will appear here.' : 'Requests you move here will be listed for reference.'}
        />
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {rows.map((r) => (
            <article key={r.id} className="card prayer">
              <div className="row spread wrap">
                <span className="row small">
                  <strong>{r.name || (r.user_id ? 'A member' : 'A guest')}</strong>
                  {r.contact ? <span className="muted">· {r.contact}</span> : null}
                </span>
                <span className="small muted">{formatMoment(r.created_at)}</span>
              </div>
              <p className="msg">{r.message}</p>
              <div className="row wrap">
                {status !== 'prayed' ? (
                  <Button small variant="primary" onClick={() => move(r, 'prayed')}>
                    Mark as prayed for
                  </Button>
                ) : null}
                {status !== 'archived' ? (
                  <Button small onClick={() => move(r, 'archived')}>
                    Archive
                  </Button>
                ) : null}
                {status !== 'new' ? (
                  <Button small variant="ghost" onClick={() => move(r, 'new')}>
                    Move back to new
                  </Button>
                ) : null}
                <span className="grow" />
                <ConfirmButton label="Delete" confirmLabel="Delete for good?" onConfirm={() => remove(r)} />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
