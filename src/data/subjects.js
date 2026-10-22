
export const subjects = [
  {
    id: "programming",
    name: "Programação",
    description: "Fundamentos de lógica e desenvolvimento.",
    icon: "Code2",
    color: "blue",
    order: 1,
  },
  {
    id: "database",
    name: "Banco de Dados",
    description: "Modelagem, SQL e organização de dados.",
    icon: "Database",
    color: "green",
    order: 2,
  },
  {
    id: "networks",
    name: "Redes de Computadores",
    description: "Protocolos, infraestrutura e comunicação.",
    icon: "Network",
    color: "purple",
    order: 3,
  },
  {
    id: "security",
    name: "Segurança da Informação",
    description: "Proteção de dados e segurança digital.",
    icon: "ShieldCheck",
    color: "orange",
    order: 4,
  },
];

export const getSubjectById = (id) => {
  return subjects.find((subject) => subject.id === id);
};
