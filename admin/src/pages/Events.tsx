import { useEffect, useMemo, useRef, useState } from 'react';

import { go } from '../App';
import { eatInputToIso, formatEat, friendlyError, isoToEatInput, plural } from '../lib';
import { CLIPS_URL, db } from '../supabase';
import { Button, ConfirmButton, Empty, Field, Loading, PageHead, Segment, useToast } from '../ui';

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location_name: string | null;
  address: string | null;
  description: string;
  image_url: string | null;
  registration_url: string | null;
  livestreamed: boolean;
  remind: boolean;
  status: 'draft' | 'published';
  title_sw?: string | null;
  description_sw?: string | null;
};

const COLUMNS = 'id,title,starts_at,ends_at,location_name,address,description,image_url,registration_url,livestreamed,remind,status,title_sw,description_sw';

/* ---------- List ---------- */

export function EventsList() {
  const [rows, setRows] = useState<EventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState<'upcoming' | 'past'>('upcoming');
  const [stats, setStats] = useState<Map<string, { likes: number; views: number }>>(new Map());

  useEffect(() => {
    db()
      .from('events')
      .select(COLUMNS)
      .order('starts_at', { ascending: true })
      .limit(300)
      .then(({ data, error }) => {
        if (error) return setError(friendlyError(error));
        const list = data as EventRow[];
        setRows(list);
        // Likes and views in the app.
        db()
          .rpc('item_stats', { stat_kind: 'event', items: list.slice(-200).map((r) => r.id) })
          .then(({ data: s }) =>
            setStats(new Map(((s as { item_id: string; likes: number; views: number }[] | null) ?? []).map((x) => [x.item_id, { likes: Number(x.likes), views: Number(x.views) }]))),
          );
      });
  }, []);

  const shown = useMemo(() => {
    const now = Date.now();
    const list = (rows ?? []).filter((r) => (Date.parse(r.ends_at ?? r.starts_at) >= now - 3 * 3600e3) === (show === 'upcoming'));
    return show === 'past' ? list.reverse() : list;
  }, [rows, show]);

  return (
    <>
      <PageHead
        eyebrow="Content"
        title="Events"
        intro="Conferences and special services. Published events show on the app’s Today screen with their poster, with reminders the day before and an hour before. Pick a poster from Instagram below, or start a new event and upload one."
        actions={
          <a className="btn primary" href="#/events/new">
            New event
          </a>
        }
      />
      {error ? <div className="notice error">{error}</div> : null}
      <InstagramPosters used={rows ?? []} />
      {!rows && !error ? <Loading /> : null}
      {rows ? (
        <div className="stack">
          <Segment
            label="Show"
            value={show}
            onChange={setShow}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
            ]}
          />
          {shown.length ? (
            <div className="list">
              {shown.map((r) => (
                <a key={r.id} className="list-row" href={`#/events/${r.id}`}>
                  <span className="date">{formatEat(r.starts_at)}</span>
                  <span className="grow stack" style={{ gap: 2 }}>
                    <span className="title">{r.title}</span>
                    {r.location_name ? <span className="small muted">{r.location_name}</span> : null}
                  </span>
                  {stats.get(r.id)?.likes || stats.get(r.id)?.views ? (
                    <span className="small muted" title="Likes and views in the app">
                      ♥ {stats.get(r.id)!.likes} · {plural(stats.get(r.id)!.views, 'view')}
                    </span>
                  ) : null}
                  <span className={`pill ${r.status === 'published' ? 'live' : 'draft'}`}>{r.status === 'published' ? 'Published' : 'Draft'}</span>
                </a>
              ))}
            </div>
          ) : show === 'upcoming' ? (
            <Empty
              title="Plan the next gathering"
              text="Add a conference or special service. Members see it on Home and can set a reminder."
              action={
                <a className="btn primary" href="#/events/new">
                  New event
                </a>
              }
            />
          ) : (
            <p className="muted">No past events.</p>
          )}
        </div>
      ) : null}
    </>
  );
}

/* ---------- Posters from Instagram ---------- */

type Poster = { id: string; imageUrl: string; caption: string; permalink: string | null; postedAt: string | null };

/** Where a chosen poster is passed to the new-event form. */
const DRAFT_KEY = 'btg.eventDraft';

