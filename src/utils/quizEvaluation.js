import { hasText, hasValidOptions } from './questionValidation.js';

export function evaluateQuestion(question, selectedOptionId) {
  if (!question || !hasText(question.id) || !hasText(question.statement)
    || !hasValidOptions(question.options)) {
    return { status: 'invalid-question', message: 'A questão possui dados ou alternativas inválidas.' };
  }

  const correctOption = question.options.find(({ id }) => id === question.correctOptionId);
  if (!correctOption) {
    return { status: 'invalid-key', questionId: question.id, message: 'O gabarito desta questão está indisponível ou é inválido.' };
  }

  const selectedOption = question.options.find(({ id }) => id === selectedOptionId);
  if (!selectedOption) {
    return { status: 'invalid-answer', questionId: question.id, message: 'A resposta selecionada não corresponde a uma alternativa válida.' };
  }

  const isCorrect = selectedOption.id === correctOption.id;
  const hasExplanation = hasText(question.explanation);

  return {
    status: 'evaluated',
    questionId: question.id,
    statement: question.statement,
    selectedOption: { ...selectedOption },
    correctOption: { ...correctOption },
    isCorrect,
    feedback: isCorrect ? 'Resposta correta. Bom trabalho!' : 'Vamos revisar: confira a alternativa correta e a justificativa abaixo.',
    hasExplanation,
    explanation: hasExplanation ? question.explanation : 'A justificativa desta questão não está disponível.',
  };
}

// Recebe o estado da tentativa para exigir sua conclusão; usa apenas o snapshot.
export function evaluateAttempt(attempt, questions) {
  if (!attempt?.completion) {
    return { status: 'not-completed', message: 'Finalize a tentativa antes de acessar a correção.' };
  }

  const { completion } = attempt;
  const answers = completion.answers;
  if (!hasText(attempt.missionId) || completion.missionId !== attempt.missionId
    || !Array.isArray(questions) || questions.length === 0
    || Array.from(questions).some((question) => !question || question.missionId !== completion.missionId || !hasText(question.id))
    || new Set(questions.map(({ id }) => id)).size !== questions.length
    || !answers || typeof answers !== 'object' || Array.isArray(answers)
    || Object.keys(answers).length !== questions.length
    || questions.some(({ id }) => !Object.hasOwn(answers, id))) {
    return { status: 'invalid-attempt', message: 'A tentativa está incompleta ou não corresponde às questões desta missão.' };
  }

  const evaluations = questions.map((question) => evaluateQuestion(question, answers[question.id]));
  const invalidEvaluation = evaluations.find(({ status }) => status !== 'evaluated');
  if (invalidEvaluation) {
    return { status: 'invalid-evaluation', message: invalidEvaluation.message, evaluations };
  }

  const correctCount = evaluations.filter(({ isCorrect }) => isCorrect).length;
  return {
    status: 'evaluated',
    missionId: completion.missionId,
    totalQuestions: questions.length,
    correctCount,
    incorrectCount: questions.length - correctCount,
    percentage: (correctCount / questions.length) * 100,
    evaluations,
  };
}

// Valida o contrato da apresentação, sem consultar ou duplicar o gabarito.
export function isValidEvaluation(evaluation) {
  return evaluation?.status === 'evaluated'
    && hasText(evaluation.missionId)
    && Number.isInteger(evaluation.totalQuestions) && evaluation.totalQuestions > 0
    && Number.isInteger(evaluation.correctCount) && evaluation.correctCount >= 0
    && Number.isInteger(evaluation.incorrectCount) && evaluation.incorrectCount >= 0
    && evaluation.correctCount + evaluation.incorrectCount === evaluation.totalQuestions
    && evaluation.percentage === (evaluation.correctCount / evaluation.totalQuestions) * 100
    && Array.isArray(evaluation.evaluations)
    && evaluation.evaluations.length === evaluation.totalQuestions
    && Array.from(evaluation.evaluations).every((item) => item?.status === 'evaluated'
      && hasText(item.questionId) && hasText(item.statement)
      && typeof item.isCorrect === 'boolean'
      && hasText(item.selectedOption?.id) && hasText(item.selectedOption?.text)
      && hasText(item.correctOption?.id) && hasText(item.correctOption?.text)
      && hasText(item.feedback) && hasText(item.explanation));
}
