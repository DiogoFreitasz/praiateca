import { Trophy, Zap } from 'lucide-react';
import { useProgress } from '../../context/ProgressContext';
import { achievements } from '../../data/achievements';
import Card from '../ui/Card';
import AchievementIcon from './AchievementIcon';

// Somente apresentação da entrega confirmada; nunca recalcula ou concede XP.
export default function AttemptRewards({ delivery }) {
  const { isHydrated, catalogProgress, levelProgress } = useProgress();
  const newlyUnlocked = delivery?.accepted
    ? achievements.filter(({ id }) => delivery.newAchievements?.includes(id)) : [];
  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Progresso da missão</h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <dt className="flex items-center gap-2 text-sm text-slate-400"><Zap size={17} aria-hidden="true" />XP adicional nesta tentativa</dt>
          <dd className="mt-2 text-2xl font-bold text-indigo-300">{delivery?.accepted ? `+${delivery.xpDelta} XP` : 'Não confirmado'}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-400">XP total acumulado</dt>
          <dd className="mt-2 text-2xl font-bold" aria-busy={!isHydrated}>{isHydrated ? `${catalogProgress.totalXp.toLocaleString('pt-BR')} XP` : 'Carregando…'}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 text-sm text-slate-400"><Trophy size={17} aria-hidden="true" />Nível atual</dt>
          <dd className="mt-2 text-2xl font-bold" aria-busy={!isHydrated}>{isHydrated ? levelProgress.level : 'Carregando…'}</dd>
        </div>
      </dl>
      {delivery?.accepted && delivery.xpDelta === 0 && (
        <p className="text-sm text-slate-300">{delivery.processingStatus === 'duplicate'
          ? 'Tentativa já registrada. Nenhum XP foi concedido novamente.'
          : 'Sem XP adicional. Repetições só acrescentam XP quando melhoram a recompensa já reconhecida; zero acertos não concede XP.'}</p>
      )}
      <p role="status" className="text-sm text-slate-300">{!delivery ? 'Registro de progresso ainda não confirmado.'
        : delivery.saved ? 'Recompensas registradas e progresso salvo neste navegador.'
          : delivery.accepted ? 'Recompensas aplicadas em memória. Salvamento não confirmado.'
            : 'Recompensas ainda não registradas. A avaliação pedagógica continua disponível.'}</p>
      {newlyUnlocked.length > 0 && (
        <section aria-labelledby="new-achievements-heading" className="space-y-3">
          <h3 id="new-achievements-heading" className="font-semibold text-amber-300">Novas conquistas nesta tentativa</h3>
          <ul className="space-y-2">
            {newlyUnlocked.map((achievement) => <li key={achievement.id} className="flex items-center gap-2 text-sm text-slate-200">
              <AchievementIcon name={achievement.icon} size={19} className="shrink-0 text-amber-300" />{achievement.name}
            </li>)}
          </ul>
        </section>
      )}
    </Card>
  );
}
