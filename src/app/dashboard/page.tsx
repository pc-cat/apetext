import Link from 'next/link';
import ApeLogo from '@/components/ui/ApeLogo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import SessionCard, { SessionData } from '@/components/dashboard/SessionCard';

const MOCK_SESSIONS: SessionData[] = [
  {
    id: 'sess_1',
    wpm: 120,
    accuracy: 98,
    date: '2023-01-01T00:00:00.000Z',
    text: 'The quick brown fox jumps over the lazy dog. A true classic for testing out the keyboard, making sure the keys flow exactly how you anticipate them to.',
  },
  {
    id: 'sess_2',
    wpm: 95,
    accuracy: 94,
    date: '2023-01-02T00:00:00.000Z',
    text: 'I have noticed that typing inside Zen mode fundamentally shifts my baseline concentration. Without the rigid validation of standard tests forcing me to backtrack over red letters aggressively, my rhythm stretches out organically.',
  },
  {
    id: 'sess_3',
    wpm: 145,
    accuracy: 100,
    date: '2023-01-03T00:00:00.000Z',
    text: 'Speed is nothing without accuracy playing wingman.',
  },
  {
    id: 'sess_4',
    wpm: 110,
    accuracy: 92,
    date: '2023-01-04T00:00:00.000Z',
    text: 'If we are going to talk about mechanical keyboards, we need to talk about switches. Tactile feedback provides an artificial rhythm track that my fingers subconsciously follow.',
  },
  {
    id: 'sess_5',
    wpm: 105,
    accuracy: 89,
    date: '2023-01-05T00:00:00.000Z',
    text: "JavaScript's Blob API is severely underrated. Just construct a Blob locally, mount it to an invisible anchor element in the DOM, and execute a synthetic click event. The browser naturally spools it up and issues a native save prompt.",
  },
  {
    id: 'sess_6',
    wpm: 135,
    accuracy: 97,
    date: '2023-01-06T00:00:00.000Z',
    text: 'Final burst of speed! Hitting the absolute limit of what my hands can parse before the muscular fatigue kicks in and drops my consistency metrics.',
  },
];

export default function Dashboard() {
  return (
    <main
      className="min-h-screen font-mono flex flex-col items-center py-12 px-8 overflow-y-auto"
      style={{ backgroundColor: 'var(--ape-bg)', color: 'var(--ape-text)' }}
    >
      {/* Header */}
      <header className="w-full max-w-[1400px] flex justify-between items-center ape-header mb-12 z-10 px-4">
        <Link href="/" className="flex items-center space-x-4 group cursor-pointer" style={{ color: 'var(--ape-text)' }}>
          <ApeLogo className="w-12 h-12 group-hover:scale-105 transition-transform" />
          <h1 className="text-3xl tracking-tighter hidden sm:block font-black text-transparent bg-clip-text bg-gradient-to-br from-[#a855f7] to-[#d8b4fe]">
            ApeText.io
          </h1>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span
            className="font-sans tracking-widest uppercase text-xs px-4 py-2 rounded-xl border shadow-inner"
            style={{
              color: 'var(--ape-text-muted)',
              background: 'var(--ape-bg-card)',
              borderColor: 'var(--ape-border-kbd)',
            }}
          >
            My Notes
          </span>
        </div>
      </header>

      {/* Masonry grid */}
      <section className="w-full max-w-[1400px] px-4 relative z-10">
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 w-full">
          {MOCK_SESSIONS.map(sess => (
            <SessionCard key={sess.id} session={sess} />
          ))}
        </div>
      </section>

      {/* Ambient glow */}
      <div className="fixed top-1/2 left-1/2 w-[800px] h-[500px] bg-purple-600/5 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
    </main>
  );
}
