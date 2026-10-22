
export const missions = [
  {
    id: "mission-01",
    subjectId: "programming",
    title: "Primeiros Passos no Código",
    description: "Explore variáveis, tipos de dados e os fundamentos da programação.",
    difficulty: "easy",
    order: 1,
    questionIds: ["q01", "q02", "q03", "q04", "q05"],
    xpReward: 100,
  },
  {
    id: "mission-02",
    subjectId: "programming",
    title: "Desafio da Lógica",
    description: "Teste seus conhecimentos sobre condições, operadores e estruturas de repetição.",
    difficulty: "medium",
    order: 2,
    questionIds: ["q06", "q07", "q08", "q09", "q10"],
    xpReward: 150,
  },
  {
    id: "mission-03",
    subjectId: "database",
    title: "Explorando os Dados",
    description: "Conheça tabelas, registros, chaves e conceitos de bancos relacionais.",
    difficulty: "easy",
    order: 3,
    questionIds: ["q11", "q12", "q13", "q14", "q15"],
    xpReward: 100,
  },
  {
    id: "mission-04",
    subjectId: "database",
    title: "Mestre das Consultas",
    description: "Enfrente desafios envolvendo SQL, filtros e relacionamentos.",
    difficulty: "medium",
    order: 4,
    questionIds: ["q16", "q17", "q18", "q19", "q20"],
    xpReward: 150,
  },
  {
    id: "mission-05",
    subjectId: "networks",
    title: "Conectando o Mundo",
    description: "Descubra os fundamentos das redes, dispositivos e protocolos.",
    difficulty: "easy",
    order: 5,
    questionIds: ["q21", "q22", "q23", "q24", "q25"],
    xpReward: 100,
  },
  {
    id: "mission-06",
    subjectId: "networks",
    title: "Desvendando as Redes",
    description: "Resolva desafios sobre IP, DNS, roteamento e comunicação.",
    difficulty: "medium",
    order: 6,
    questionIds: ["q26", "q27", "q28", "q29", "q30"],
    xpReward: 150,
  },
  {
    id: "mission-07",
    subjectId: "security",
    title: "Guardião Digital",
    description: "Aprenda os princípios essenciais da segurança da informação.",
    difficulty: "easy",
    order: 7,
    questionIds: ["q31", "q32", "q33", "q34", "q35"],
    xpReward: 100,
  },
  {
    id: "mission-08",
    subjectId: "security",
    title: "Defesa Cibernética",
    description: "Identifique ameaças e aplique práticas de proteção digital.",
    difficulty: "medium",
    order: 8,
    questionIds: ["q36", "q37", "q38", "q39", "q40"],
    xpReward: 150,
  },
];

export const getMissionById = (id) => {
  return missions.find((mission) => mission.id === id);
};

export const getMissionsBySubject = (subjectId) => {
  return missions.filter(
    (mission) => mission.subjectId === subjectId
  );
};
