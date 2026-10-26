import { ArrowLeft, BookOpen, CircleHelp, Target } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import { useQuizResult } from '../context/QuizResultContext';
import { getQuizData } from '../data/quiz';
import useQuiz from '../hooks/useQuiz';

const difficultyLabels = { easy: 'Fácil', medium: 'Médio' };
const focusHeading = (node) => node?.focus();

const emptyStates = {
  'no-mission': {
    title: 'Escolha uma missão para começar',
    description: 'Acesse as Missões e escolha o conteúdo que deseja revisar.',
  },
  'not-found': {
    title: 'Missão não encontrada',
    description: 'Não encontramos uma missão com esse identificador. Escolha uma das missões disponíveis para continuar.',
  },
  unavailable: {
    title: 'Missão indisponível no momento',
    description: 'Esta missão ainda não possui questões disponíveis ou seus dados estão incompletos. Escolha outra missão para revisar.',
  },
  'invalid-questions': {
    title: 'Não foi possível carregar as questões',
    description: 'Esta missão possui questões ou alternativas incompletas. Escolha outra missão para continuar.',
  },
};

function BackToMissions() {
  return (
    <Link
      to="/missoes"
      className="inline-flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
    >
      <ArrowLeft size={17} aria-hidden="true" />
      Voltar às Missões
    </Link>
  );
}

function QuizSession({ mission, subject, questions }) {
  const quiz = useQuiz(mission.id, questions);
  const question = quiz.currentQuestion;
  const { completeAttempt, clearResult, result } = useQuizResult();
  const navigate = useNavigate();
  const completion = quiz.completion;

  useEffect(() => { clearResult(); }, [clearResult]);

  useEffect(() => {
    if (completion && completeAttempt({ missionId: mission.id, completion })) {
      navigate(`/resultados/${mission.id}`, { replace: true });
    }
  }, [completion, mission.id, completeAttempt, navigate]);

  if (quiz.error) {
    return (
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold">Não foi possível iniciar a missão</h1>
        <p role="alert" className="text-slate-300">{quiz.error.message}</p>
        <BackToMissions />
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackToMissions />

      <section aria-labelledby="quiz-heading">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-400">
          <Target size={17} aria-hidden="true" />
          REVISÃO POR MISSÃO
        </p>
        <h1 id="quiz-heading" className="break-words text-2xl font-bold sm:text-3xl">
          {mission.title}
        </h1>
        <p className="mt-2 text-slate-400">{mission.description}</p>

        <dl className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:grid-cols-3">
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-slate-400">
              <BookOpen size={15} aria-hidden="true" />
              Disciplina
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-200">{subject.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Dificuldade</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-200">
              {difficultyLabels[mission.difficulty] ?? mission.difficulty}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-slate-400">
              <CircleHelp size={15} aria-hidden="true" />
              Questões
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-200">{questions.length}</dd>
          </div>
        </dl>
      </section>

      <div aria-live="polite">
        <ProgressBar
          value={quiz.answeredCount}
          max={questions.length}
          label={`${quiz.answeredCount} de ${questions.length} respondidas`}
        />
      </div>

      {quiz.completion ? (
        <Card>
          <p role={result.status === 'invalid' ? 'alert' : 'status'}>
            {result.status === 'invalid' ? result.message : 'Preparando seus resultados…'}
          </p>
        </Card>
      ) : (
        <section key={question.id} aria-labelledby="question-heading">
          <Card>
            <p aria-live="polite" className="mb-3 text-sm font-semibold text-indigo-300">
              Questão {quiz.currentIndex + 1} de {questions.length}
            </p>
            <h2 id="question-heading" className="w-full break-words text-lg font-semibold leading-relaxed sm:text-xl" tabIndex={-1} ref={focusHeading}>
              {question.statement}
            </h2>
            <fieldset aria-labelledby="question-heading">
              <legend className="sr-only">Alternativas da questão</legend>
              <p id="answer-instructions" className="mt-3 text-sm text-slate-400">
                Selecione uma alternativa. Você pode revisar suas respostas antes de finalizar.
              </p>
              <div className="mt-6 space-y-3">
                {question.options.map((option) => {
                  const selected = quiz.answers[question.id] === option.id;

                  return (
                    <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-400 ${selected ? 'border-indigo-400 bg-indigo-500/15' : 'border-slate-700 bg-slate-950/50 hover:bg-slate-800'}`}>
                      <input
                        type="radio"
                        name={`answer-${question.id}`}
                        value={option.id}
                        checked={selected}
                        onChange={() => quiz.selectAnswer(option.id)}
                        aria-describedby="answer-instructions"
                        className="mt-1 h-4 w-4 shrink-0 accent-indigo-500"
                      />
                      <span className="min-w-0 break-words text-sm leading-relaxed text-slate-200">
                        <span className="mr-2 font-semibold uppercase text-indigo-300">{option.id}.</span>
                        {option.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={quiz.previous} disabled={quiz.currentIndex === 0}>Anterior</Button>
              {quiz.currentIndex < questions.length - 1 && (
                <Button onClick={quiz.next} disabled={!quiz.answers[question.id]}>Próxima</Button>
              )}
              <Button onClick={quiz.finish} disabled={!quiz.canFinish}>Finalizar</Button>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

export default function Quiz() {
  const { missionId } = useParams();
  const data = getQuizData(missionId);

  if (data.status !== 'ready') {
    const state = emptyStates[data.status];

    return (
      <section className="mx-auto max-w-3xl space-y-6" aria-labelledby="quiz-state-heading">
        <Card className="space-y-4 text-center">
          <CircleHelp size={32} className="mx-auto text-indigo-400" aria-hidden="true" />
          <h1 id="quiz-state-heading" className="text-2xl font-bold">{state.title}</h1>
          <p className="text-slate-400">{state.description}</p>
          <BackToMissions />
        </Card>
      </section>
    );
  }

  // A troca de missão remonta a sessão e descarta integralmente a tentativa anterior.
  return <QuizSession key={data.mission.id} mission={data.mission} subject={data.subject} questions={data.questions} />;
}
