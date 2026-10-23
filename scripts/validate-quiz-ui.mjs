import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, MemoryRouter, RouterProvider, Routes, Route } from 'react-router';
import { createServer } from 'vite';

// Renderização sem navegador: valida a integração da página com dados e hook.
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
});

try {
  const { default: Quiz } = await server.ssrLoadModule('/src/pages/Quiz.jsx');
  const { QuizResultProvider } = await server.ssrLoadModule('/src/context/QuizResultProvider.jsx');
  const { ProgressProvider } = await server.ssrLoadModule('/src/context/ProgressProvider.jsx');
  const { QuizResultContext } = await server.ssrLoadModule('/src/context/QuizResultContext.js');
  const { AppRoutes } = await server.ssrLoadModule('/src/routes/AppRouter.jsx');
  const { getCompletedResult, getPerformanceMessage } = await server.ssrLoadModule('/src/utils/quizResults.js');
  const { missions } = await server.ssrLoadModule('/src/data/missions.js');
  const { questions } = await server.ssrLoadModule('/src/data/questions.js');
  const { default: QuizReview } = await server.ssrLoadModule('/src/components/quiz/QuizReview.jsx');
  const { evaluateAttempt } = await server.ssrLoadModule('/src/utils/quizEvaluation.js');
  const { createQuizAttempt, updateQuizAttempt } = await server.ssrLoadModule('/src/utils/quizAttempt.js');
  const render = (url) => renderToStaticMarkup(createElement(ProgressProvider, null, createElement(QuizResultProvider, null,
    createElement(MemoryRouter, { initialEntries: [url] },
    createElement(Routes, null,
      createElement(Route, { path: '/quiz', element: createElement(Quiz) }),
      createElement(Route, { path: '/quiz/:missionId', element: createElement(Quiz) }))))));
  const escapeText = (value) => renderToStaticMarkup(createElement('span', null, value)).slice(6, -7);

  for (const mission of missions) {
    const html = render(`/quiz/${mission.id}`);
    const question = questions.find(({ missionId }) => missionId === mission.id);
    assert.ok(html.includes(escapeText(mission.title)));
    assert.ok(html.includes(escapeText(question.statement)));
    assert.equal((html.match(/type="radio"/g) || []).length, 4);
    assert.ok(html.includes('<fieldset aria-labelledby="question-heading">'));
    assert.match(html, /<h2[^>]*id="question-heading"/);
    assert.ok(html.includes('<legend class="sr-only">Alternativas da questão</legend>'));
    assert.ok(html.includes('0 de 5 respondidas'));
    assert.ok(html.includes('aria-valuenow="0"'));
    assert.match(html, /disabled="">Anterior<\/button>/);
    assert.match(html, /disabled="">Próxima<\/button>/);
    assert.match(html, /disabled="">Finalizar<\/button>/);
    assert.ok(!html.includes('checked=""'));
    assert.ok(!html.includes(escapeText(question.explanation)));
    assert.ok(!html.includes('Resposta correta'));
    assert.ok(!html.includes('Resposta incorreta'));
    assert.ok(!html.includes('Justificativa'));
    assert.equal(render(`/quiz/${mission.id}`), html);

    const missionQuestions = questions.filter(({ missionId }) => missionId === mission.id);
    for (const allCorrect of [true, false]) {
      let attempt = createQuizAttempt(mission.id, `ui-${mission.id}`);
      for (const item of missionQuestions) {
        const optionId = allCorrect ? item.correctOptionId : item.options.find(({ id }) => id !== item.correctOptionId).id;
        attempt = updateQuizAttempt(attempt, { type: 'select', optionId }, missionQuestions);
        attempt = updateQuizAttempt(attempt, { type: 'next' }, missionQuestions);
      }
      attempt = updateQuizAttempt(attempt, { type: 'finish', completedAt: '2026-10-22T12:00:00.000Z' }, missionQuestions);
      const evaluation = evaluateAttempt(attempt, missionQuestions);
      const reviewHtml = renderToStaticMarkup(createElement(QuizReview, { evaluation, onRestart: () => {} }));
      assert.ok(reviewHtml.includes('Tentativa concluída'));
      assert.ok(reviewHtml.includes('Revisão: questão 1 de 5'));
      assert.ok(reviewHtml.includes(escapeText(question.statement)));
      assert.ok(reviewHtml.includes(escapeText(question.explanation)));
      assert.ok(reviewHtml.includes(escapeText(evaluation.evaluations[0].selectedOption.text)));
      assert.ok(reviewHtml.includes(escapeText(evaluation.evaluations[0].correctOption.text)));
      assert.ok(reviewHtml.includes(allCorrect ? 'Acerto' : 'Resposta incorreta'));
      assert.ok(reviewHtml.includes('Sua resposta'));
      assert.ok(reviewHtml.includes('Resposta correta'));
      assert.ok(reviewHtml.includes('Reiniciar missão'));
      assert.ok(!reviewHtml.includes('<input'));
      assert.match(reviewHtml, /disabled="">Questão anterior<\/button>/);

      const noExplanation = evaluateAttempt(attempt, missionQuestions.map((item) => ({ ...item, explanation: undefined })));
      const fallbackHtml = renderToStaticMarkup(createElement(QuizReview, { evaluation: noExplanation }));
      assert.ok(fallbackHtml.includes('A justificativa desta questão não está disponível.'));
    }
  }
  assert.ok(render('/quiz').includes('Escolha uma missão para começar'));
  assert.ok(render('/quiz/mission-99').includes('Missão não encontrada'));
  const options = questions[0].options;
  try {
    questions[0].options = [];
    assert.ok(render('/quiz/mission-01').includes('Não foi possível carregar as questões'));
  } finally {
    questions[0].options = options;
  }
  const reviewError = renderToStaticMarkup(createElement(QuizReview, {
    evaluation: { status: 'invalid-evaluation', message: 'Gabarito inválido.' },
  }));
  assert.ok(reviewError.includes('Revisão indisponível'));
  assert.ok(reviewError.includes('Gabarito inválido.'));
  assert.ok(!reviewError.includes('Resposta correta'));
  for (const evaluation of [
    { status: 'evaluated' },
    { status: 'evaluated', evaluations: [], totalQuestions: 5 },
    { status: 'evaluated', evaluations: [null], totalQuestions: 1 },
  ]) {
    const malformedReview = renderToStaticMarkup(createElement(QuizReview, { evaluation }));
    assert.ok(malformedReview.includes('Revisão indisponível'));
  }

  const { default: Sidebar } = await server.ssrLoadModule('/src/components/layout/Sidebar.jsx');
  const { default: Header } = await server.ssrLoadModule('/src/components/layout/Header.jsx');
  for (const isOpen of [false, true]) {
    const sidebarHtml = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Sidebar, { isOpen, onClose: () => {} })));
    assert.ok(sidebarHtml.includes(isOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'));
    assert.equal(sidebarHtml.includes('aria-modal="true"'), isOpen);
    assert.ok(sidebarHtml.includes('lg:visible'));
    const headerHtml = renderToStaticMarkup(createElement(ProgressProvider, null, createElement(Header, { isMenuOpen: isOpen })));
    assert.ok(headerHtml.includes(`aria-expanded="${isOpen}"`));
    assert.ok(headerHtml.includes('aria-controls="praiateca-sidebar"'));
  }

  // Usa as rotas reais da aplicação e o mesmo resultado derivado nas duas telas.
  for (const mission of missions) {
    const missionQuestions = questions.filter(({ missionId }) => missionId === mission.id);
    for (const correctCount of [0, 2, 3, 4, 5]) {
      const router = createMemoryRouter([{ path: '*', element: createElement(AppRoutes) }], {
        initialEntries: [`/quiz/${mission.id}`],
      });
      try {
        let result = getCompletedResult(null);
        const renderFlow = () => renderToStaticMarkup(createElement(ProgressProvider, null, createElement(QuizResultContext.Provider, {
          value: { result, clearResult: () => {}, completeAttempt: () => false },
        }, createElement(RouterProvider, { router }))));
        assert.ok(renderFlow().includes('0 de 5 respondidas'));
        assert.ok(renderFlow().includes('href="#main-content"'));

        let attempt = createQuizAttempt(mission.id, `flow-${mission.id}`);
        for (const [index, item] of missionQuestions.entries()) {
          const optionId = index < correctCount ? item.correctOptionId : item.options.find(({ id }) => id !== item.correctOptionId).id;
          attempt = updateQuizAttempt(attempt, { type: 'select', optionId }, missionQuestions);
          attempt = updateQuizAttempt(attempt, { type: 'next' }, missionQuestions);
        }
        attempt = updateQuizAttempt(attempt, { type: 'finish', completedAt: '2026-10-22T12:00:00.000Z' }, missionQuestions);
        result = getCompletedResult(attempt.completion);
        const snapshotBeforeReview = JSON.stringify(attempt.completion);
        const resultPath = `/resultados/${mission.id}`;
        await router.navigate(resultPath);
        const resultHtml = renderFlow();
        assert.ok(resultHtml.includes('MISSÃO CONCLUÍDA'));
        assert.ok(resultHtml.includes(escapeText(mission.title)));
        assert.ok(resultHtml.includes(escapeText(result.subject.name)));
        assert.ok(resultHtml.includes(`${correctCount * 20}%`));
        assert.ok(resultHtml.includes(`aria-valuenow="${correctCount}"`));
        assert.ok(resultHtml.includes('aria-valuemax="5"'));
        assert.ok(resultHtml.includes('Total de questões'));
        assert.ok(resultHtml.includes('Acertos'));
        assert.ok(resultHtml.includes('Erros'));
        assert.ok(resultHtml.includes(escapeText(getPerformanceMessage(correctCount * 20))));
        assert.ok(resultHtml.includes(`href="${resultPath}/revisao"`));
        assert.ok(resultHtml.includes('Tentar novamente'));

        await router.navigate(`${resultPath}/revisao`);
        const reviewHtml = renderFlow();
        assert.ok(reviewHtml.includes('Sua resposta'));
        assert.ok(reviewHtml.includes(escapeText(missionQuestions[0].explanation)));
        assert.ok(reviewHtml.includes(`href="${resultPath}"`));
        assert.ok(!reviewHtml.includes('type="radio"'));
        assert.equal(JSON.stringify(attempt.completion), snapshotBeforeReview);
        await router.navigate(resultPath);
        assert.equal(renderFlow(), resultHtml);
        await router.navigate(-1);
        assert.ok(renderFlow().includes('Sua resposta'));
        await router.navigate(1);
        assert.equal(renderFlow(), resultHtml);
        await router.navigate('/resultados');
        assert.ok(renderFlow().includes(escapeText(mission.title)));

        const otherMission = missions.find(({ id }) => id !== mission.id);
        await router.navigate(`/resultados/${otherMission.id}`);
        assert.ok(renderFlow().includes('Resultado indisponível'));
        await router.navigate(`/resultados/${otherMission.id}/revisao`);
        assert.ok(renderFlow().includes('Resultado indisponível'));

        // Sem snapshot (reinício ou recarga), as rotas não reutilizam a avaliação.
        result = getCompletedResult(null);
        await router.navigate(`/quiz/${mission.id}`);
        const newQuiz = renderFlow();
        assert.ok(newQuiz.includes('0 de 5 respondidas'));
        assert.ok(!newQuiz.includes('checked=""'));
        for (const route of ['/resultados', resultPath, `${resultPath}/revisao`, '/resultados/mission-99']) {
          await router.navigate(route);
          const emptyHtml = renderFlow();
          assert.ok(emptyHtml.includes('Resultado indisponível'));
          assert.ok(emptyHtml.includes('Selecionar uma missão'));
        }
        result = getCompletedResult({ missionId: mission.id, answers: {} });
        assert.ok(renderFlow().includes('Resultado indisponível'));
        await router.navigate('/rota-inexistente');
        assert.ok(renderFlow().includes('Página não encontrada'));
      } finally {
        router.dispose();
      }
    }
  }
  console.log('Interface validada por renderização React: oito rotas, quiz sem correção antecipada, revisões de acertos/erros sem edição, justificativas e estados de erro.');
  console.log('Rotas de Resultados validadas com navegação em memória: quiz, resultados, revisão e retorno, percentuais, ausência de snapshot e isolamento entre missões.');
} finally {
  await server.close();
}
