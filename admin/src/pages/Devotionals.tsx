import { useEffect, useMemo, useState } from 'react';

import { addDays, devotionalState, DevotionalState, formatDay, friendlyError, todayInTanzania } from '../lib';
import { db } from '../supabase';
import { Empty, Loading, PageHead, Segment } from '../ui';

type Row = { id: string; slug: string; title: string; publish_on: string; status: string; series: { name: string } | null };
type Filter = 'all' | DevotionalState;

export const STATE_LABEL: Record<DevotionalState, string> = { live: 'Published', scheduled: 'Scheduled', draft: 'Draft' };

export default function Devotionals() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const today = todayInTanzania();

  useEffect(() => {
    db()
      .from('devotionals')
      .select('id,slug,title,publish_on,status,series:series_id(name)')
      .order('publish_on', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) setError(friendlyError(error));
        else setRows(data as unknown as Row[]);
      });
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) => (filter === 'all' || devotionalState(r.status, r.publish_on, today) === filter) && (!needle || r.title.toLowerCase().includes(needle)),
    );
  }, [rows, filter, q, today]);

  const latest = rows?.find((r) => r.status === 'published')?.publish_on;
  const nextDate = latest && latest >= today ? addDays(latest, 1) : addDays(today, 1);

  return (
    <>
      <PageHead
        eyebrow="Content"
        title="Devotionals"
        intro="A published devotional appears in the app on its date, at midnight Tanzania time."
        actions={
          <a className="btn primary" href={`#/devotionals/new?date=${nextDate}`}>
            New devotional
          </a>
        }
      />
      {error ? <div className="notice error">{error}</div> : null}
      {!rows && !error ? <Loading /> : null}
      {rows ? (
        <div className="stack">
          <div className="row wrap spread">
            <Segment<Filter>
              label="Show"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'live', label: 'Published' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'draft', label: 'Drafts' },
              ]}
            />
            <label className="sr-only" htmlFor="search">
              Search devotionals
            </label>
            <input id="search" className="input" style={{ maxWidth: 280 }} placeholder="Search by title" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {shown.length ? (
            <div className="list">
              {shown.map((r) => {
                const state = devotionalState(r.status, r.publish_on, today);
                return (
                  <a key={r.id} className="list-row" href={`#/devotionals/${r.id}`}>
                    <span className="date">{formatDay(r.publish_on)}</span>
                    <span className="grow stack" style={{ gap: 2 }}>
                      <span className="title">{r.title}</span>
                      {r.series ? <span className="small muted">{r.series.name}</span> : null}
                    </span>
                    {r.publish_on === today && state === 'live' ? <span className="pill new">Today</span> : null}
                    <span className={`pill ${state}`}>{STATE_LABEL[state]}</span>
                  </a>
                );
              })}
            </div>
          ) : rows.length ? (
            <p className="muted">No devotionals match.</p>
          ) : (
            <Empty
              title="Write the first devotional"
              text="It will appear on members’ home screens on the day you choose."
              action={
                <a className="btn primary" href={`#/devotionals/new?date=${today}`}>
                  New devotional
                </a>
              }
            />
          )}
        </div>
      ) : null}
    </>
  );
}
