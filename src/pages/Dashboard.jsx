import { Link } from 'react-router';
import { Zap, Trophy, Target, Award, ArrowRight } from 'lucide-react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import ProgressBar from '../components/ui/ProgressBar';
import ProgressStatus from '../components/progress/ProgressStatus';
import { useProgress } from '../context/ProgressContext';
import { achievements } from '../data/achievements';

const linkStyle = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400';

export default function Dashboard() {
  const { isHydrated, progress, catalogProgress: catalog, levelProgress: level } = useProgress();
  const unlockedCount = achievements.filter(({ id }) => progress.unlockedAchievements[id]).length;
  const stats = [
    { label: 'XP total', value: catalog.totalXp.toLocaleString('pt-BR'), icon: Zap, color: 'text-indigo-400' },
    { label: 'Nível atual', value: level.level, icon: Trophy, color: 'text-amber-400' },
    { label: 'Missões concluídas', value: `${catalog.completedMissions}/${catalog.totalMissions}`, icon: Target, color: 'text-emerald-400' },
    { label: 'Conquistas desbloqueadas', value: `${unlockedCount}/${achievements.length}`, icon: Award, color: 'text-sky-400' },
  ];
  return (
    <div className="space-y-8">
      <section>
        <p className="mb-2 text-sm font-semibold text-indigo-400">VISÃO GERAL</p>
        <h1 className="text-2xl font-bold sm:text-3xl">Bem-vindo, aventureiro!</h1>
        <p className="mt-2 text-slate-400">Continue sua jornada de conhecimento.</p>
      </section>
      <ProgressStatus />
      <section aria-label="Estatísticas do estudante" aria-busy={!isHydrated} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} value={isHydrated ? stat.value : '—'} />)}
      </section>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="space-y-5 xl:col-span-2">
          <h2 className="text-lg font-semibold">Progresso da jornada</h2>
          {isHydrated ? (
            <>
              <ProgressBar value={level.progressPercentage} label={level.isMaxLevel ? 'Nível máximo alcançado' : 'Progresso até o próximo nível'} />
              <p className="text-sm text-slate-300">{level.isMaxLevel
                ? 'Você alcançou o nível máximo disponível!'
                : `${level.xpToNextLevel} XP para alcançar o nível ${level.level + 1}.`}</p>
              <ProgressBar value={catalog.completedMissions} max={catalog.totalMissions} label="Missões concluídas" />
              <p className="text-sm text-slate-300">{catalog.completedMissions} de {catalog.totalMissions} missões concluídas · {Math.round(catalog.completionPercentage)}% do catálogo.</p>
            </>
          ) : <p className="text-sm text-slate-400">Aguardando o carregamento dos indicadores.</p>}
          <Link to="/missoes" className={`${linkStyle} bg-indigo-600 text-white hover:bg-indigo-500`}>
            Explorar missões <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </Card>
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <Trophy className="shrink-0 text-amber-400" size={24} aria-hidden="true" />
            <h2 className="text-lg font-semibold">Suas conquistas</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{!isHydrated
            ? 'Carregando suas conquistas…'
            : unlockedCount === 0 ? 'Conclua sua primeira missão para começar a desbloquear conquistas.'
              : `${unlockedCount} de ${achievements.length} conquistas desbloqueadas. Continue explorando!`}</p>
          <Link to="/conquistas" className={`${linkStyle} text-indigo-300 hover:text-indigo-200`}>
            Ver conquistas <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </Card>
      </section>
    </div>
  );
}
