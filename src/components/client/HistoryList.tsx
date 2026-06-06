import { useState } from 'react';
import { clearHistory, getHistory } from '@/lib/localHistory';

/** Last 10 local attempts for a movement (timestamps + ROM% only). */
export default function HistoryList({ movementId }: { movementId: string }) {
  const [history, setHistory] = useState(() => getHistory(movementId));

  if (history.length === 0) {
    return <p className="text-sm text-slate-500">No attempts yet. Your last 10 are kept on this device.</p>;
  }

  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Your recent attempts</h3>
        <button
          type="button"
          className="text-xs text-slate-400 hover:text-red-300"
          onClick={() => {
            clearHistory(movementId);
            setHistory([]);
          }}
        >
          Clear history
        </button>
      </div>
      <ul className="divide-y divide-slate-800 text-sm">
        {history.map((h, i) => (
          <li key={i} className="flex items-center justify-between py-2">
            <span className="text-slate-300">{new Date(h.attempted_at).toLocaleString()}</span>
            <span className="font-semibold tabular-nums">{Math.round(h.rom_achieved_pct)}%</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">Stored only on this device — no video leaves your phone.</p>
    </div>
  );
}
