import { NavLink } from 'react-router';
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
  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Fechar menu de navegação"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        id="studyquest-sidebar"
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 flex-col
          border-r border-slate-800 bg-slate-950
          transition-transform duration-300
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <NavLink
            to="/"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="rounded-xl bg-indigo-600 p-2">
              <GraduationCap size={24} />
            </div>

            <span className="text-xl font-bold">
              StudyQuest
            </span>
          </NavLink>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="text-slate-400 lg:hidden"
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
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
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
          <p className="text-xs text-slate-500">
            StudyQuest · Projeto acadêmico
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Versão 0.1.0
          </p>
        </div>
      </aside>
    </>
  );
}