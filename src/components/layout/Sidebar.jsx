import { NavLink } from 'react-router';
import { useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Target,
  BookOpen,
  BarChart3,
  Trophy,
  GraduationCap,
  X,
} from 'lucide-react';

const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Missões', path: '/missoes', icon: Target },
  { label: 'Quiz', path: '/quiz', icon: BookOpen },
  { label: 'Resultados', path: '/resultados', icon: BarChart3 },
  { label: 'Conquistas', path: '/conquistas', icon: Trophy },
];

export default function Sidebar({ isOpen, onClose }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.getElementById('praiateca-menu-toggle');
    closeRef.current?.focus();
    return () => opener?.focus();
  }, [isOpen]);

  const handleKeyDown = (event) => {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
    if (event.key === 'Tab') {
      const controls = panelRef.current.querySelectorAll('a[href], button:not([disabled])');
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Fechar menu de navegação"
          tabIndex={-1}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        ref={panelRef}
        id="praiateca-sidebar"
        role={isOpen ? 'dialog' : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-label="Menu principal"
        onKeyDown={handleKeyDown}
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 flex-col
          border-r border-slate-800 bg-slate-950
          transition-transform duration-300
          lg:visible lg:translate-x-0
          ${isOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'}
        `}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <NavLink
            to="/"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            <div className="rounded-xl bg-indigo-600 p-2">
              <GraduationCap size={24} />
            </div>

            <span className="text-xl font-bold">
              PraiaTeca
            </span>
          </NavLink>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-lg p-2 text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 lg:hidden"
          >
            <X size={22} />
          </button>
        </div>

        <nav
          aria-label="Navegação principal"
          className="flex-1 space-y-2 overflow-y-auto p-4"
        >
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Menu principal
          </p>

          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-5">
          <p className="text-xs text-slate-400">
            PraiaTeca · Projeto acadêmico
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Versão 0.1.0
          </p>
        </div>
      </aside>
    </>
  );
}
