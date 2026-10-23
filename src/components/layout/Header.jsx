import { Menu, Bell, Zap, UserRound } from 'lucide-react';
import { useProgress } from '../../context/ProgressContext';

export default function Header({ onMenuClick, isMenuOpen = false }) {
  const { isHydrated, catalogProgress, persistenceStatus } = useProgress();
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          id="praiateca-menu-toggle"
          onClick={onMenuClick}
          aria-label="Abrir menu"
          aria-controls="praiateca-sidebar"
          aria-expanded={isMenuOpen}
          className="shrink-0 rounded-lg p-2 text-slate-300 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 lg:hidden"
        >
          <Menu size={24} aria-hidden="true" />
        </button>

        <div>
          <p className="text-sm font-semibold text-white sm:text-base">
            Sua jornada acadêmica
          </p>
          <p className="hidden text-xs text-slate-400 sm:block">
            Aprenda, evolua e conquiste.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-5">
        <div className="hidden items-center gap-2 whitespace-nowrap rounded-xl bg-slate-800 px-3 py-2 min-[375px]:flex">
          <Zap size={17} className="text-amber-400" aria-hidden="true" />
          <span aria-busy={!isHydrated} title={persistenceStatus === 'saved' ? 'Salvo neste navegador' : 'Salvamento não confirmado'} className="min-w-12 text-xs font-semibold tabular-nums sm:text-sm">
            {isHydrated ? `${catalogProgress.totalXp.toLocaleString('pt-BR')} XP` : '… XP'}
          </span>
        </div>

        <span
          title="Notificações em breve"
          className="hidden text-slate-400 sm:block"
        >
          <Bell size={20} aria-hidden="true" />
        </span>

        <div
          aria-label="Perfil do estudante"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-500/40 bg-indigo-500/20 text-indigo-300"
        >
          <UserRound size={20} aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
