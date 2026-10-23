import { useState } from 'react';
import { CircleCheck, CircleHelp, CircleX } from 'lucide-react';

import Button from '../ui/Button';
import Card from '../ui/Card';
import { isValidEvaluation } from '../../utils/quizEvaluation';

const focusHeading = (node) => node?.focus();

export default function QuizReview({ evaluation, onRestart }) {
  const [reviewIndex, setReviewIndex] = useState(0);

  if (!isValidEvaluation(evaluation) || !evaluation.evaluations[reviewIndex]) {
    return (
      <Card className="space-y-4 text-center">
        <CircleHelp size={28} className="mx-auto text-amber-300" aria-hidden="true" />
        <h2 tabIndex={-1} ref={focusHeading} className="text-xl font-bold">Revisão indisponível</h2>
        <p role="status" className="text-slate-300">{evaluation?.message ?? 'Não foi possível avaliar esta tentativa.'}</p>
        <Button onClick={onRestart}>Reiniciar missão</Button>
      </Card>
    );
  }

  const item = evaluation.evaluations[reviewIndex];
  const Icon = item.isCorrect ? CircleCheck : CircleX;

  return (
    <section aria-labelledby="review-heading" className="space-y-4">
      <div>
        <h2 id="review-heading" className="text-xl font-bold">Tentativa concluída — revisão pedagógica</h2>
        <p className="mt-2 text-sm text-slate-400">Revise suas respostas e as justificativas de cada questão.</p>
      </div>

      <Card key={item.questionId} className="space-y-5">
        <p className="text-sm font-semibold text-indigo-300" aria-live="polite">
          Revisão: questão {reviewIndex + 1} de {evaluation.totalQuestions}
        </p>
        <h3 tabIndex={-1} ref={focusHeading} className="break-words text-lg font-semibold leading-relaxed sm:text-xl">
          {item.statement}
        </h3>
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${item.isCorrect ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-200'}`}>
          <Icon size={22} className="shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">{item.isCorrect ? 'Acerto' : 'Resposta incorreta'}</p>
            <p className="mt-1 text-sm">{item.feedback}</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-indigo-400/40 bg-indigo-500/10 p-4">
            <dt className="text-sm font-semibold text-indigo-200">Sua resposta</dt>
            <dd className="mt-2 break-words text-sm leading-relaxed text-slate-200">
              <span className="mr-2 font-semibold uppercase">{item.selectedOption.id}.</span>
              {item.selectedOption.text}
            </dd>
          </div>
          <div className="min-w-0 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <dt className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <CircleCheck size={17} aria-hidden="true" />
              Resposta correta
            </dt>
            <dd className="mt-2 break-words text-sm leading-relaxed text-slate-200">
              <span className="mr-2 font-semibold uppercase">{item.correctOption.id}.</span>
              {item.correctOption.text}
            </dd>
          </div>
        </dl>

        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <h4 className="font-semibold text-slate-200">Justificativa</h4>
          <p className="mt-2 break-words text-sm leading-relaxed text-slate-300">{item.explanation}</p>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
        <Button variant="outline" disabled={reviewIndex === 0} onClick={() => setReviewIndex((index) => Math.max(0, index - 1))}>Questão anterior</Button>
        <Button variant="outline" disabled={reviewIndex === evaluation.totalQuestions - 1} onClick={() => setReviewIndex((index) => Math.min(evaluation.totalQuestions - 1, index + 1))}>Próxima questão</Button>
        <Button onClick={onRestart}>Reiniciar missão</Button>
      </div>
    </section>
  );
}
