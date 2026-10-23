import { LockKeyhole, CircleCheck } from 'lucide-react';
import Card from '../components/ui/Card';
import AchievementIcon from '../components/progress/AchievementIcon';
import ProgressStatus from '../components/progress/ProgressStatus';
import { useProgress } from '../context/ProgressContext';
import { achievements } from '../data/achievements';

const criterionLabels = {
  'first-completion': 'Primeira missão concluída, mesmo sem acertos.',
  'perfect-score': '100% de acertos em uma missão.',
  'all-subjects': 'Participação nas quatro disciplinas.',
  'initial-catalog': 'Conclusão das oito missões do catálogo inicial.',
};
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

export default function Achievements() {
  const { isHydrated, progress } = useProgress();
  const unlockedCount = achievements.filter(({ id }) => progress.unlockedAchievements[id]).length;
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 text-sm font-semibold text-indigo-400">RECOMPENSAS DA JORNADA</p>
        <h1 className="text-2xl font-bold sm:text-3xl">Conquistas</h1>
        <p className="mt-2 text-slate-300">{isHydrated ? `${unlockedCount} de ${achievements.length} conquistas desbloqueadas.` : 'Carregando suas conquistas…'}</p>
      </header>
      <ProgressStatus />
      <section aria-label="Catálogo de conquistas" aria-busy={!isHydrated} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {achievements.map((achievement) => {
          const unlocked = isHydrated && progress.unlockedAchievements[achievement.id];
          const StatusIcon = unlocked ? CircleCheck : LockKeyhole;
          return (
            <Card key={achievement.id} className={`min-w-0 space-y-4 border-t-2 ${unlocked ? 'border-t-amber-400' : 'border-t-slate-600'}`}>
              <div className="flex items-start gap-3">
                <AchievementIcon name={achievement.icon} size={28} className={`shrink-0 ${unlocked ? 'text-amber-300' : 'text-slate-400'}`} />
                <h2 className="break-words text-lg font-semibold">{achievement.name}</h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">{achievement.description}</p>
              <p className="text-sm text-slate-400">Critério: {criterionLabels[achievement.criterion]}</p>
              <p className={`flex items-center gap-2 text-sm font-semibold ${unlocked ? 'text-amber-300' : 'text-slate-300'}`}>
                <StatusIcon size={17} aria-hidden="true" />{!isHydrated ? 'Aguardando progresso' : unlocked ? 'Desbloqueada' : 'Bloqueada'}
              </p>
              {unlocked?.unlockedAt && <p className="text-sm text-slate-400">Reconhecida em <time dateTime={unlocked.unlockedAt}>{dateFormat.format(new Date(unlocked.unlockedAt))}</time></p>}
            </Card>
          );
        })}
      </section>
    </div>
  );
}
