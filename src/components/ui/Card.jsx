export default function Card({
  children,
  className = '',
  ...props
}) {
  return (
    <div
      className={`
        rounded-2xl border border-slate-800
        bg-slate-900/80 p-5
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}