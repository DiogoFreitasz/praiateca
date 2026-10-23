import { ArrowLeft, BookOpen, CircleCheck, CircleHelp, CircleX, RotateCcw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import StatCard from '../components/ui/StatCard';
import QuizReview from '../components/quiz/QuizReview';
import AttemptRewards from '../components/progress/AttemptRewards';
import { useQuizResult } from '../context/QuizResultContext';
import { getPerformanceMessage, getResultForMission } from '../utils/quizResults';

const linkStyle = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400';
const focusHeading = (node) => node?.focus();

export default function Results({ review = false }) {
  const { missionId } = useParams();
  const { result, clearResult, delivery, deliveryMessage, retryDelivery } = useQuizResult();
  const data = getResultForMission(result, missionId);
  const navigate = useNavigate();

  if (data.status !== 'ready') {
    return (
      <Card className="mx-auto max-w-3xl space-y-4 text-center">
        <CircleHelp size={32} className="mx-auto text-indigo-400" aria-hidden="true" />
        <h1 tabIndex={-1} ref={focusHeading} className="text-2xl font-bold">Resultado indisponível</h1>
        <p className="text-slate-400">{data.message}</p>
        <Link to="/missoes" className={linkStyle}>Selecionar uma missão</Link>
      </Card>
    );
  }

  const { mission, subject, evaluation } = data;
  const resultPath = `/resultados/${mission.id}`;
  const retry = () => {
    clearResult();
    navigate(`/quiz/${mission.id}`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <CircleCheck size={18} aria-hidden="true" />
          MISSÃO CONCLUÍDA
        </p>
        <h1 key={review ? 'review' : 'results'} tabIndex={-1} ref={focusHeading} className="break-words text-2xl font-bold sm:text-3xl">{mission.title}</h1>
        <p className="mt-2 text-slate-400">{subject.name}</p>
      </header>

      {deliveryMessage && (
        <div className="space-y-3">
          <p role="status" className="text-sm text-slate-300">{deliveryMessage}</p>
          {delivery?.status === 'unsaved' && (
            <Button variant="outline" onClick={retryDelivery}>Tentar salvar novamente</Button>
          )}
        </div>
      )}

      {review ? (
        <>
          <Link to={resultPath} className={linkStyle}><ArrowLeft size={17} aria-hidden="true" />Voltar aos Resultados</Link>
          <QuizReview key={mission.id} evaluation={evaluation} onRestart={retry} />
        </>
      ) : (
        <>
          <Card className="space-y-5">
            <h2 className="text-lg font-semibold">Seu desempenho</h2>
            <p className="text-5xl font-bold text-indigo-300">
              {Math.round(evaluation.percentage)}% <span className="text-base font-medium text-slate-300">de acertos</span>
            </p>
            <ProgressBar value={evaluation.correctCount} max={evaluation.totalQuestions} label="Percentual de acertos" />
          </Card>
          <section aria-label="Resumo da tentativa" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={BookOpen} label="Total de questões" value={evaluation.totalQuestions} />
            <StatCard icon={CircleCheck} label="Acertos" value={evaluation.correctCount} color="text-emerald-400" />
            <StatCard icon={CircleX} label="Erros" value={evaluation.incorrectCount} color="text-amber-400" />
          </section>
          <Card className="space-y-2">
            <h2 className="text-lg font-semibold">Continue aprendendo</h2>
            <p className="leading-relaxed text-slate-300">{getPerformanceMessage(evaluation.percentage)}</p>
          </Card>
          <AttemptRewards delivery={delivery} />
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to={`${resultPath}/revisao`} className={linkStyle}><BookOpen size={17} aria-hidden="true" />Revisar respostas</Link>
            <Button onClick={retry}><RotateCcw size={17} aria-hidden="true" />Tentar novamente</Button>
          </div>
        </>
      )}
      <Link to="/missoes" className={linkStyle}><ArrowLeft size={17} aria-hidden="true" />Voltar às Missões</Link>
    </div>
  );
}
