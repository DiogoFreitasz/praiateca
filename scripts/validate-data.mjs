import { missions } from '../src/data/missions.js';
import { questions } from '../src/data/questions.js';
import { subjects } from '../src/data/subjects.js';

const errors = [];

const check = (condition, message) => {
  if (!condition) errors.push(message);
};

const hasUniqueValues = (values) => new Set(values).size === values.length;
const expectedQuestionIds = Array.from(
  { length: 40 },
  (_, index) => `q${String(index + 1).padStart(2, '0')}`,
);

const subjectIds = subjects.map(({ id }) => id);
const missionIds = missions.map(({ id }) => id);
const questionIds = questions.map(({ id }) => id);

check(subjects.length === 4, `Esperadas 4 disciplinas; encontradas ${subjects.length}.`);
check(missions.length === 8, `Esperadas 8 missões; encontradas ${missions.length}.`);
check(questions.length === 40, `Esperadas 40 questões; encontradas ${questions.length}.`);
check(hasUniqueValues(subjectIds), 'Existem IDs de disciplinas duplicados.');
check(hasUniqueValues(missionIds), 'Existem IDs de missões duplicados.');
check(hasUniqueValues(questionIds), 'Existem IDs de questões duplicados.');
check(
  expectedQuestionIds.every((id, index) => questionIds[index] === id),
  'As questões devem estar ordenadas sequencialmente de q01 a q40.',
);

for (const subject of subjects) {
  const subjectMissions = missions.filter(({ subjectId }) => subjectId === subject.id);
  check(subjectMissions.length === 2, `${subject.id} deve possuir exatamente duas missões.`);
}

for (const mission of missions) {
  const missionQuestions = questions.filter(({ missionId }) => missionId === mission.id);
  const expectedReward = mission.difficulty === 'easy' ? 100 : 150;

  check(subjectIds.includes(mission.subjectId), `${mission.id} referencia uma disciplina inexistente.`);
  check(['easy', 'medium'].includes(mission.difficulty), `${mission.id} possui dificuldade inválida.`);
  check(mission.xpReward === expectedReward, `${mission.id} possui recompensa incompatível com a dificuldade.`);
  check(mission.questionIds.length === 5, `${mission.id} deve listar cinco IDs de questões.`);
  check(hasUniqueValues(mission.questionIds), `${mission.id} possui IDs de questões repetidos.`);
  check(missionQuestions.length === 5, `${mission.id} deve possuir cinco questões vinculadas.`);
  check(
    mission.questionIds.every((id) => questionIds.includes(id)),
    `${mission.id} referencia uma questão inexistente.`,
  );
  check(
    mission.questionIds.every((id) => missionQuestions.some((question) => question.id === id)),
    `${mission.id} possui referência para questão vinculada a outra missão.`,
  );
}

for (const question of questions) {
  const mission = missions.find(({ id }) => id === question.missionId);
  const optionIds = question.options.map(({ id }) => id);

  check(Boolean(mission), `${question.id} referencia uma missão inexistente.`);
  check(subjectIds.includes(question.subjectId), `${question.id} referencia uma disciplina inexistente.`);
  check(
    !mission || mission.subjectId === question.subjectId,
    `${question.id} não pertence à mesma disciplina de sua missão.`,
  );
  check(question.options.length === 4, `${question.id} deve possuir quatro alternativas.`);
  check(hasUniqueValues(optionIds), `${question.id} possui IDs de alternativas repetidos.`);
  check(
    optionIds.filter((id) => id === question.correctOptionId).length === 1,
    `${question.id} deve possuir exatamente uma alternativa correta válida.`,
  );
  check(
    typeof question.explanation === 'string' && question.explanation.trim().length > 0,
    `${question.id} deve possuir uma explicação.`,
  );
}

if (errors.length > 0) {
  console.error('Validação dos dados falhou:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('Dados validados com sucesso:');
  console.log(`- ${subjects.length} disciplinas, com duas missões cada`);
  console.log(`- ${missions.length} missões, com cinco questões cada`);
  console.log(`- ${questions.length} questões, com quatro alternativas e uma resposta válida`);
  console.log('- IDs únicos e referências entre entidades consistentes');
}
