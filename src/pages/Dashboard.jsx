import { Link } from 'react-router';
import {
    Zap,
    Trophy,
    Target,
    BookOpen,
    ArrowRight,
} from 'lucide-react';

import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import ProgressBar from '../components/ui/ProgressBar';

const stats = [
    {
        label: 'XP Total',
        value: '1.250',
        icon: Zap,
        color: 'text-indigo-400',
    },
    {
        label: 'Nível atual',
        value: '05',
        icon: Trophy,
        color: 'text-amber-400',
    },
    {
        label: 'Missões concluídas',
        value: '3/8',
        icon: Target,
        color: 'text-emerald-400',
    },
    {
        label: 'Disciplinas',
        value: '04',
        icon: BookOpen,
        color: 'text-sky-400',
    },
];

export default function Dashboard() {
    return (
        <div className="space-y-8">
            <section>
                <p className="mb-2 text-sm font-semibold text-indigo-400">
                    VISÃO GERAL
                </p>

                <h1 className="text-2xl font-bold sm:text-3xl">
                    Bem-vindo, aventureiro!
                </h1>

                <p className="mt-2 text-slate-400">
                    Continue sua jornada de conhecimento.
                </p>
            </section>

            <section
                aria-label="Estatísticas do estudante"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
                {stats.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                ))}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card className="space-y-5 xl:col-span-2">
                    <div>
                        <h2 className="text-lg font-semibold">
                            Progresso da jornada
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                            Acompanhe sua evolução nas missões.
                        </p>
                    </div>

                    <ProgressBar
                        value={3}
                        max={8}
                        label="Missões concluídas"
                    />

                    <p className="text-sm text-slate-400">
                        3 de 8 missões concluídas.
                    </p>
                    <Link
                        to="/missoes"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                    >
                        Explorar missões
                        <ArrowRight size={18} />
                    </Link>
                </Card>

                <Card className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-amber-500/10 p-3">
                            <Trophy className="text-amber-400" size={24} />
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold">
                                Suas conquistas
                            </h2>
                            <p className="text-sm text-slate-400">
                                Recompensas da jornada
                            </p>
                        </div>
                    </div>

                    <p className="text-sm leading-relaxed text-slate-300">
                        Complete missões e desafios para desbloquear
                        novas conquistas.
                    </p>

                    <Link
                        to="/conquistas"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                        Ver conquistas
                        <ArrowRight size={17} />
                    </Link>
                </Card>
            </section>

            <p className="text-center text-xs text-slate-500">
                Dados demonstrativos — a gamificação será implementada
                nas próximas sessões.
            </p>
        </div>
    );
}