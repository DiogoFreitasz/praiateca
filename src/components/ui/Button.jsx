const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
  secondary: 'bg-slate-800 text-white hover:bg-slate-700',
  outline:
    'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800',
};

export default function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl px-5 py-3 text-sm font-semibold
        transition-colors
        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-indigo-400
        disabled:cursor-not-allowed disabled:opacity-50
        ${variants[variant] ?? variants.primary}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}