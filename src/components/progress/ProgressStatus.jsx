import { CircleCheck, CloudOff, LoaderCircle } from 'lucide-react';
import { useProgress } from '../../context/ProgressContext';
import Button from '../ui/Button';

export default function ProgressStatus() {
  const { isHydrated, persistenceStatus, hasPendingChanges, error, retrySave } = useProgress();
  let message;
  if (!isHydrated) message = 'Carregando progresso…';
  else if (persistenceStatus === 'saved') message = 'Progresso salvo neste navegador.';
  else if (persistenceStatus === 'incompatible') message = 'Os dados salvos têm uma versão incompatível e foram preservados. Os indicadores refletem apenas o progresso disponível nesta sessão.';
  else if (error?.code === 'corrupted') message = 'Os dados salvos estão corrompidos e foram preservados. Os indicadores refletem apenas o progresso disponível nesta sessão.';
  else if (error?.code === 'ATTEMPT_CONFLICT') message = 'Há um conflito de identificador entre tentativas. O progresso em memória foi preservado, mas o salvamento não está confirmado.';
  else if (persistenceStatus === 'error') message = 'O armazenamento está indisponível ou houve uma falha de salvamento. O progresso disponível em memória não tem salvamento confirmado.';
  else if (hasPendingChanges) message = 'Progresso em memória, aguardando salvamento.';
  else message = 'Seu progresso será salvo neste navegador ao concluir uma missão.';
  const Icon = !isHydrated ? LoaderCircle : persistenceStatus === 'saved' ? CircleCheck : CloudOff;
  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p role="status" className="flex items-start gap-2 text-sm leading-relaxed text-slate-300">
        <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{message}</span>
      </p>
      {isHydrated && (hasPendingChanges || ['error', 'incompatible'].includes(persistenceStatus)) && (
        <Button variant="outline" onClick={retrySave}>Tentar salvar novamente</Button>
      )}
    </div>
  );
}
