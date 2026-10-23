import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { createServer } from 'vite';
import { createInitialProgress, getCatalogProgress, getMissionAwardedXp, getMissionBestResult, getProgressLevel } from '../src/utils/progress.js';
import { createProgressStore } from '../src/services/progressStore.js';
import { createProgressStorage } from '../src/services/progressStorage.js';
import { createQuizCompletionStore, getCompletionDeliveryMessage, getCompletionDeliveryState } from '../src/services/quizCompletionStore.js';
import { getQuestionsByMission } from '../src/data/questions.js';
import { missions } from '../src/data/missions.js';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { AppRoutes } = await server.ssrLoadModule('/src/routes/AppRouter.jsx');
  const { ProgressContext } = await server.ssrLoadModule('/src/context/ProgressContext.js');
  const { QuizResultContext } = await server.ssrLoadModule('/src/context/QuizResultContext.js');
  const date = '2026-10-22T12:00:00.000Z';
  let nextId = 0;
  function scenario(raw = null, hydrate = true) {
    let writes = 0;
    let calls = 0;
    const memory = {
      fail: false,
      getItem: () => raw,
      setItem(key, value) { if (this.fail) throw new Error('Falha de escrita'); raw = value; writes += 1; },
    };
    const progress = createProgressStore({ storage: createProgressStorage(memory), now: () => date });
    const completion = createQuizCompletionStore({
      processCompletedAttempt(event) { calls += 1; return progress.processCompletedAttempt(event); },
      retrySave: progress.retrySave,
    });
    if (hydrate) progress.hydrate();
    return { progress, completion, memory, counts: () => ({ writes, calls }) };
  }
  function finish(source, missionId, correctCount) {
    const answers = Object.fromEntries(getQuestionsByMission(missionId).map((q, i) => [
      q.id, i < correctCount ? q.correctOptionId : q.options.find(({ id }) => id !== q.correctOptionId).id,
    ]));
    const attemptId = `visual-${++nextId}`;
    assert.equal(source.completion.completeAttempt({ missionId, attemptId,
      completion: { missionId, attemptId, completedAt: date, answers } }), true);
  }
  function render(source, path) {
    const before = JSON.stringify(source.progress.getSnapshot());
    const counts = source.counts();
    const snapshot = source.progress.getSnapshot();
    const progress = snapshot.progress;
    const value = {
      ...snapshot, isHydrated: snapshot.hydrationStatus === 'ready',
      catalogProgress: getCatalogProgress(progress), levelProgress: getProgressLevel(progress),
      getMissionBestResult: (id) => getMissionBestResult(progress, id),
      getMissionAwardedXp: (id) => getMissionAwardedXp(progress, id),
      retrySave: source.progress.retrySave,
      processCompletedAttempt() { assert.fail('Renderização não pode entregar eventos'); },
    };
    const result = source.completion.getSnapshot();
    const delivery = getCompletionDeliveryState(result.delivery, snapshot);
    const html = renderToStaticMarkup(createElement(ProgressContext.Provider, { value },
      createElement(QuizResultContext.Provider, { value: {
        ...result, delivery, deliveryMessage: getCompletionDeliveryMessage(delivery),
        clearResult: source.completion.clearResult, retryDelivery: source.completion.retryDelivery,
      } }, createElement(MemoryRouter, { initialEntries: [path] }, createElement(AppRoutes)))));
    assert.equal(JSON.stringify(source.progress.getSnapshot()), before);
    assert.deepEqual(source.counts(), counts);
    return html;
  }

  const empty = scenario();
  const emptyDashboard = render(empty, '/');
  for (const text of ['0/8', '0/4', '0 de 8 missões concluídas', '0% do catálogo', '100 XP para alcançar o nível 2', '0 XP']) assert.ok(emptyDashboard.includes(text), text);
  assert.ok(emptyDashboard.includes('aria-label="Progresso até o próximo nível"'));
  assert.ok(emptyDashboard.includes('aria-valuenow="0"'));
  assert.ok(!emptyDashboard.includes('1.250'));
  assert.equal((render(empty, '/conquistas').match(/>Bloqueada</g) ?? []).length, 4);
  assert.ok(render(empty, '/missoes').includes('Iniciar missão:'));
  assert.ok(render(empty, '/resultados').includes('Resultado indisponível'));

  const loading = scenario(null, false);
  for (const path of ['/', '/missoes', '/conquistas']) {
    const html = render(loading, path);
    assert.ok(html.includes('Carregando progresso'));
    assert.ok(html.includes('… XP'));
    assert.ok(!html.includes('>0 XP<'));
    assert.ok(!html.includes('>0/8<'));
    assert.ok(!html.includes('>Bloqueada<'));
    assert.ok(!html.includes('>Ainda não concluída<'));
  }
  assert.equal(loading.counts().writes, 0);

  const zero = scenario();
  finish(zero, 'mission-01', 0);
  const zeroMissions = render(zero, '/missoes');
  assert.ok(zeroMissions.includes('Missão concluída'));
  assert.ok(zeroMissions.includes('XP reconhecido: <strong>0 XP</strong>'));
  assert.ok(zeroMissions.includes('Melhor desempenho: 0 de 5 acertos'));
  assert.ok(zeroMissions.includes('Tentar novamente: Primeiros Passos no Código'));
  const zeroResults = render(zero, '/resultados/mission-01');
  assert.ok(zeroResults.includes('+0 XP'));
  assert.ok(zeroResults.includes('Sem XP adicional'));
  assert.ok(zeroResults.includes('Primeiros Passos'));
  assert.ok(zeroResults.includes('progresso salvo neste navegador'));
  assert.equal((render(zero, '/conquistas').match(/>Desbloqueada</g) ?? []).length, 1);
  assert.ok(render(zero, '/conquistas').includes(`dateTime="${date}"`));

  const partial = scenario();
  finish(partial, 'mission-01', 3);
  const dashboard = render(partial, '/');
  for (const text of ['60 XP', '1/8', '1/4', '13% do catálogo', '40 XP para alcançar o nível 2']) assert.ok(dashboard.includes(text), text);
  assert.ok(dashboard.includes('aria-valuenow="60"'));
  const result = render(partial, '/resultados/mission-01');
  assert.ok(result.includes('+60 XP'));
  assert.ok(result.includes('Novas conquistas nesta tentativa'));
  assert.ok(render(partial, '/missoes').includes('Melhor desempenho: 3 de 5 acertos'));
  finish(partial, 'mission-01', 1);
  assert.ok(render(partial, '/resultados/mission-01').includes('+0 XP'));
  assert.ok(!render(partial, '/resultados/mission-01').includes('Novas conquistas nesta tentativa'));
  finish(partial, 'mission-01', 5);
  assert.ok(render(partial, '/resultados/mission-01').includes('+40 XP'));
  assert.ok(render(partial, '/resultados/mission-01').includes('Precisão Absoluta'));
  assert.ok(render(partial, '/missoes').includes('XP reconhecido: <strong>100 XP</strong>'));
  assert.ok(render(partial, '/missoes').includes('Melhor desempenho: 5 de 5 acertos'));
  for (const path of ['/resultados/mission-01', '/resultados/mission-01/revisao', '/', '/missoes', '/conquistas', '/resultados/mission-01']) render(partial, path);
  const review = render(partial, '/resultados/mission-01/revisao');
  assert.ok(review.includes('Sua resposta'));
  assert.ok(review.includes('Resposta correta'));
  assert.ok(review.includes('Justificativa'));
  assert.ok(!review.includes('type="radio"'));
  assert.ok(!review.includes('XP adicional nesta tentativa'));
  assert.ok(render(partial, '/resultados/mission-02').includes('Resultado indisponível'));

  // Repetição do mesmo evento no store continua sem prêmio na apresentação.
  const repeated = scenario();
  finish(repeated, 'mission-01', 5);
  const completed = repeated.completion.getSnapshot().completion;
  const replay = createQuizCompletionStore({ processCompletedAttempt: repeated.progress.processCompletedAttempt, retrySave: repeated.progress.retrySave });
  replay.completeAttempt({ missionId: completed.missionId, completion: completed });
  const duplicateView = render({ ...repeated, completion: replay }, '/resultados/mission-01');
  assert.ok(duplicateView.includes('+0 XP'));
  assert.ok(duplicateView.includes('Tentativa já registrada'));

  const complete = scenario();
  for (const mission of missions) finish(complete, mission.id, mission.questionIds.length);
  const max = render(complete, '/');
  for (const text of ['1.000 XP', '8/8', '4/4', '100% do catálogo', 'nível máximo disponível']) assert.ok(max.includes(text), text);
  assert.ok(max.includes('>11</p>'));
  assert.ok(!max.includes('nível 12'));
  assert.ok(max.includes('aria-valuenow="100"'));
  assert.equal((render(complete, '/conquistas').match(/>Desbloqueada</g) ?? []).length, 4);

  const failed = scenario();
  failed.memory.fail = true;
  finish(failed, 'mission-01', 5);
  const unsaved = render(failed, '/resultados/mission-01');
  for (const text of ['+100 XP', 'aplicadas em memória', 'Salvamento não confirmado', 'Tentar salvar novamente', 'Seu desempenho']) assert.ok(unsaved.includes(text), text);
  assert.ok(!unsaved.includes('progresso salvo neste navegador'));
  assert.ok(render(failed, '/').includes('não tem salvamento confirmado'));
  failed.memory.fail = false;
  failed.progress.retrySave();
  assert.ok(render(failed, '/resultados/mission-01').includes('progresso salvo neste navegador'));

  for (const raw of ['{', JSON.stringify({ ...createInitialProgress(), schemaVersion: 999 })]) {
    const broken = scenario(raw);
    const html = render(broken, '/');
    assert.ok(html.includes('foram preservados'));
    finish(broken, 'mission-01', 5);
    const brokenResults = render(broken, '/resultados/mission-01');
    assert.ok(brokenResults.includes('+100 XP'));
    assert.ok(brokenResults.includes('foram preservados'));
    assert.ok(!brokenResults.includes('progresso salvo neste navegador'));
    assert.equal(broken.counts().writes, 0);
  }
  const pending = scenario(null, false);
  finish(pending, 'mission-01', 5);
  const pendingResults = render(pending, '/resultados/mission-01');
  assert.ok(pendingResults.includes('Não confirmado'));
  assert.ok(pendingResults.includes('Aguardando o carregamento do progresso'));
  assert.ok(!pendingResults.includes('+0 XP'));
  console.log('UI de gamificação validada por renderização React: vazio, parcial, completo, nível máximo, missões, conquistas, entrega, falhas, hidratação e revisão. Nenhuma premiação ou gravação durante renderização.');
  console.log('Limitação: SSR e rotas em memória não validam layout, teclado ou efeitos em navegador real.');
} finally {
  await server.close();
}
