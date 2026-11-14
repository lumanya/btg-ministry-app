import { useEffect, useMemo, useRef, useState } from 'react';

import { go } from '../App';
import { eatInputToIso, formatEat, friendlyError, isoToEatInput } from '../lib';
import { db } from '../supabase';
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

  useEffect(() => {
    db()
      .from('events')
      .select(COLUMNS)
      .order('starts_at', { ascending: true })
      .limit(300)
      .then(({ data, error }) => {
        if (error) setError(friendlyError(error));
        else setRows(data as EventRow[]);
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
        intro="Conferences and special services. Published events show on the app’s Home screen, with reminders the day before and an hour before."
        actions={
          <a className="btn primary" href="#/events/new">
            New event
          </a>
        }
      />
      {error ? <div className="notice error">{error}</div> : null}
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

export function EventEditor({ id }: { id: string | null }) {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(id ? null : blank());
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
    setForm({ ...form, status });
    setSavedStatus(status);
    toast(status === 'published' ? 'Published. It’s on the app’s Home screen now.' : 'Saved as a draft.');
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
    toast('Picture uploaded. Save to keep it.');
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
            <span style={{ fontWeight: 600, fontSize: 13 }}>Picture (optional)</span>
            {form.image_url ? <img src={form.image_url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12 }} /> : null}
            <div className="row">
              <Button small onClick={() => file.current?.click()} busy={busy === 'upload'}>
                {busy === 'upload' ? 'Uploading…' : form.image_url ? 'Replace picture' : 'Upload picture'}
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
            {form.image_url ? <img src={form.image_url} alt="" style={{ width: '100%', height: 150, objectFit: 'cover' }} /> : null}
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
