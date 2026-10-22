import { Menu, Bell, Zap, UserRound } from 'lucide-react';

export default function Header({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menu"
          aria-controls="studyquest-sidebar"
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 lg:hidden"
        >
          <Menu size={24} />
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

      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2">
          <Zap size={17} className="text-amber-400" />
          <span className="text-xs font-semibold sm:text-sm">
            1.250 XP
          </span>
        </div>

        <span
          title="Notificações em breve"
          className="hidden text-slate-400 sm:block"
        >
          <Bell size={20} />
        </span>

        <div
          aria-label="Perfil demonstrativo"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-500/40 bg-indigo-500/20 text-indigo-300"
        >
          <UserRound size={20} />
        </div>
      </div>
    </header>
  );
}