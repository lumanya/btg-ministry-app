import { FormEvent, useCallback, useEffect, useState } from 'react';

import { eatInputToIso, formatEat, friendlyError, isoToEatInput, plural } from '../lib';
import { db } from '../supabase';
import { Button, Field, Loading, PageHead, Segment, useToast } from '../ui';

type Audience = { devices: number; live: number; devotional: number; services: number; events: number; announcements: number };
type Row = {
  id: string;
  title: string;
  body: string;
  topic: string;
  url: string | null;
  status: string;
  send_at: string;
  sent_count: number | null;
  error: string | null;
  dedupe_key: string | null;
};
type EventOption = { id: string; title: string };

const TOPIC_LABEL: Record<string, string> = {
  live: 'We’re live',
  devotional: 'Devotional',
  services: 'Service reminder',
  events: 'Event',
  announcements: 'Announcement',
};

const STATUS: Record<string, { label: string; cls: string }> = {
  queued: { label: 'Scheduled', cls: 'scheduled' },
  sending: { label: 'Sending', cls: 'scheduled' },
  sent: { label: 'Sent', cls: 'live' },
  failed: { label: 'Failed', cls: 'draft' },
  cancelled: { label: 'Cancelled', cls: 'draft' },
};

export default function Notifications() {
  const toast = useToast();
  const [audience, setAudience] = useState<Audience | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [titleSw, setTitleSw] = useState('');
  const [bodySw, setBodySw] = useState('');
  const [opens, setOpens] = useState('/home');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [at, setAt] = useState(() => isoToEatInput(new Date(Date.now() + 3600 * 1000).toISOString()));
  const [errors, setErrors] = useState<{ title?: string; body?: string; at?: string }>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    db()
      .rpc('push_audience')
      .then(({ data }) => setAudience((data as Audience) ?? null));
    db()
      .from('notifications')
      .select('id,title,body,topic,url,status,send_at,sent_count,error,dedupe_key')
      .order('send_at', { ascending: false })
      .limit(60)
      .then(({ data, error }) => {
        if (error) toast(friendlyError(error), 'error');
        setRows((data as Row[]) ?? []);
      });
  }, [toast]);

  useEffect(() => {
    load();
    db()
      .from('events')
      .select('id,title')
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(20)
      .then(({ data }) => setEvents((data as EventOption[]) ?? []));
  }, [load]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = 'Add a short title.';
    if (!body.trim()) errs.body = 'Add the message.';
    if (when === 'later' && (!at || Date.parse(eatInputToIso(at)) < Date.now())) errs.at = 'Choose a time in the future.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const { error } = await db()
      .from('notifications')
      .insert({
        title: title.trim(),
        body: body.trim(),
        // Phones set to Kiswahili get this version when both parts are filled in.
        title_sw: titleSw.trim() && bodySw.trim() ? titleSw.trim() : null,
        body_sw: titleSw.trim() && bodySw.trim() ? bodySw.trim() : null,
        topic: 'announcements',
        url: opens,
        send_at: when === 'now' ? new Date().toISOString() : eatInputToIso(at),
      });
    setBusy(false);
    if (error) return toast(friendlyError(error), 'error');
    toast(when === 'now' ? 'Sending. Phones receive it within 5 minutes.' : `Scheduled for ${formatEat(eatInputToIso(at))}.`);
    setTitle('');
    setBody('');
    setTitleSw('');
    setBodySw('');
    load();
  };

  const cancel = async (r: Row) => {
    const { error } = await db().from('notifications').update({ status: 'cancelled' }).eq('id', r.id);
    if (error) return toast(friendlyError(error), 'error');
    toast('Cancelled.');
    load();
  };

  const reach = audience?.announcements ?? 0;

  return (
    <>
      <PageHead
        eyebrow="Reach members"
        title="Notifications"
        intro="Send an announcement to members’ phones. “We’re live”, the daily devotional and service and event reminders go out automatically."
      />
      <div className="stack" style={{ gap: 28 }}>
        <div className="stats">
          <div className="stat">
            <span className="num">{audience ? audience.devices : '—'}</span>
            <span className="label">Phones with notifications on</span>
          </div>
          <div className="stat">
            <span className="num">{audience ? audience.live : '—'}</span>
            <span className="label">Hear when you go live</span>
          </div>
          <div className="stat">
            <span className="num">{audience ? audience.devotional : '—'}</span>
            <span className="label">Get the daily devotional</span>
          </div>
          <div className="stat">
            <span className="num">{audience ? audience.events : '—'}</span>
            <span className="label">Get event reminders</span>
          </div>
        </div>

        <div className="editor" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px' }}>
          <form className="card stack" onSubmit={send} noValidate>
            <h3>New announcement</h3>
            <Field label="Title" error={errors.title} hint={`${title.length}/60`}>
              {(p) => <input {...p} className="input" value={title} maxLength={60} placeholder="Annual conference registration is open" onChange={(e) => setTitle(e.target.value)} />}
            </Field>
            <Field label="Message" error={errors.body} hint={`${body.length}/180. Keep it short; phones show about two lines.`}>
              {(p) => (
                <textarea {...p} className="textarea" style={{ minHeight: 90 }} value={body} maxLength={180} onChange={(e) => setBody(e.target.value)} />
              )}
            </Field>
            <details open={!!(titleSw || bodySw)}>
              <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>
                Kiswahili version (optional)
              </summary>
              <div className="stack" style={{ gap: 14, marginTop: 12 }}>
                <span className="small muted">Phones using the app in Kiswahili get this instead. Fill in both, or leave both empty.</span>
                <Field label="Title in Kiswahili" hint={`${titleSw.length}/60`}>
                  {(p) => <input {...p} lang="sw" className="input" value={titleSw} maxLength={60} placeholder="Usajili wa kongamano umefunguliwa" onChange={(e) => setTitleSw(e.target.value)} />}
                </Field>
                <Field label="Message in Kiswahili" hint={`${bodySw.length}/180`}>
                  {(p) => <textarea {...p} lang="sw" className="textarea" style={{ minHeight: 80 }} value={bodySw} maxLength={180} onChange={(e) => setBodySw(e.target.value)} />}
                </Field>
              </div>
            </details>
            <Field label="When tapped, open">
              {(p) => (
                <select {...p} className="select" value={opens} onChange={(e) => setOpens(e.target.value)}>
                  <option value="/home">Home</option>
                  <option value="/live">Live</option>
                  <option value="/devotional">Today’s devotional</option>
                  <option value="/sermons">Sermons</option>
                  <option value="/give">Give</option>
                  <option value="/events">All events</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={`/events/${ev.id}`}>
                      Event: {ev.title}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="stack tight">
              <span className="label" style={{ fontWeight: 600, fontSize: 13 }}>
                When
              </span>
              <Segment<'now' | 'later'>
                label="When"
                value={when}
                onChange={setWhen}
                options={[
                  { value: 'now', label: 'Send now' },
                  { value: 'later', label: 'Schedule' },
                ]}
              />
            </div>
            {when === 'later' ? (
              <Field label="Send at (Tanzania time)" error={errors.at}>
                {(p) => <input {...p} className="input" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} style={{ maxWidth: 260 }} />}
              </Field>
            ) : null}
            <div className="row wrap">
              <button className="btn primary" type="submit" aria-busy={busy || undefined}>
                {busy ? 'Saving…' : when === 'now' ? `Send to ${plural(reach, 'phone')}` : 'Schedule'}
              </button>
              <span className="small muted">Goes to everyone who allows announcements.</span>
            </div>
          </form>

          <aside className="preview stack tight" aria-label="Preview">
            <span className="eyebrow">Preview on a phone</span>
            <div className="push-preview">
              <img src={`${import.meta.env.BASE_URL}eagle.png`} alt="" />
              <div className="grow">
                <div className="row spread">
                  <strong className="small">BTG Ministry</strong>
                  <span className="small muted">now</span>
                </div>
                <div className="push-title">{title || 'Your title'}</div>
                <div className="push-body">{body || 'Your message appears here.'}</div>
              </div>
            </div>
          </aside>
        </div>

        <section className="stack tight">
          <h2>Recent</h2>
          {!rows ? (
            <Loading />
          ) : rows.length === 0 ? (
            <p className="muted">Nothing sent yet. Automatic notifications will appear here as they go out.</p>
          ) : (
            <div className="list">
              {rows.map((r) => {
                const st = STATUS[r.status] ?? STATUS.queued;
                return (
                  <div key={r.id} className="list-row">
                    <span className="date">{formatEat(r.send_at)}</span>
                    <span className="grow stack" style={{ gap: 2 }}>
                      <strong>{r.title}</strong>
                      <span className="small muted">{r.body}</span>
                      {r.error ? <span className="small" style={{ color: 'var(--danger)' }}>{r.error}</span> : null}
                    </span>
                    <span className="small muted">{TOPIC_LABEL[r.topic] ?? r.topic}{r.dedupe_key ? ' · automatic' : ''}</span>
                    <span className={`pill ${st.cls}`}>
                      {st.label}
                      {r.status === 'sent' && r.sent_count !== null ? ` · ${r.sent_count}` : ''}
                    </span>
                    {r.status === 'queued' && !r.dedupe_key ? (
                      <Button small variant="ghost" onClick={() => cancel(r)}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
