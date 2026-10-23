import { Link } from 'react-router';
import { CircleHelp, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-5 text-center">
      <CircleHelp size={64} className="text-indigo-400" />

      <h1 className="text-6xl font-bold">404</h1>

      <h2 className="text-2xl font-semibold">
        Página não encontrada
      </h2>

      <p className="max-w-md text-slate-400">
        Parece que você explorou uma área desconhecida da PraiaTeca.
      </p>

      <Link
        to="/"
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-medium hover:bg-indigo-500"
      >
        <ArrowLeft size={18} />
        Voltar ao Dashboard
      </Link>
    </section>
  );
}
