import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import VideoEmbed from '@/components/common/VideoEmbed';
import { useAuth } from '@/lib/session';
import { FOCUS_AREAS } from '@/lib/intakeOptions';
import { parseYouTubeId } from '@/lib/youtube';
import { createVideo, deleteVideo, getVideo, updateVideo } from '@/lib/supabase/videos';
import type { Video } from '@/types/video';

export default function VideoEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [urlInput, setUrlInput] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [regions, setRegions] = useState<string[]>([]);
  const [status, setStatus] = useState<Video['status']>('live');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    getVideo(id!)
      .then((v) => {
        if (!v) return;
        setYoutubeId(v.youtube_id);
        setUrlInput(`https://youtu.be/${v.youtube_id}`);
        setTitle(v.title);
        setDescription(v.description ?? '');
        setRegions(v.regions);
        setStatus(v.status);
      })
      .catch((e) => setError(e.message));
  }, [id, isNew]);

  function onUrlChange(value: string) {
    setUrlInput(value);
    const parsed = parseYouTubeId(value);
    setYoutubeId(parsed ?? '');
  }

  const toggleRegion = (key: string) =>
    setRegions((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!youtubeId) {
      setError('Paste a valid YouTube link first.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const draft = { youtube_id: youtubeId, title, description: description || null, regions, status };
    try {
      if (isNew) {
        const created = await createVideo(profile.user_id, draft);
        navigate(`/trainer/videos/${created.id}`, { replace: true });
      } else {
        await updateVideo(id!, draft);
        setNotice('Saved.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!id || isNew) return;
    if (!confirm('Delete this video from your library?')) return;
    try {
      await deleteVideo(id);
      navigate('/trainer/videos', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AppShell title={isNew ? 'New video' : title || 'Edit video'}>
      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}
      {notice && <p role="status" className="card mb-4 border-emerald-700 text-emerald-300">{notice}</p>}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="card flex flex-col gap-4">
          <div>
            <label htmlFor="url" className="field-label">YouTube link</label>
            <input
              id="url"
              className="field-input"
              required
              placeholder="https://youtu.be/… or https://www.youtube.com/watch?v=…"
              value={urlInput}
              onChange={(e) => onUrlChange(e.target.value)}
            />
            {urlInput && !youtubeId && (
              <p className="mt-1 text-xs text-amber-300">That doesn’t look like a YouTube link yet.</p>
            )}
          </div>

          {youtubeId && <VideoEmbed youtubeId={youtubeId} title={title || 'Preview'} />}

          <div>
            <label htmlFor="title" className="field-label">Title</label>
            <input
              id="title"
              className="field-input"
              required
              placeholder="Doorway pec stretch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="desc" className="field-label">
              Description <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              id="desc"
              rows={2}
              className="field-input"
              placeholder="What this covers, any cues…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <span className="field-label">Body areas <span className="text-slate-500">(tap any that apply)</span></span>
            <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Body areas">
              {FOCUS_AREAS.map((a) => {
                const on = regions.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleRegion(a.key)}
                    className={`chip border ${on ? 'border-sky-500 bg-sky-500/20 text-sky-200' : 'border-slate-700 text-slate-300'}`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="status" className="field-label">Visibility</label>
            <select id="status" className="field-input" value={status} onChange={(e) => setStatus(e.target.value as Video['status'])}>
              <option value="live">Live — clients can see it</option>
              <option value="draft">Draft — hidden from clients</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Add to library' : 'Save changes'}
        </button>
      </form>

      {!isNew && (
        <button type="button" onClick={() => void onDelete()} className="btn-danger mt-3 w-full">
          Delete video
        </button>
      )}
    </AppShell>
  );
}
