import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  BookOpen,
  CircleHelp,
  CircleCheck,
  Code2,
  Database,
  Network,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ProgressStatus from '../components/progress/ProgressStatus';
import { useProgress } from '../context/ProgressContext';
import { missions, getMissionsBySubject } from '../data/missions';
import { subjects } from '../data/subjects';

const subjectIcons = {
  Code2,
  Database,
  Network,
  ShieldCheck,
};

const subjectStyles = {
  blue: {
    icon: 'bg-sky-500/10 text-sky-400',
    accent: 'border-sky-500/30',
  },
  green: {
    icon: 'bg-emerald-500/10 text-emerald-400',
    accent: 'border-emerald-500/30',
  },
  purple: {
    icon: 'bg-violet-500/10 text-violet-400',
    accent: 'border-violet-500/30',
  },
  orange: {
    icon: 'bg-orange-500/10 text-orange-400',
    accent: 'border-orange-500/30',
  },
};

const difficultyStyles = {
  easy: {
    label: 'Fácil',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  },
  medium: {
    label: 'Médio',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  },
};

const orderedSubjects = [...subjects].sort((a, b) => a.order - b.order);

function MissionCard({ mission, subject }) {
  const navigate = useNavigate();
  const { isHydrated, getMissionBestResult, getMissionAwardedXp } = useProgress();
  const best = isHydrated ? getMissionBestResult(mission.id) : null;
  const difficulty = difficultyStyles[mission.difficulty];
  const style = subjectStyles[subject.color];

  return (
    <Card
      className={`flex h-full flex-col border-t-2 transition-colors hover:bg-slate-900 ${style.accent}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Missão {mission.id.slice(-2)}
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${difficulty.className}`}
        >
          {difficulty.label}
        </span>
      </div>

      <div className="mt-5 flex-1">
        <h3 className="text-lg font-semibold text-white">{mission.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {mission.description}
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 border-y border-slate-800 py-4 text-sm">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-400">
            <CircleHelp size={15} aria-hidden="true" />
            Questões
          </dt>
          <dd className="mt-1 font-semibold text-slate-200">
            {mission.questionIds.length}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-400">
            <Zap size={15} aria-hidden="true" />
            Recompensa máxima
          </dt>
          <dd className="mt-1 font-semibold text-slate-200">
            {mission.xpReward} XP
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2 text-sm text-slate-300">
        {!isHydrated ? <p>Carregando progresso da missão…</p> : (
          <>
            <p className="flex items-center gap-2">{best && <CircleCheck size={17} className="shrink-0 text-emerald-300" aria-hidden="true" />}{best ? 'Missão concluída' : 'Ainda não concluída'}</p>
            <p>XP reconhecido: <strong>{getMissionAwardedXp(mission.id)} XP</strong></p>
            <p>Melhor desempenho: {best ? `${best.correctCount} de ${best.totalQuestions} acertos` : 'sem tentativa concluída'}</p>
          </>
        )}
      </div>

      <Button
        onClick={() => navigate(`/quiz/${mission.id}`)}
        className="mt-5 w-full"
        aria-label={`${best ? 'Tentar novamente' : 'Iniciar missão'}: ${mission.title}`}
      >
        <Target size={17} aria-hidden="true" />
        {best ? 'Tentar novamente' : 'Iniciar missão'}
      </Button>
    </Card>
  );
}

export default function Missions() {
  const [selectedSubject, setSelectedSubject] = useState('all');
  const visibleSubjects = selectedSubject === 'all'
    ? orderedSubjects
    : orderedSubjects.filter((subject) => subject.id === selectedSubject);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-400">
            <Target size={17} aria-hidden="true" />
            CENTRAL DE MISSÕES
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">Escolha seu próximo desafio</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Revise conteúdos das quatro disciplinas em missões curtas e objetivas.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Sparkles size={17} className="text-amber-400" aria-hidden="true" />
          <span>{missions.length} missões disponíveis</span>
        </div>
      </section>

      <ProgressStatus />

      <section aria-labelledby="mission-filters-heading">
        <h2 id="mission-filters-heading" className="sr-only">
          Filtrar missões por disciplina
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filtros de disciplina">
          <button
            type="button"
            aria-pressed={selectedSubject === 'all'}
            onClick={() => setSelectedSubject('all')}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
              selectedSubject === 'all'
                ? 'border-indigo-500 bg-indigo-600 text-white'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BookOpen size={17} aria-hidden="true" />
            Todas
          </button>

          {orderedSubjects.map((subject) => {
            const Icon = subjectIcons[subject.icon];
            const isSelected = selectedSubject === subject.id;

            return (
              <button
                key={subject.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedSubject(subject.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon size={17} aria-hidden="true" />
                {subject.name}
              </button>
            );
          })}
        </div>
      </section>

      <div className="space-y-10">
        {visibleSubjects.map((subject) => {
          const Icon = subjectIcons[subject.icon];
          const style = subjectStyles[subject.color];
          const subjectMissions = getMissionsBySubject(subject.id)
            .sort((a, b) => a.order - b.order);

          return (
            <section key={subject.id} aria-labelledby={`${subject.id}-heading`}>
              <div className="mb-4 flex items-center gap-3">
                <div className={`rounded-xl p-2.5 ${style.icon}`}>
                  <Icon size={22} aria-hidden="true" />
                </div>
                <div>
                  <h2 id={`${subject.id}-heading`} className="text-xl font-semibold">
                    {subject.name}
                  </h2>
                  <p className="text-sm text-slate-400">{subject.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {subjectMissions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    subject={subject}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400">
        Repetir uma missão é permitido. Melhorar seu desempenho pode conceder XP adicional, sem duplicar recompensas.
      </p>
    </div>
  );
}
