'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import LexicalEditor from '@/components/editor/LexicalEditor';
import TypingChart from '@/components/analytics/TypingChart';
import ApeLogo from '@/components/ui/ApeLogo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useTheme } from '@/components/ui/ThemeProvider';
import { Clock, RotateCcw, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { calculateConsistency } from '@/lib/typing/calculateConsistency';

export type ChartDataPoint = {
  time: number;
  wpm: number;
  raw: number;
  errors: number;
  instWpm: number;
};

type FinalStats = {
  wpm: number;
  raw: number;
  accuracy: number;
  consistency: number;
  chars: number;
  time: number;
};

const EMPTY_STATS: FinalStats = {
  wpm: 0, raw: 0, accuracy: 0, consistency: 0, chars: 0, time: 0,
};

export default function Home() {
  const { theme } = useTheme();
  const [isClient, setIsClient] = useState(false);
  const [status, setStatus] = useState<'idle' | 'typing' | 'finished'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [history, setHistory] = useState<ChartDataPoint[]>([]);
  const [finalStats, setFinalStats] = useState<FinalStats>(EMPTY_STATS);
  const [resetKey, setResetKey] = useState(0);

  const timerRef          = useRef<NodeJS.Timeout | null>(null);
  const typedTextRef      = useRef('');
  const totalKeysRef      = useRef(0);
  const errorKeysRef      = useRef(0);
  const prevTotalKeysRef  = useRef(0);
  const elapsedSecondsRef = useRef(0);
  const wpmHistoryRef     = useRef<number[]>([]);
  // AbortController for the fire-and-forget POST; cancelled if user navigates
  // away before the response completes, preventing a request leak.
  const fetchAbortRef     = useRef<AbortController | null>(null);

  // Hydration guard: this component is pure CSR — SSR would produce a
  // theme-conditional render that may not match localStorage on the client.
  useEffect(() => setIsClient(true), []);

  // Clean up in-flight fetch on unmount
  useEffect(() => () => { fetchAbortRef.current?.abort(); }, []);

  const handleRestart = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    fetchAbortRef.current?.abort();
    setStatus('idle');
    setElapsedSeconds(0);
    setHistory([]);
    setFinalStats(EMPTY_STATS);
    typedTextRef.current      = '';
    totalKeysRef.current      = 0;
    errorKeysRef.current      = 0;
    prevTotalKeysRef.current  = 0;
    elapsedSecondsRef.current = 0;
    wpmHistoryRef.current     = [];
    setResetKey(prev => prev + 1);
  }, []);

  // Tab → restart (Shift+Tab handled globally by GlobalShortcuts)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        handleRestart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRestart]);

  const handleTextChange = useCallback((text: string) => {
    typedTextRef.current = text;
    setStatus(current => {
      if (current === 'idle' && text.trim().length > 0) {
        elapsedSecondsRef.current = 1;
        setElapsedSeconds(1);
        return 'typing';
      }
      return current;
    });
  }, []);

  const handleMetricsChange = useCallback((type: 'char' | 'error') => {
    if (type === 'char') totalKeysRef.current += 1;
    else                 errorKeysRef.current += 1;
  }, []);

  useEffect(() => {
    if (status !== 'typing') return;

    timerRef.current = setInterval(() => {
      const newTime  = elapsedSecondsRef.current + 1;
      elapsedSecondsRef.current = newTime;
      const minutes  = newTime / 60;
      const chars    = typedTextRef.current.length;
      const total    = totalKeysRef.current;

      const rawWpm   = minutes > 0 ? Math.round((total / 5) / minutes) : 0;
      const netWpm   = minutes > 0 ? Math.round((chars / 5) / minutes) : 0;
      const keysNow  = total - prevTotalKeysRef.current;
      const instWpm  = Math.round((keysNow / 5) * 60);
      prevTotalKeysRef.current = total;

      wpmHistoryRef.current.push(instWpm);

      setElapsedSeconds(newTime);
      setHistory(prev => [
        ...prev,
        { time: newTime, wpm: netWpm, raw: rawWpm, errors: errorKeysRef.current, instWpm },
      ]);
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const handleFinish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const totalKeys = totalKeysRef.current;
    const errorKeys = errorKeysRef.current;
    const chars     = typedTextRef.current.length;
    const elapsed   = elapsedSecondsRef.current;
    const minutes   = elapsed / 60;

    const wpm         = minutes > 0 ? Math.round((chars / 5) / minutes) : 0;
    const raw         = minutes > 0 ? Math.round((totalKeys / 5) / minutes) : 0;
    const accuracy    = totalKeys === 0 ? 100 : Math.round(((totalKeys - Math.min(errorKeys, totalKeys)) / totalKeys) * 100);
    const consistency = calculateConsistency(wpmHistoryRef.current);

    setFinalStats({ wpm, raw, accuracy, consistency, chars, time: elapsed });
    setStatus('finished');

    // Persist session — fire-and-forget; abort on unmount / restart
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = new AbortController();
    fetch('/api/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  fetchAbortRef.current.signal,
      body: JSON.stringify({
        wpm, raw, accuracy, consistency, chars,
        time: elapsed,
        text: typedTextRef.current,
      }),
    }).catch((err) => {
      if (err?.name !== 'AbortError') {
        console.warn('[session] failed to save:', err);
      }
    });
  }, []);

  // Derived live WPM — memoised so it only recalculates when elapsed changes
  const liveWpm = useMemo(
    () => elapsedSeconds > 0
      ? Math.round((typedTextRef.current.length / 5) / (elapsedSeconds / 60))
      : 0,
    [elapsedSeconds],
  );

  if (!isClient) return null;

  return (
    <main
      className="min-h-screen font-mono flex flex-col items-center py-12 px-8 overflow-y-auto overflow-x-hidden"
      style={{ backgroundColor: 'var(--ape-bg)', color: 'var(--ape-text)' }}
    >
      {/* Header */}
      <header className="w-full max-w-[1000px] flex justify-between items-center ape-header mb-24 z-10">
        <div onClick={handleRestart} className="flex items-center space-x-4 cursor-pointer">
          <ApeLogo className="w-12 h-12" />
          <h1 className="text-4xl tracking-tighter hidden sm:block font-black text-transparent bg-clip-text bg-gradient-to-br from-[#a855f7] to-[#d8b4fe]">
            ApeText.io
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile-only session controls — hidden on desktop */}
          {status !== 'idle' && (
            <div className="flex items-center gap-1.5 sm:hidden">
              <button
                onClick={handleRestart}
                title="Restart"
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg border transition-all duration-150 active:scale-95 font-sans text-xs tracking-wide"
                style={{
                  background:   'var(--ape-bg-card)',
                  borderColor:  'var(--ape-border-kbd)',
                  color:        'var(--ape-text-muted)',
                }}
              >
                <RotateCcw size={12} strokeWidth={2.5} />
                <span>Restart</span>
              </button>
              {status === 'typing' && (
                <button
                  onClick={handleFinish}
                  title="Finish session"
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg border transition-all duration-150 active:scale-95 font-sans text-xs tracking-wide"
                  style={{
                    background:  'rgba(168,85,247,0.12)',
                    borderColor: 'rgba(168,85,247,0.35)',
                    color:       '#a855f7',
                  }}
                >
                  <CheckCheck size={12} strokeWidth={2.5} />
                  <span>Done</span>
                </button>
              )}
            </div>
          )}
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="py-2 px-4 font-sans tracking-widest uppercase text-xs font-semibold rounded-xl border transition-all duration-200"
            style={{
              color: 'var(--ape-text-muted)',
              background: 'var(--ape-bg-card)',
              borderColor: 'var(--ape-border-kbd)',
            }}
          >
            My Notes
          </Link>
        </div>
      </header>

      <section className="w-full max-w-[1000px] flex flex-col relative mt-8">

        {status === 'finished' ? (
          <div className="animate-fade-in flex flex-col w-full">
            <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none z-0" />

            <div className="w-full flex-1 flex flex-col justify-center items-center mt-2">

              {/* Primary metrics: WPM + Accuracy */}
              <div className="flex flex-col md:flex-row md:items-end justify-center md:space-x-12 gap-y-8 mb-10 relative w-full">
                <div className="flex justify-center space-x-12 sm:space-x-16 z-10 shrink-0">
                  <div className="flex flex-col">
                    <span className="text-2xl mb-1 font-sans tracking-widest uppercase" style={{ color: 'var(--ape-text-muted)' }}>wpm</span>
                    <span className="text-7xl leading-none font-black" style={{ color: 'var(--ape-text-purple)' }}>{finalStats.wpm}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl mb-1 font-sans tracking-widest uppercase" style={{ color: 'var(--ape-text-muted)' }}>acc</span>
                    <span className="text-7xl leading-none font-black" style={{ color: 'var(--ape-text-purple)' }}>{finalStats.accuracy}%</span>
                  </div>
                </div>

                {/* Secondary metrics */}
                <div
                  className="flex justify-center flex-wrap md:flex-nowrap items-end gap-x-6 sm:gap-x-8 gap-y-4 mb-2 md:pl-8 md:border-l z-10 opacity-90 w-full md:w-auto"
                  style={{ borderColor: 'var(--ape-border)' }}
                >
                  {[
                    { label: 'raw',         value: String(finalStats.raw) },
                    { label: 'chars',       value: String(finalStats.chars) },
                    { label: 'consistency', value: `${finalStats.consistency}%`, mobileHidden: true },
                    { label: 'time',        value: `${finalStats.time}s` },
                  ].map(({ label, value, mobileHidden }) => (
                    <div key={label} className={`${mobileHidden ? 'hidden sm:flex' : 'flex'} flex-col justify-end shrink-0`}>
                      <span className="text-xs mb-1 font-sans tracking-widest uppercase" style={{ color: 'var(--ape-text-muted)' }}>{label}</span>
                      <span className="text-4xl leading-none font-bold" style={{ color: 'var(--ape-text-violet)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex w-full justify-center items-center gap-4 z-10 mb-8 mt-4">
                {/* Restart */}
                <button
                  onClick={handleRestart}
                  className="group relative px-10 py-3 backdrop-blur-sm transition-all duration-300 rounded-xl overflow-hidden font-sans uppercase tracking-widest text-xs font-semibold shadow-xl hover:-translate-y-1 flex items-center justify-center"
                  style={{
                    background: 'var(--ape-bg-card)',
                    color: 'var(--ape-text)',
                    border: '1px solid var(--ape-border-kbd)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#a855f7]/20 to-blue-600/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <span className="relative z-10 flex items-center space-x-3">
                    <span>Restart Test</span>
                    <span
                      className="hidden sm:inline opacity-60 text-[10px] px-2 py-0.5 rounded border transition-colors"
                      style={{ background: 'var(--ape-bg-pill)', borderColor: 'var(--ape-border-kbd)' }}
                    >
                      TAB
                    </span>
                  </span>
                </button>

                {/* View Notes */}
                <Link
                  href="/dashboard"
                  className="group relative px-10 py-3 backdrop-blur-sm transition-all duration-300 rounded-xl overflow-hidden font-sans uppercase tracking-widest text-xs font-semibold shadow-xl hover:-translate-y-1 flex items-center justify-center"
                  style={{
                    background: 'var(--ape-bg-card)',
                    color: 'var(--ape-text)',
                    border: '1px solid var(--ape-border-kbd)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-[#a855f7]/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <span className="relative z-10 flex items-center space-x-3">
                    <span>View Notes</span>
                    <span
                      className="hidden sm:inline opacity-60 text-[10px] px-2 py-0.5 rounded border transition-colors"
                      style={{ background: 'var(--ape-bg-pill)', borderColor: 'var(--ape-border-kbd)' }}
                    >
                      Shift+Tab
                    </span>
                  </span>
                </Link>
              </div>

              {/* Chart */}
              <div
                className="w-full mt-4 backdrop-blur-md rounded-3xl pt-8 pb-4 px-6 shadow-xl relative border"
                style={{ background: 'var(--ape-bg-chart)', borderColor: 'var(--ape-border)' }}
              >
                <TypingChart dataPoints={history} />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full">
            <div className="absolute top-1/2 left-1/2 w-[600px] h-[300px] bg-purple-600/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />

            {/* Live timer + WPM */}
            <div className={`flex items-center space-x-6 mb-8 ml-1 transition-opacity duration-300 relative z-10 ${status === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
              <div className="flex items-center space-x-4 text-5xl sm:text-6xl font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-[#a855f7] to-[#d8b4fe]">
                <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-[#a855f7]" strokeWidth={2.5} />
                <span>{elapsedSeconds}</span>
              </div>
              <div className="text-2xl leading-none flex items-baseline space-x-2" style={{ color: 'var(--ape-text-muted)' }}>
                <span className="font-bold" style={{ color: 'var(--ape-text-violet)' }}>{liveWpm}</span>
                <span className="font-sans tracking-widest uppercase text-sm">wpm</span>
              </div>
            </div>

            {/* Editor */}
            <div className="relative text-3xl sm:text-4xl md:text-5xl tracking-wide leading-relaxed z-10 drop-shadow-sm">
              <LexicalEditor
                key={resetKey}
                onFinish={handleFinish}
                onChangeText={handleTextChange}
                onMetricsChange={handleMetricsChange}
              />
            </div>

            {/* Keyboard hints */}
            <div className={`mt-24 pb-12 font-sans text-sm transition-opacity duration-500 z-10 hidden sm:flex flex-wrap gap-y-4 items-center ${status === 'typing' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ color: 'var(--ape-text-muted)' }}>
              {[
                { keys: ['Shift', '+', 'Enter'], label: 'to finish session' },
                { keys: ['Tab'],                 label: 'to restart' },
              ].map(({ keys, label }, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <span className="mx-6 hidden sm:inline" style={{ color: 'var(--ape-border-div)' }}>|</span>}
                  {keys.map((k, j) => (
                    k === '+' ? (
                      <span key={j} className="mx-2">+</span>
                    ) : (
                      <kbd
                        key={j}
                        className="rounded-md px-2.5 py-1 font-semibold text-xs tracking-wider uppercase shadow-sm border"
                        style={{
                          background: 'var(--ape-bg-kbd)',
                          borderColor: 'var(--ape-border-kbd)',
                          color: 'var(--ape-text-violet)',
                        }}
                      >
                        {k}
                      </kbd>
                    )
                  ))}
                  <span className="ml-3 tracking-wide">{label}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Persistent footer */}
      <footer className="w-full max-w-[1000px] mt-auto pt-16 pb-8 hidden sm:flex flex-wrap justify-center gap-x-8 gap-y-3 font-sans text-xs" style={{ color: 'var(--ape-text-muted)' }}>
        {[
          theme === 'dark'
            ? { keys: ['ctrl', 'l'], label: 'light mode' }
            : { keys: ['ctrl', 'd'], label: 'dark mode' },
          { keys: ['ctrl', 'm'], label: 'toggle theme' },
        ].map(({ keys, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            {keys.map((k, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="opacity-50">+</span>}
                <kbd
                  className="px-2 py-0.5 rounded-md text-[11px] border"
                  style={{
                    background:  'var(--ape-bg-kbd)',
                    borderColor: 'var(--ape-border-kbd)',
                    color:       'var(--ape-text-muted)',
                  }}
                >
                  {k}
                </kbd>
              </span>
            ))}
            <span className="ml-1 opacity-70">- {label}</span>
          </span>
        ))}
      </footer>
    </main>
  );
}
