/**
 * components/StatCard.jsx
 *
 * Metric card for the dashboard overview page.
 *
 * Props:
 *   title      — string
 *   value      — string | number
 *   icon       — emoji or string
 *   trend      — '+12%' | '-3%' | null  (optional)
 *   trendUp    — boolean (green if true, red if false)
 *   loading    — boolean
 *   accent     — 'orange' | 'green' | 'blue' | 'red' (default: 'orange')
 */

const ACCENTS = {
  orange: 'bg-brand-50  text-brand-600  ring-brand-100',
  green:  'bg-green-50  text-green-600  ring-green-100',
  blue:   'bg-blue-50   text-blue-600   ring-blue-100',
  red:    'bg-red-50    text-red-600    ring-red-100',
};

export default function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  loading = false,
  accent = 'orange',
}) {
  return (
    <div className="card animate-slide-up hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-semibold text-gray-500">{title}</p>
        <span className={`p-2 rounded-lg ring-1 text-lg ${ACCENTS[accent]}`}>
          {icon}
        </span>
      </div>

      {loading ? (
        <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-gray-900 tabular-nums">{value ?? '—'}</p>
      )}

      {trend && !loading && (
        <p className={`mt-2 text-xs font-semibold ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
          {trendUp ? '↑' : '↓'} {trend}
          <span className="text-gray-400 font-normal ml-1">vs last month</span>
        </p>
      )}
    </div>
  );
}
