import { useEffect, useRef, useState } from 'react';

import { go } from '../App';
import { addDays, devotionalState, formatDay, friendlyError, slugify, todayInTanzania } from '../lib';
import { db } from '../supabase';
import { Button, ConfirmButton, Field, Loading, PageHead, Segment, useToast } from '../ui';
import { STATE_LABEL } from './Devotionals';

type Form = {
  title: string;
  slug: string;
  subtitle: string;
  scripture_ref: string;
  scripture_text: string;
  excerpt: string;
  body: string;
  series_id: string;
  audio_url: string;
  publish_on: string;
  status: 'draft' | 'published';
  title_sw: string;
  subtitle_sw: string;
  scripture_text_sw: string;
  excerpt_sw: string;
  body_sw: string;
};

/** The fields written in each language; everything else is shared. */
type TextKey = 'title' | 'subtitle' | 'scripture_text' | 'excerpt' | 'body';
type Lang = 'en' | 'sw';

type Series = { id: string; name: string };

const blank = (date: string): Form => ({
  title: '',
  slug: '',
  subtitle: '',
  scripture_ref: '',
  scripture_text: '',
  excerpt: '',
  body: '',
  series_id: '',
  audio_url: '',
  publish_on: date,
  status: 'draft',
  title_sw: '',
  subtitle_sw: '',
  scripture_text_sw: '',
  excerpt_sw: '',
  body_sw: '',
});