function InstagramPosters({ used }: { used: EventRow[] }) {
  const toast = useToast();
  const [posters, setPosters] = useState<Poster[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    fetch(`${CLIPS_URL}?posters=1`)
      .then((r) => r.json() as Promise<{ connected?: boolean; posters?: Poster[]; error?: string }>)
      .then((b) => {
        if (b.connected === false) return setPosters([]);
        if (!Array.isArray(b.posters)) throw new Error(b.error ?? 'No posters');
        setPosters(b.posters);
      })
      .catch(() => setError('Couldn’t load the posters from Instagram. Refresh to try again.'));
  }, []);

  // An event made from a poster keeps "instagram-<post id>" in its picture's file name.
  const eventFor = (p: Poster) => used.find((e) => e.image_url?.includes(`instagram-${p.id}.`));

  const use = async (p: Poster) => {
    setBusy(p.id);
    const { data, error: err } = await db().functions.invoke('instagram-feed', { body: { import: p.id } });
    setBusy(null);
    const body = data as { url?: string; error?: string } | null;
    if (err || !body?.url) return toast(body?.error ?? 'Couldn’t copy the poster. Try again.', 'error');
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ image_url: body.url, caption: p.caption }));
    go('/events/new');
  };

  if (error) return <div className="notice error">{error}</div>;
  if (!posters) return <Loading label="Loading posters from Instagram" />;
  if (!posters.length) return null;
  const shown = more ? posters.slice(0, 24) : posters.slice(0, 8);

  return (
    <section className="card stack" style={{ gap: 14, marginBottom: 20 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Latest posters on Instagram</h2>
        <span className="small muted">Picture posts · newest first</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
        {shown.map((p) => {
          const ev = eventFor(p);
          return (
            <div key={p.id} className="stack" style={{ gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <img src={p.imageUrl} alt={p.caption.split('\n')[0] || 'Instagram post'} loading="lazy" style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 12, background: '#E6DCCF' }} />
                {ev ? <span className="pill live" style={{ position: 'absolute', left: 8, top: 8 }}>On the app</span> : null}
              </div>
              <span className="small muted">{p.postedAt ? formatEat(p.postedAt) : ''}</span>
              {ev ? (
                <a className="btn small" href={`#/events/${ev.id}`}>
                  Open event
                </a>
              ) : (
                <Button small onClick={() => use(p)} busy={busy === p.id}>
                  {busy === p.id ? 'Copying…' : 'Use as event'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {posters.length > 8 ? (
        <Button small variant="ghost" onClick={() => setMore((m) => !m)}>
          {more ? 'Show fewer' : 'Show older posters'}
        </Button>
      ) : null}
      <p className="small muted" style={{ margin: 0 }}>
        Instagram doesn’t know when an event happens, so set the date on the next screen. The poster leaves the app after the event ends.
      </p>
    </section>
  );
}

/** First line of a caption, without hashtags, mentions or emoji: a starting title for the event. */
function titleFromCaption(caption: string): string {
  const first = caption.split(/\r?\n/).find((l) => l.trim()) ?? '';
  return first
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/@[\w.]+/g, '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/* ---------- Editor ---------- */

type Form = {
  title: string;
  start: string;
  end: string;
  location_name: string;
  address: string;
  description: string;
  image_url: string;
  registration_url: string;
  livestreamed: boolean;
  remind: boolean;
  status: 'draft' | 'published';
  title_sw: string;
  description_sw: string;
};

function defaultStart() {
  const d = new Date(Date.now() + 7 * 24 * 3600e3);
  return `${isoToEatInput(d.toISOString()).slice(0, 10)}T09:00`;
}

const blank = (): Form => ({
  title: '',
  start: defaultStart(),
  end: '',
  location_name: '',
  address: '',
  description: '',
  image_url: '',
  registration_url: '',
  livestreamed: false,
  remind: true,
  status: 'draft',
  title_sw: '',
  description_sw: '',
});

/** A new event, or one started from an Instagram poster picked on the Events page. */
function newForm(): Form {
  const f = blank();
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return f;
    sessionStorage.removeItem(DRAFT_KEY);
    const d = JSON.parse(raw) as { image_url?: string; caption?: string };
    return { ...f, image_url: d.image_url ?? '', title: titleFromCaption(d.caption ?? ''), description: (d.caption ?? '').trim().slice(0, 8000) };
  } catch {
    return f;
  }
}

export function EventEditor({ id }: { id: string | null }) {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(() => (id ? null : newForm()));
  const [notifyNow, setNotifyNow] = useState(true);
  const [savedStatus, setSavedStatus] = useState<Form['status'] | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    db()
      .from('events')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return setLoadError(error ? friendlyError(error) : 'This event no longer exists.');
        const r = data as EventRow;
        setForm({
          title: r.title,
          start: isoToEatInput(r.starts_at),
          end: r.ends_at ? isoToEatInput(r.ends_at) : '',
          location_name: r.location_name ?? '',
          address: r.address ?? '',
          description: r.description ?? '',
          image_url: r.image_url ?? '',
          registration_url: r.registration_url ?? '',
          livestreamed: r.livestreamed,
          remind: r.remind,
          status: r.status,
          title_sw: r.title_sw ?? '',
          description_sw: r.description_sw ?? '',
        });
        setSavedStatus(r.status);
      });
  }, [id]);

  if (loadError) return <div className="notice error">{loadError}</div>;
  if (!form) return <Loading />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const save = async (status: Form['status']) => {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = 'Give the event a name.';
    if (!form.start) e.start = 'Choose when it starts.';
    if (form.end && form.start && form.end < form.start) e.end = 'It can’t end before it starts.';
    if (form.registration_url && !/^https:\/\//.test(form.registration_url)) e.registration_url = 'Use a link that starts with https://';
    if (form.image_url && !/^https:\/\//.test(form.image_url)) e.image_url = 'Use a link that starts with https://';
    setErrors(e);
    if (Object.keys(e).length) return toast('Check the highlighted fields.', 'error');
    setBusy(status);
    const row = {
      title: form.title.trim(),
      starts_at: eatInputToIso(form.start),
      ends_at: form.end ? eatInputToIso(form.end) : null,
      location_name: form.location_name.trim() || null,
      address: form.address.trim() || null,
      description: form.description.trim(),
      title_sw: form.title_sw.trim() || null,
      description_sw: form.description_sw.trim() || null,
      image_url: form.image_url.trim() || null,
      registration_url: form.registration_url.trim() || null,
      livestreamed: form.livestreamed,
      remind: form.remind,
      status,
    };
    const res = id ? await db().from('events').update(row).eq('id', id).select('id').single() : await db().from('events').insert(row).select('id').single();
    setBusy(null);
    if (res.error) return toast(friendlyError(res.error), 'error');
    // First time it's published: tell members, once (the key stops a second message).
    let told = false;
    if (status === 'published' && savedStatus !== 'published' && notifyNow) {
      const where = row.location_name ? ` · ${row.location_name}` : '';
      const { error: nErr } = await db().from('notifications').insert({
        title: `New event: ${row.title}`.slice(0, 80),
        body: `${formatEat(row.starts_at)}${where}`.slice(0, 240),
        title_sw: `Tukio jipya: ${row.title_sw || row.title}`.slice(0, 80),
        body_sw: `${formatEat(row.starts_at)}${where}`.slice(0, 240),
        topic: 'events',
        url: `/events/${res.data.id}`,
        dedupe_key: `event:${res.data.id}:new`,
      });
      told = !nErr;
    }
    setForm({ ...form, status });
    setSavedStatus(status);
    toast(status === 'published' ? (told ? 'Published, and members are being told about it.' : 'Published. It’s on the app’s Today screen now.') : 'Saved as a draft.');
    if (!id) go(`/events/${res.data.id}`);
  };

  const remove = async () => {
    if (!id) return;
    const { error } = await db().from('events').delete().eq('id', id);
    if (error) return toast(friendlyError(error), 'error');
    toast('Event deleted.');
    go('/events');
  };

  const upload = async (f: File) => {
    if (f.size > 8 * 1024 * 1024) return toast('That picture is over 8 MB. Use a smaller one.', 'error');
    setBusy('upload');
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `events/${Date.now()}.${ext}`;
    const { error } = await db().storage.from('media').upload(path, f, { contentType: f.type || undefined });
    setBusy(null);
    if (error) return toast(friendlyError(error), 'error');
    set('image_url', db().storage.from('media').getPublicUrl(path).data.publicUrl);
    toast('Poster uploaded. Save to keep it.');
  };

  return (
    <>
      <PageHead
        eyebrow={id ? 'Edit event' : 'New event'}
        title={form.title.trim() || 'Untitled event'}
        intro={savedStatus ? <span className={`pill ${savedStatus === 'published' ? 'live' : 'draft'}`}>{savedStatus === 'published' ? 'Published' : 'Draft'}</span> : 'Times are Tanzania time.'}
        actions={
          <a className="btn ghost" href="#/events">
            Back to events
          </a>
        }
      />
      <div className="editor" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px' }}>
        <div className="stack" style={{ gap: 20 }}>
          <Field label="Name" error={errors.title}>
            {(p) => <input {...p} className="input" value={form.title} maxLength={120} placeholder="Annual Conference 2026" onChange={(e) => set('title', e.target.value)} />}
          </Field>
          <div className="grid-2">
            <Field label="Starts" error={errors.start}>
              {(p) => <input {...p} className="input" type="datetime-local" value={form.start} onChange={(e) => set('start', e.target.value)} />}
            </Field>
            <Field label="Ends (optional)" error={errors.end}>
              {(p) => <input {...p} className="input" type="datetime-local" value={form.end} onChange={(e) => set('end', e.target.value)} />}
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Place">
              {(p) => <input {...p} className="input" value={form.location_name} maxLength={120} placeholder="BTG Temple" onChange={(e) => set('location_name', e.target.value)} />}
            </Field>
            <Field label="Address" hint="Used for the Directions button.">
              {(p) => <input {...p} className="input" value={form.address} maxLength={240} placeholder="Mbezi Beach, Dar es Salaam" onChange={(e) => set('address', e.target.value)} />}
            </Field>
          </div>
          <Field label="About this event" hint="Leave a blank line between paragraphs.">
            {(p) => <textarea {...p} className="textarea" style={{ minHeight: 160 }} value={form.description} maxLength={8000} onChange={(e) => set('description', e.target.value)} />}
          </Field>
          <details open={!!(form.title_sw || form.description_sw)} className="card soft">
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Kiswahili (optional)</summary>
            <p className="small muted">Members who use the app in Kiswahili see these instead. Leave empty to show the English.</p>
            <div className="stack" style={{ gap: 16 }}>
              <Field label="Name in Kiswahili">
                {(p) => <input {...p} lang="sw" className="input" value={form.title_sw} maxLength={120} placeholder="Kongamano la Mwaka 2026" onChange={(e) => set('title_sw', e.target.value)} />}
              </Field>
              <Field label="About this event, in Kiswahili">
                {(p) => <textarea {...p} lang="sw" className="textarea" style={{ minHeight: 120 }} value={form.description_sw} maxLength={8000} onChange={(e) => set('description_sw', e.target.value)} />}
              </Field>
            </div>
          </details>
          <Field label="Registration link (optional)" error={errors.registration_url} hint="A form or ticket page. Members see a Register button.">
            {(p) => <input {...p} className="input" value={form.registration_url} placeholder="https://" onChange={(e) => set('registration_url', e.target.value)} />}
          </Field>
          <div className="card soft stack tight">
            <span style={{ fontWeight: 600, fontSize: 13 }}>Poster</span>
            <span className="small muted">Shown large on the app’s Today screen, uncropped. Upload one here, or pick one from Instagram on the Events page.</span>
            {form.image_url ? <img src={form.image_url} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 12, background: '#17120E' }} /> : null}
            <div className="row">
              <Button small onClick={() => file.current?.click()} busy={busy === 'upload'}>
                {busy === 'upload' ? 'Uploading…' : form.image_url ? 'Replace poster' : 'Upload poster'}
              </Button>
              {form.image_url ? (
                <Button small variant="ghost" onClick={() => set('image_url', '')}>
                  Remove
                </Button>
              ) : null}
            </div>
            {errors.image_url ? <span className="small" style={{ color: 'var(--danger)' }}>{errors.image_url}</span> : null}
            <input
              ref={file}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) upload(f);
              }}
            />
          </div>
          <div className="row wrap" style={{ gap: 20 }}>
            <label className="check">
              <input type="checkbox" checked={form.livestreamed} onChange={(e) => set('livestreamed', e.target.checked)} />
              Streamed live on YouTube
            </label>
            <label className="check">
              <input type="checkbox" checked={form.remind} onChange={(e) => set('remind', e.target.checked)} />
              Send reminder notifications
            </label>
            {savedStatus !== 'published' ? (
              <label className="check">
                <input type="checkbox" checked={notifyNow} onChange={(e) => setNotifyNow(e.target.checked)} />
                Tell members when it’s published
              </label>
            ) : null}
          </div>
          <div className="actions">
            <Button variant="primary" onClick={() => save('published')} busy={busy === 'published'}>
              {busy === 'published' ? 'Saving…' : savedStatus === 'published' ? 'Save changes' : 'Publish'}
            </Button>
            <Button onClick={() => save('draft')} busy={busy === 'draft'}>
              {savedStatus === 'published' ? 'Move to drafts' : 'Save draft'}
            </Button>
            <span className="grow" />
            {id ? <ConfirmButton label="Delete" confirmLabel="Delete for good?" onConfirm={remove} /> : null}
          </div>
        </div>
        <aside className="preview stack tight" aria-label="Preview">
          <span className="eyebrow">Preview in the app</span>
          <div className="phone" style={{ padding: 0, overflow: 'hidden' }}>
            {form.image_url ? <img src={form.image_url} alt="" style={{ width: '100%', display: 'block' }} /> : null}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="kicker">{form.start ? formatEat(eatInputToIso(form.start)) : 'Date'}</span>
              <h2 style={{ fontSize: 28 }}>{form.title || 'Event name'}</h2>
              {form.location_name ? <span className="small muted">{form.location_name}</span> : null}
              {form.registration_url ? <span className="btn primary small" style={{ alignSelf: 'flex-start' }}>Register</span> : null}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
