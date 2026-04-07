'use client';
import { memo, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  TooltipItem,
  Chart,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ChartDataPoint } from '@/app/page';
import { useTheme } from '@/components/ui/ThemeProvider';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

// ── Custom plugin: draw ✕ on the error line at seconds where errors occurred ──
// Defined at module scope — stable reference, never recreated.
const errorMarkPlugin = {
  id: 'errorMarks',
  afterDraw(chart: Chart) {
    const ctx      = chart.ctx;
    const meta     = chart.getDatasetMeta(1);           // errors dataset
    const errData  = chart.data.datasets[1]?.data as number[];
    if (!errData || !meta.data.length) return;

    errData.forEach((err, i) => {
      const prev = i > 0 ? (errData[i - 1] ?? 0) : 0;
      if (err <= prev) return;                          // no new error this second

      const point = meta.data[i] as { x: number; y: number };
      if (!point) return;

      const { x, y } = point;
      const s = 5;

      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth   = 2;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s);
      ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s);
      ctx.stroke();
      ctx.restore();
    });
  },
};

// Stable plugin array — same reference every render
const PLUGINS = [errorMarkPlugin];

function TypingChart({ dataPoints = [] }: { dataPoints?: ChartDataPoint[] }) {
  const { theme } = useTheme();
  const isLight   = theme === 'light';

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div
        className="w-full h-48 md:h-64 flex items-center justify-center opacity-50"
        style={{ color: 'var(--ape-text-muted)' }}
      >
        No typing data recorded. Session was too short.
      </div>
    );
  }

  // ── Derived arrays — stable until dataPoints reference changes ────────────
  const labels  = useMemo(() => dataPoints.map(dp => dp.time),   [dataPoints]);
  const wpmData = useMemo(() => dataPoints.map(dp => dp.wpm),    [dataPoints]);
  const errData = useMemo(() => dataPoints.map(dp => dp.errors), [dataPoints]);

  // ── Theme-aware palette ──────────────────────────────────────────────────
  const options = useMemo(() => {
    const tickColor     = isLight ? '#555555' : '#646669';
    const gridColor     = isLight ? 'rgba(0,0,0,0.06)'   : 'rgba(255,255,255,0.04)';
    const tooltipBg     = isLight ? '#ffffff'             : '#1e1f21';
    const tooltipBorder = isLight ? 'rgba(0,0,0,0.12)'   : '#3f3f46';
    const tooltipTitle  = isLight ? '#111111'             : '#d1d0c5';
    const tooltipBody   = isLight ? '#444444'             : '#9a9a9a';

    return {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode:      'index'   as const,
        axis:      'x'       as const,
        intersect: false,
      },

      plugins: {
        legend:  { display: false },
        title:   { display: false },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor:      tooltipTitle,
          bodyColor:       tooltipBody,
          borderColor:     tooltipBorder,
          borderWidth:     1,
          padding:         12,
          cornerRadius:    8,
          displayColors:   false,
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              const raw = items[0]?.label ?? '';
              return `${raw}s`;
            },
            label: (ctx: TooltipItem<'line'>) => {
              if (ctx.datasetIndex === 0) return `WPM: ${ctx.parsed.y}`;
              const prev   = ctx.dataIndex > 0 ? (errData[ctx.dataIndex - 1] ?? 0) : 0;
              const newErr = (errData[ctx.dataIndex] ?? 0) - prev;
              return newErr > 0 ? `Errors: +${newErr}` : (null as unknown as string);
            },
          },
        },
      },

      scales: {
        x: {
          grid:   { display: false },
          ticks:  {
            color: tickColor,
            maxTicksLimit: 10,
            callback(this: { getLabelForValue(v: number): string }, val: number | string) {
              return `${this.getLabelForValue(Number(val))}s`;
            },
          },
          border: { display: false },
        },
        y: {
          grid:   { color: gridColor },
          ticks:  { color: tickColor, stepSize: 20 },
          border: { display: false },
          min:    0,
          title:  { display: true, text: 'Words per Minute', color: tickColor },
        },
        y1: {
          position: 'right' as const,
          grid:     { display: false },
          ticks:    { color: '#ef4444', stepSize: 1 },
          border:   { display: false },
          min:      0,
          title:    { display: true, text: 'Errors', color: '#ef4444' },
        },
      },

      elements: {
        line:  { tension: 0.4 },
        point: {
          radius:      0,
          hitRadius:   10,
          hoverRadius: 4,
          borderWidth: 2,
        },
      },
    };
  }, [isLight, errData]);

  const data = useMemo(() => {
    const wpmPointBg = isLight ? '#f2f0eb' : '#323437';
    return {
      labels,
      datasets: [
        {
          fill:                 false,
          label:                'WPM',
          data:                 wpmData,
          borderColor:          '#a855f7',
          borderWidth:          3,
          pointBackgroundColor: wpmPointBg,
          pointBorderColor:     '#a855f7',
          yAxisID:              'y',
        },
        {
          fill:                 false,
          label:                'Errors',
          data:                 errData,
          borderColor:          '#ef4444',
          borderWidth:          2,
          borderDash:           [5, 5],
          pointBackgroundColor: wpmPointBg,
          pointBorderColor:     '#ef4444',
          pointRadius:          0,
          yAxisID:              'y1',
          tension:              0,
        },
      ],
    };
  }, [labels, wpmData, errData, isLight]);

  return (
    <div className="w-full h-48 md:h-64 relative mt-12 pb-4">
      <Line
        options={options}
        data={data}
        plugins={PLUGINS}
      />
    </div>
  );
}

export default memo(TypingChart);