export default function DevotionalEditor({ id, query }: { id: string | null; query: URLSearchParams }) {
  const toast = useToast();
  const today = todayInTanzania();
  const [form, setForm] = useState<Form | null>(id ? null : blank(query.get('date') || addDays(today, 1)));
  const [saved, setSaved] = useState<Form | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [slugTouched, setSlugTouched] = useState(!!id);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    db()
      .from('series')
      .select('id,name')
      .order('sort')
      .then(({ data }) => setSeries((data as Series[]) ?? []));
    if (!id) return;
    db()
      .from('devotionals')
      .select('title,slug,subtitle,scripture_ref,scripture_text,excerpt,body,series_id,audio_url,publish_on,status,title_sw,subtitle_sw,scripture_text_sw,excerpt_sw,body_sw')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return setLoadError(error ? friendlyError(error) : 'This devotional no longer exists.');
        const f = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ''])) as Form;
        setForm(f);
        setSaved(f);
      });
  }, [id]);

  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(saved ?? blank(form.publish_on));
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (loadError) return <div className="notice error">{loadError}</div>;
  if (!form) return <Loading />;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => {
      if (!f) return f;
      const next = { ...f, [key]: value };
      if (key === 'title' && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = 'Give the devotional a title.';
    if (e.title) setLang('en');
    if (form.body_sw.trim() && !form.title_sw.trim()) {
      e.title_sw = 'Add the Kiswahili title too, or clear the Kiswahili text.';
      if (!e.title) setLang('sw');
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) e.slug = 'Use lowercase letters and numbers, joined by hyphens.';
    if (e.slug) setLinkOpen(true);
    if (!form.publish_on) e.publish_on = 'Choose the day it appears.';
    if (form.audio_url && !/^https:\/\//.test(form.audio_url)) e.audio_url = 'Use a link that starts with https://';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (status: Form['status'], label: string) => {
    if (!validate()) {
      toast('Check the highlighted fields.', 'error');
      return;
    }
    setBusy(label);
    const row = {
      title: form.title.trim(),
      slug: form.slug,
      subtitle: form.subtitle.trim() || null,
      scripture_ref: form.scripture_ref.trim() || null,
      scripture_text: form.scripture_text.trim() || null,
      excerpt: form.excerpt.trim(),
      body: form.body.trim(),
      series_id: form.series_id || null,
      audio_url: form.audio_url.trim() || null,
      publish_on: form.publish_on,
      status,
      title_sw: form.title_sw.trim() || null,
      subtitle_sw: form.subtitle_sw.trim() || null,
      scripture_text_sw: form.scripture_text_sw.trim() || null,
      excerpt_sw: form.excerpt_sw.trim() || null,
      body_sw: form.body_sw.trim() || null,
    };
    const res = id
      ? await db().from('devotionals').update(row).eq('id', id).select('id').single()
      : await db().from('devotionals').insert(row).select('id').single();
    setBusy(null);
    if (res.error) {
      if (res.error.code === '23505') {
        setErrors((e) => ({ ...e, slug: 'Another devotional already uses this link.' }));
        setLinkOpen(true);
      }
      toast(friendlyError(res.error), 'error');
      return;
    }
    const next = { ...form, status };
    setForm(next);
    setSaved(next);
    const state = devotionalState(status, form.publish_on, today);
    toast(state === 'draft' ? 'Saved as a draft.' : state === 'scheduled' ? `Scheduled for ${formatDay(form.publish_on)}.` : 'Published. Members can read it now.');
    if (!id) go(`/devotionals/${res.data.id}`);
  };

  const remove = async () => {
    if (!id) return;
    const { error } = await db().from('devotionals').delete().eq('id', id);
    if (error) return toast(friendlyError(error), 'error');
    toast('Devotional deleted.');
    setSaved(form);
    go('/devotionals');
  };

  const upload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) return toast('That file is over 50 MB. Export a smaller MP3 and try again.', 'error');
    setBusy('upload');
    const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
    const path = `devotionals/${form.slug || 'audio'}-${Date.now()}.${ext}`;
    const { error } = await db().storage.from('media').upload(path, file, { contentType: file.type || undefined, upsert: false });
    setBusy(null);
    if (error) return toast(friendlyError(error), 'error');
    set('audio_url', db().storage.from('media').getPublicUrl(path).data.publicUrl);
    toast('Recording uploaded. Save to keep it.');
  };

  const state = devotionalState(form.status, form.publish_on, today);
  const savedState = saved ? devotionalState(saved.status, saved.publish_on, today) : null;
  const future = form.publish_on > today;
  const publishLabel = future ? `Schedule for ${formatDay(form.publish_on)}` : 'Publish now';
  // The text fields for the language being edited.
  const k = (key: TextKey) => (lang === 'sw' ? (`${key}_sw` as const) : key);
  const text = (key: TextKey) => form[k(key)];
  const paras = text('body').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const hasSw = !!(form.title_sw.trim() || form.body_sw.trim());

  return (
    <>
      <PageHead
        eyebrow={id ? 'Edit devotional' : 'New devotional'}
        title={form.title.trim() || 'Untitled devotional'}
        intro={
          savedState ? (
            <span className="row">
              <span className={`pill ${savedState}`}>{STATE_LABEL[savedState]}</span>
              {formatDay(saved!.publish_on)}
              {dirty ? ' · unsaved changes' : ''}
            </span>
          ) : (
            'Write it once; it appears in the app on the day you choose.'
          )
        }
        actions={
          <a className="btn ghost" href="#/devotionals">
            Back to devotionals
          </a>
        }
      />

      <div className="editor">
        <div className="stack" style={{ gap: 20 }}>
          <div className="stack tight">
            <Segment<Lang>
              label="Language"
              value={lang}
              onChange={setLang}
              options={[
                { value: 'en', label: 'English' },
                { value: 'sw', label: hasSw ? 'Kiswahili ✓' : 'Kiswahili' },
              ]}
            />
            <span className="small muted">
              {lang === 'sw'
                ? 'Members who use the app in Kiswahili see this version. Leave it empty and they see the English one.'
                : 'Add a Kiswahili version under “Kiswahili”. Date, series, scripture reference and recording are shared.'}
            </span>
          </div>
          <Field label={lang === 'sw' ? 'Title (Kiswahili)' : 'Title'} error={lang === 'sw' ? errors.title_sw : errors.title}>
            {(p) => <input {...p} className="input" lang={lang} value={text('title')} onChange={(e) => set(k('title'), e.target.value)} maxLength={160} />}
          </Field>
          <div className="grid-2">
            <Field label="Appears on" hint="The day it becomes “Today’s devotional”." error={errors.publish_on}>
              {(p) => <input {...p} className="input" type="date" value={form.publish_on} onChange={(e) => set('publish_on', e.target.value)} />}
            </Field>
            <Field label="Series">
              {(p) => (
                <select {...p} className="select" value={form.series_id} onChange={(e) => set('series_id', e.target.value)}>
                  <option value="">None</option>
                  {series.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Scripture reference" hint="For example: Acts 3:19">
              {(p) => <input {...p} className="input" value={form.scripture_ref} onChange={(e) => set('scripture_ref', e.target.value)} maxLength={80} />}
            </Field>
            <Field label="Subtitle (optional)">
              {(p) => <input {...p} className="input" lang={lang} value={text('subtitle')} onChange={(e) => set(k('subtitle'), e.target.value)} maxLength={160} />}
            </Field>
          </div>
          <Field label="Scripture text (optional)" hint={lang === 'sw' ? 'From the Swahili Union Version (SUV).' : 'Shown as the verse card at the top of the reading.'}>
            {(p) => <textarea {...p} className="textarea" lang={lang} style={{ minHeight: 80 }} value={text('scripture_text')} onChange={(e) => set(k('scripture_text'), e.target.value)} maxLength={1000} />}
          </Field>
          <Field label={lang === 'sw' ? 'Devotional (Kiswahili)' : 'Devotional'} hint="Leave a blank line between paragraphs.">
            {(p) => <textarea {...p} className="textarea tall" lang={lang} value={text('body')} onChange={(e) => set(k('body'), e.target.value)} maxLength={40000} />}
          </Field>
          <Field label="Short summary (optional)" hint="Shown on the home screen card. If empty, the first paragraph is used.">
            {(p) => <textarea {...p} className="textarea" lang={lang} style={{ minHeight: 70 }} value={text('excerpt')} onChange={(e) => set(k('excerpt'), e.target.value)} maxLength={400} />}
          </Field>

          <div className="card soft stack tight">
            <span className="label" style={{ fontWeight: 600, fontSize: 13 }}>
              Recording (optional)
            </span>
            <p className="small muted">Upload an MP3 of the devotional being read. Members get a “Listen” button.</p>
            {form.audio_url ? (
              <div className="stack tight">
                <audio controls src={form.audio_url} style={{ width: '100%' }} />
                <div className="row">
                  <Button small onClick={() => fileInput.current?.click()} busy={busy === 'upload'}>
                    Replace
                  </Button>
                  <Button small variant="ghost" onClick={() => set('audio_url', '')}>
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="row">
                <Button small onClick={() => fileInput.current?.click()} busy={busy === 'upload'}>
                  {busy === 'upload' ? 'Uploading…' : 'Upload recording'}
                </Button>
              </div>
            )}
            {errors.audio_url ? <span className="small" style={{ color: 'var(--danger)' }}>{errors.audio_url}</span> : null}
            <input
              ref={fileInput}
              type="file"
              accept="audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) upload(f);
              }}
            />
          </div>

          <details open={linkOpen} onToggle={(e) => setLinkOpen(e.currentTarget.open)}>
            <summary className="small muted" style={{ cursor: 'pointer' }}>
              Link: btgministry.org/devotional/{form.slug || '…'}
            </summary>
            <div style={{ marginTop: 12 }}>
              <Field label="Link name" hint="Lowercase words joined by hyphens. Changing it breaks links already shared." error={errors.slug}>
                {(p) => (
                  <input
                    {...p}
                    className="input"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set('slug', e.target.value.toLowerCase());
                    }}
                    maxLength={100}
                  />
                )}
              </Field>
            </div>
          </details>

          <div className="actions">
            {state === 'draft' ? (
              <>
                <Button variant="primary" onClick={() => save('published', 'publish')} busy={busy === 'publish'}>
                  {busy === 'publish' ? 'Saving…' : publishLabel}
                </Button>
                <Button onClick={() => save('draft', 'draft')} busy={busy === 'draft'}>
                  {busy === 'draft' ? 'Saving…' : 'Save draft'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" onClick={() => save('published', 'publish')} busy={busy === 'publish'}>
                  {busy === 'publish' ? 'Saving…' : future ? publishLabel : 'Save changes'}
                </Button>
                <Button onClick={() => save('draft', 'draft')} busy={busy === 'draft'}>
                  Move to drafts
                </Button>
              </>
            )}
            <span className="grow" />
            {id ? <ConfirmButton label="Delete" confirmLabel="Delete for good?" onConfirm={remove} /> : null}
          </div>
        </div>

        <aside className="preview stack tight" aria-label="Preview">
          <span className="eyebrow">Preview in the app{lang === 'sw' ? ' · Kiswahili' : ''}</span>
          <div className="phone" lang={lang}>
            <span className="kicker">{lang === 'sw' ? 'Tafakari ya kila siku' : 'Daily devotional'} · {formatDay(form.publish_on)}</span>
            <h2>{text('title') || 'Title'}</h2>
            {text('subtitle') ? <span className="sub">{text('subtitle')}</span> : null}
            {text('scripture_text') ? (
              <div className="verse">
                “{text('scripture_text')}”<small>{form.scripture_ref} · {lang === 'sw' ? 'SUV' : 'KJV'}</small>
              </div>
            ) : form.scripture_ref ? (
              <span className="kicker">{form.scripture_ref}</span>
            ) : null}
            {paras.length ? paras.map((p, i) => <p key={i}>{p}</p>) : <p className="muted">The devotional text appears here as you type.</p>}
          </div>
        </aside>
      </div>
    </>
  );
}
