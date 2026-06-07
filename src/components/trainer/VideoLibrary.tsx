import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import { useAuth } from '@/lib/session';
import { listTrainerVideos } from '@/lib/supabase/videos';
import { thumbnailUrl } from '@/lib/youtube';
import { focusAreaLabels } from '@/lib/intakeOptions';
import type { Video } from '@/types/video';

/** The trainer's video library: YouTube links they can reuse across stretches
 * (and, later, movements). Built-in platform videos show read-only alongside. */
export default function VideoLibrary() {
  const { profile } = useAuth();
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    listTrainerVideos(profile.user_id)
      .then(setVideos)
      .catch((e) => setError(e.message));
  }, [profile]);

  const own = videos?.filter((v) => v.trainer_id === profile?.user_id) ?? [];
  const builtIn = videos?.filter((v) => v.trainer_id === null) ?? [];

  return (
    <AppShell title="Videos">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Video library</h2>
          <p className="text-sm text-slate-400">
            {videos ? `${own.length} yours · ${builtIn.length} built-in` : 'YouTube links you can reuse'}
          </p>
        </div>
        <Link to="/trainer/videos/new" className="btn-primary">
          + Add video
        </Link>
      </div>

      <div className="card mb-4 border-slate-800 bg-slate-900/40 text-sm text-slate-300">
        <p className="font-medium text-slate-200">How it works</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-slate-400">
          <li>Paste a YouTube link — the app pulls in the preview automatically.</li>
          <li>Give it a title and tag the body areas it covers.</li>
          <li>Attach it to a stretch so clients can watch it without leaving the app.</li>
        </ol>
      </div>

      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}

      {videos === null ? (
        <p className="text-slate-400">Loading videos…</p>
      ) : (
        <>
          {own.length === 0 ? (
            <p className="card mb-6 text-slate-400">No videos yet. Add your first YouTube link above.</p>
          ) : (
            <ul className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {own.map((v) => (
                <VideoTile key={v.id} video={v} to={`/trainer/videos/${v.id}`} />
              ))}
            </ul>
          )}

          {builtIn.length > 0 && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">Built-in library</h3>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {builtIn.map((v) => (
                  <VideoTile key={v.id} video={v} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}

function VideoTile({ video, to }: { video: Video; to?: string }) {
  const regions = focusAreaLabels(video.regions);
  const body = (
    <div className="card flex gap-3 hover:border-sky-700">
      <img
        src={thumbnailUrl(video.youtube_id)}
        alt=""
        loading="lazy"
        className="h-16 w-28 shrink-0 rounded-lg border border-slate-800 object-cover"
      />
      <div className="min-w-0">
        <p className="truncate font-medium">{video.title}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {to ? (video.status === 'live' ? 'Live' : video.status === 'draft' ? 'Draft' : 'Archived') : 'Built-in'}
        </p>
        {regions.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {regions.map((r) => (
              <span key={r} className="chip border border-slate-700 text-[11px] text-slate-300">{r}</span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
  return to ? <li><Link to={to}>{body}</Link></li> : <li>{body}</li>;
}
