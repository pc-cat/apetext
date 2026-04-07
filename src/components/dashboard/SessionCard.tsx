'use client';
import { Download } from 'lucide-react';

export interface SessionData {
  id: string;
  wpm: number;
  accuracy: number;
  date: string;
  text: string;
}

export default function SessionCard({ session }: { session: SessionData }) {
  const handleDownload = () => {
    const blob = new Blob([session.text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `apetext-${session.date.split('T')[0] ?? 'session'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="break-inside-avoid mb-4 p-5 rounded-2xl backdrop-blur-md flex flex-col group transition-all shadow-lg hover:-translate-y-0.5 border"
      style={{
        background:   'var(--ape-bg-card)',
        borderColor:  'var(--ape-border)',
      }}
    >
      {/* Top row: stats + download */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span
            className="text-xs font-sans tracking-widest uppercase block mb-1"
            style={{ color: 'var(--ape-text-muted)' }}
          >
            Results
          </span>
          <div className="flex items-baseline space-x-3">
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#a855f7] to-[#d8b4fe]">
              {session.wpm}{' '}
              <span className="text-sm tracking-widest uppercase font-sans text-[#a855f7]">wpm</span>
            </span>
            <span className="font-bold text-lg" style={{ color: 'var(--ape-text-violet)' }}>
              {session.accuracy}%{' '}
              <span className="text-[10px] uppercase font-sans tracking-widest" style={{ color: 'var(--ape-text-muted)' }}>acc</span>
            </span>
          </div>
        </div>

        <button
          onClick={handleDownload}
          title="Download .txt"
          className="p-2.5 rounded-xl transition-all border border-transparent hover:border-[#a855f7]/40 opacity-60 group-hover:opacity-100 flex items-center justify-center cursor-pointer"
          style={{
            background: 'var(--ape-bg-kbd)',
            color:      'var(--ape-text-muted)',
          }}
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Session text preview */}
      <p
        className="text-sm leading-relaxed overflow-hidden text-ellipsis line-clamp-[12]"
        style={{ color: 'var(--ape-text-muted)' }}
      >
        {session.text}
      </p>

      {/* Footer */}
      <div
        className="mt-5 pt-4 border-t flex justify-between items-center text-[10px] font-sans tracking-widest uppercase"
        style={{
          borderColor: 'var(--ape-border)',
          color:       'var(--ape-text-muted)',
        }}
      >
        <span>{new Date(session.date).toLocaleDateString()}</span>
        <span>{session.text.length} chars</span>
      </div>
    </div>
  );
}
