export default function ProgressBar({
  value = 0,
  max = 100,
  label = 'Progresso',
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? value : 0;

  const percentage = Math.min(
    100,
    Math.max(0, (safeValue / safeMax) * 100)
  );

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-300">
          {label}
        </span>

        <span className="text-sm font-semibold text-indigo-400">
          {Math.round(percentage)}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.min(safeMax, Math.max(0, safeValue))}
        className="h-2.5 overflow-hidden rounded-full bg-slate-800"
      >
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}