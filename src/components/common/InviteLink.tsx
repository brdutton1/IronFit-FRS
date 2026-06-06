import { useState } from 'react';
import { siteUrl } from '@/lib/supabase/client';

function inviteUrl(code: string): string {
  return `${siteUrl.replace(/\/$/, '')}/intake/${code}`;
}

/** The shareable intake link for a trainer, with a copy button. */
export default function InviteLink({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!code) {
    return <p className="text-sm text-slate-400">Your intake link will appear here once your account finishes setting up.</p>;
  }

  const url = inviteUrl(code);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <code className="block break-all rounded-lg bg-slate-900/70 px-3 py-2 text-sm text-sky-200">{url}</code>
      <button type="button" onClick={() => void copy()} className="btn-primary self-start">
        {copied ? 'Copied ✓' : 'Copy link'}
      </button>
    </div>
  );
}
