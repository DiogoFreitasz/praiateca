import Card from './Card';

export default function StatCard({
  icon: Icon,
  label,
  value,
  color = 'text-indigo-400',
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className={`w-fit rounded-xl bg-slate-800 p-3 ${color}`}>
        {Icon && <Icon size={22} aria-hidden="true" />}
      </div>

      <div>
        <p className="text-2xl font-bold text-white">
          {value}
        </p>

        <p className="mt-1 text-sm text-slate-400">
          {label}
        </p>
      </div>
    </Card>
  );
}