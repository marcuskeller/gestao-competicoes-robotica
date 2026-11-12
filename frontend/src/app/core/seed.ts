import type {
  Database,
  Escola,
  Equipe,
  Inscricao,
  Participante,
  Publicacao,
  Usuario,
} from './models';

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261111);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number): number => Math.floor(rand() * (max - min + 1)) + min;

function uuid(): string {
  const hex = '0123456789abcdef';
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    if (c === 'y') return hex[(rand() * 4 + 8) | 0];
    return hex[(rand() * 16) | 0];
  });
}

const iso = (diasAtras = 0, hora = 9): string => {
  const d = new Date(Date.UTC(2026, 10, 11, hora, 0, 0));
  d.setUTCDate(d.getUTCDate() - diasAtras);
  return d.toISOString();
};

const ESCOLAS: [string, Escola['rede']][] = [
  ['EMEF João Colin', 'municipal'],
  ['EMEF Alberto Santos Dumont', 'municipal'],
  ['EMEF Dr. Sadalla Amin Ghanem', 'municipal'],
  ['EMEF Prof.ª Ada Sant’Anna de Oliveira', 'municipal'],
  ['EMEF Prof. Orestes Guimarães', 'municipal'],
  ['EMEF Prefeito Joaquim Félix Moreira', 'municipal'],
  ['EMEF Prof.ª Lili Lúcia B. Moreira', 'municipal'],
  ['EMEF Max Colin', 'municipal'],
  ['EMEF Prof.ª Zulma do Rosário Miranda', 'municipal'],
  ['EMEF Prof. Sebastião de Oliveira', 'municipal'],
  ['EMEF Prefeito Baltasar Buschle', 'municipal'],
  ['EMEF Dr. Hans Dieter Schmidt', 'municipal'],
  ['EMEF Prof.ª Maria Regina Leal', 'municipal'],
  ['EMEF Rosa Maria Berezoski Demarchi', 'municipal'],
  ['EMEF Prof.ª Eladir Fátima Nascimento', 'municipal'],
  ['EMEF Guilherme Valente', 'municipal'],
  ['EMEF Prof.ª Terezinha de Jesus', 'municipal'],
  ['EMEF Prof. Francisco Bertoldi', 'municipal'],
  ['EMEF Parque Guarani', 'municipal'],
  ['EMEF Jardim Paraíso', 'municipal'],
  ['EMEF Vila Nova', 'municipal'],
  ['EMEF Costa e Silva', 'municipal'],
  ['EMEF Boa Vista', 'municipal'],
  ['EMEF Adhemar Garcia', 'municipal'],
  ['EMEF Espinheiros', 'municipal'],
  ['EMEF Itinga', 'municipal'],
  ['EEB Dom Pedro II', 'estadual'],
  ['EEB Juarez Machado', 'estadual'],
  ['EEB Prof.ª Jandira Dantas', 'estadual'],
  ['EEB Governador Celso Ramos', 'estadual'],
  ['EEB João Silveira', 'estadual'],
  ['EEB Prof.ª Maria Amin Ghanem', 'estadual'],
  ['EEB Plácido Olímpio de Oliveira', 'estadual'],
  ['Colégio Bom Jesus', 'privada'],
  ['Colégio Positivo', 'privada'],
];

const ADJETIVOS = [
  'Alpha', 'Turbo', 'Nova', 'Mega', 'Ultra', 'Cyber', 'Robo', 'Tecno', 'Astro', 'Hidra',
  'Vetor', 'Órbita', 'Quasar', 'Pulsar', 'Vórtice', 'Titã', 'Sentinela', 'Fênix', 'Gralha', 'Pinhão',
  'Araucária', 'Babitonga', 'Coral', 'Trovão', 'Relâmpago', 'Ímã', 'Engrenagem', 'Circuito', 'Chip', 'Byte',
  'Pixel', 'Lógica', 'Sinapse', 'Nexo', 'Prisma', 'Fusão', 'Liga', 'Núcleo', 'Eixo', 'Rotor',
];

const SUBSTANTIVOS = ['Bots', 'Labs', 'Tech', 'Makers', 'Robotics', 'Team', 'Squad', 'Forge', 'Core', 'Force'];

const NOMES = [
  'Ana', 'Beatriz', 'Bruno', 'Caio', 'Camila', 'Carlos', 'Davi', 'Eduarda', 'Enzo', 'Felipe',
  'Gabriel', 'Giovana', 'Guilherme', 'Helena', 'Igor', 'Isabela', 'João', 'Julia', 'Larissa', 'Lucas',
  'Manuela', 'Matheus', 'Maria', 'Nathan', 'Otávio', 'Pedro', 'Rafael', 'Sofia', 'Thiago', 'Valentina',
  'Yasmin', 'Arthur', 'Cecília', 'Diego', 'Elisa', 'Fernanda', 'Gustavo', 'Heitor', 'Lorenzo', 'Marina',
];

const SOBRENOMES = [
  'Silva', 'Souza', 'Oliveira', 'Pereira', 'Lima', 'Carvalho', 'Almeida', 'Ferreira', 'Rodrigues', 'Gomes',
  'Martins', 'Barbosa', 'Ribeiro', 'Alves', 'Monteiro', 'Cardoso', 'Rocha', 'Nascimento', 'Moraes', 'Teixeira',
];

function gerarEquipes(escolas: Escola[], edicaoId: number): Equipe[] {
  const equipes: Equipe[] = [];
  const usados = new Set<string>();
  let n = 0;
  while (n < 69) {
    const nome = `${pick(ADJETIVOS)} ${pick(SUBSTANTIVOS)}`;
    if (usados.has(nome)) continue;
    usados.add(nome);
    const escola = escolas[n % escolas.length];
    equipes.push({
      id: n + 1,
      identificador_publico: uuid(),
      edicao_id: edicaoId,
      escola_id: escola.id,
      nome,
      status: n < 60 ? 'confirmada' : 'inscrita',
      observacoes: '',
    });
    n += 1;
  }
  return equipes;
}

export function criarEstadoInicial(): Database {
  const usuarios: Usuario[] = [
    { id: 1, nome: 'Marina Coordenação', email: 'admin@arena.demo', perfil: 'administrador', tipo_conta: 'administrador', ativo: true },
    { id: 2, nome: 'Rafael Organização', email: 'organizador@arena.demo', perfil: 'organizador', tipo_conta: 'voluntario', ativo: true },
    { id: 3, nome: 'Bianca Mesária', email: 'mesario@arena.demo', perfil: 'mesario', tipo_conta: 'voluntario', ativo: true },
    { id: 4, nome: 'Paulo Homologação', email: 'homologador@arena.demo', perfil: 'homologador', tipo_conta: 'voluntario', ativo: true },
    { id: 5, nome: 'Julia Mentora', email: 'julia.mentora@arena.demo', perfil: 'voluntario', tipo_conta: 'voluntario', ativo: true },
    { id: 6, nome: 'Ana Parceira', email: 'ana@tecnologia.demo', perfil: 'empresa', tipo_conta: 'empresa', organizacao: 'Tecnologia Joinville Demo', ativo: true },
    { id: 7, nome: 'Lucas Estudante', email: 'lucas.estudante@arena.demo', perfil: 'participante', tipo_conta: 'participante', tipo_participante: 'pessoa_fisica', telefone: '(47) 90000-0201', ativo: true },
    { id: 8, nome: 'Carla Diretora', email: 'carla.diretora@escola.demo', perfil: 'participante', tipo_conta: 'participante', tipo_participante: 'escola', organizacao: 'Escola Municipal de Robótica Demo', cnpj: '11222333000181', telefone: '(47) 90000-0202', ativo: true },
  ];

  const edicoes: Database['edicoes'] = [
    {
      id: 1, identificador_publico: uuid(), ano: 2024, numero: 4,
      nome: '4ª Olimpíada Joinvilense de Robótica', tema: 'Robótica na escola',
      data_inicio: '2024-10-21', data_fim: '2024-10-25',
      local: 'Centro de Convenções de Joinville', status: 'encerrada',
    },
    {
      id: 2, identificador_publico: uuid(), ano: 2025, numero: 5,
      nome: '5ª Olimpíada Joinvilense de Robótica', tema: 'Cidades inteligentes',
      data_inicio: '2025-09-15', data_fim: '2025-09-19',
      local: 'Arena Joinville', status: 'encerrada',
    },
    {
      id: 3, identificador_publico: uuid(), ano: 2026, numero: 6,
      nome: '6º Campeonato Joinvilense de Robótica', tema: 'Robótica que transforma',
      data_inicio: '2026-11-09', data_fim: '2026-11-13',
      local: 'Arena Joinville — Setor Sul', status: 'em_andamento',
    },
  ];
  const edicaoAtual = edicoes[2];

  const modalidades: Database['modalidades'] = [
    {
      id: 1, identificador_publico: uuid(), edicao_id: edicaoAtual.id,
      nome: 'Robô Seguidor — Nível 1', slug: 'robo-seguidor-n1',
      descricao: 'Percurso linear com marcação curva suave.',
      tipo: 'equipe', min_integrantes: 2, max_integrantes: 4, ativo: true, ordem: 1,
    },
    {
      id: 2, identificador_publico: uuid(), edicao_id: edicaoAtual.id,
      nome: 'Robô Seguidor — Nível 2', slug: 'robo-seguidor-n2',
      descricao: 'Percurso com cruzamentos, rampa e obstáculos removíveis.',
      tipo: 'equipe', min_integrantes: 2, max_integrantes: 4, ativo: true, ordem: 2,
    },
    {
      id: 3, identificador_publico: uuid(), edicao_id: edicaoAtual.id,
      nome: 'Sumô de Robôs — 1 kg', slug: 'sumo-1kg',
      descricao: 'Combates em arena circular de 77 cm.',
      tipo: 'dupla', min_integrantes: 1, max_integrantes: 2, ativo: true, ordem: 3,
    },
    {
      id: 4, identificador_publico: uuid(), edicao_id: edicaoAtual.id,
      nome: 'Resgate — Ensino Fundamental', slug: 'resgate-fundamental',
      descricao: 'Robô autônomo em arena de resgate com vítimas simuladas.',
      tipo: 'equipe', min_integrantes: 2, max_integrantes: 4, ativo: true, ordem: 4,
    },
  ];

  const cargosVoluntarios: Database['cargosVoluntarios'] = [
    { id: 1, nome: 'Mentoria de equipes', descricao: 'Acompanhar estudantes durante a preparação e a competição.', vagas_total: 8, ativo: true },
    { id: 2, nome: 'Juiz ou mesário de pista', descricao: 'Apoiar a condução das disputas e registrar as súmulas.', vagas_total: 10, ativo: true },
    { id: 3, nome: 'Montagem de arena', descricao: 'Preparar pistas, arenas e materiais das modalidades.', vagas_total: 6, ativo: true },
    { id: 4, nome: 'Desenho de missões', descricao: 'Apoiar a criação e revisão de missões e desafios.', vagas_total: 4, ativo: true },
  ];
  const inscricoesVoluntarios: Database['inscricoesVoluntarios'] = [
    { id: 1, usuario_id: 2, cargo_id: 1, telefone: '(47) 90000-0101', disponibilidade: '10 e 11 de novembro, manhã e tarde', status: 'aprovada' },
    { id: 2, usuario_id: 3, cargo_id: 2, telefone: '(47) 90000-0102', disponibilidade: '11 e 12 de novembro, manhã', status: 'aprovada' },
    { id: 3, usuario_id: 5, cargo_id: 3, telefone: '(47) 90000-0103', disponibilidade: '9 de novembro, tarde', status: 'pendente' },
  ];
  const cadastrosParticipantes: Database['cadastrosParticipantes'] = [
    {
      id: 1, usuario_id: 7, tipo: 'pessoa_fisica', nome_escola: 'Escola Municipal de Robótica Demo',
      serie: '8º ano', responsavel: 'Responsável Fictício', telefone_responsavel: '(47) 90000-0201',
      modalidade_id: 1, equipe_nome: 'Equipe Estudante Demo', status: 'pendente',
    },
    {
      id: 2, usuario_id: 8, tipo: 'escola', cnpj: '11222333000181',
      nome_escola: 'Escola Municipal de Robótica Demo', telefone: '(47) 90000-0202',
      nome_equipe: 'Robôs do Futuro Demo', modalidade_id: 1,
      alunos: [{ nome: 'Estudante Fictício A', serie: '7º ano' }, { nome: 'Estudante Fictício B', serie: '8º ano' }],
      status: 'aprovada',
    },
  ];
  const parcerias: Database['parcerias'] = [
    { id: 1, usuario_id: 6, cnpj: '22334444000104', telefone: '(47) 90000-0301', valor_proposto: 0, mensagem: 'Doação fictícia de kits e materiais para a arena.', tipo_apoio: 'materiais', descricao_doacao: 'Doação fictícia de kits e materiais para a arena.', status: 'em_analise' },
  ];

  const criteriosPontuacao: Database['criteriosPontuacao'] = [
    { id: 1, modalidade_id: 2, nome: 'Precisão na linha', descricao: 'Saiu da linha? Perdeu ponto.', peso: 3, ordem: 1, ativo: true },
    { id: 2, modalidade_id: 2, nome: 'Tempo de percurso', descricao: 'Faixas de tempo convertidas em pontos.', peso: 2, ordem: 2, ativo: true },
    { id: 3, modalidade_id: 2, nome: 'Design e engenharia', descricao: 'Avaliação da estrutura e acabamento.', peso: 1, ordem: 3, ativo: true },
    { id: 4, modalidade_id: 1, nome: 'Conclusão do percurso', descricao: 'Percurso concluído integralmente.', peso: 2, ordem: 1, ativo: true },
    { id: 5, modalidade_id: 1, nome: 'Tempo', descricao: 'Menor tempo.', peso: 2, ordem: 2, ativo: true },
    { id: 6, modalidade_id: 3, nome: 'Combates vencidos', descricao: 'Pontos por vitória na arena.', peso: 5, ordem: 1, ativo: true },
    { id: 7, modalidade_id: 4, nome: 'Vítimas resgatadas', descricao: 'Quantidade e correta identificação.', peso: 4, ordem: 1, ativo: true },
  ];

  const criteriosDesempate: Database['criteriosDesempate'] = [
    { id: 1, modalidade_id: 2, nome: 'Pontos finais', campo: 'pontos_finais', direcao: 'desc', ordem: 1 },
    { id: 2, modalidade_id: 2, nome: 'Vitórias', campo: 'vitorias', direcao: 'desc', ordem: 2 },
    { id: 3, modalidade_id: 2, nome: 'Saldo de pontos', campo: 'saldo', direcao: 'desc', ordem: 3 },
    { id: 4, modalidade_id: 1, nome: 'Pontos finais', campo: 'pontos_finais', direcao: 'desc', ordem: 1 },
    { id: 5, modalidade_id: 1, nome: 'Tempo', campo: 'tempo', direcao: 'asc', ordem: 2 },
  ];

  const regras: Database['regras'] = [
    {
      id: 1, edicao_id: edicaoAtual.id, modalidade_id: null, versao: 1,
      titulo: 'Regulamento geral — 6ª edição',
      conteudo:
        'Art. 1º O campeonato é destinado a estudantes da rede municipal, estadual e privada de Joinville.\nArt. 2º Cada escola pode inscrever até 3 equipes por modalidade.\nArt. 3º Será desclassificada a equipe que atrasar mais de 10 minutos para a disputa.',
      status: 'publicada', publicada_em: iso(20, 10), publicada_por: 1, substitui_regra_id: null,
    },
    {
      id: 2, edicao_id: edicaoAtual.id, modalidade_id: 2, versao: 1,
      titulo: 'Edital técnico — Robô Seguidor Nível 2',
      conteudo:
        'Percurso de 12 m com cruzamentos e rampa de 8º.\nPontuação: precisão (peso 3), tempo (peso 2), design (peso 1).\nPenalidade de 5 pontos por toque na linha de referência.',
      status: 'revogada', publicada_em: iso(18, 9), publicada_por: 2, substitui_regra_id: null,
    },
    {
      id: 3, edicao_id: edicaoAtual.id, modalidade_id: 2, versao: 2,
      titulo: 'Edital técnico — Robô Seguidor Nível 2 (revisado)',
      conteudo:
        'Percurso de 12 m com cruzamentos e rampa de 8º.\nPontuação: precisão (peso 3), tempo (peso 2), design (peso 1).\nPenalidade de 5 pontos por toque na linha de referência.\nNovo desempate: vitórias antes de saldo de pontos.',
      status: 'publicada', publicada_em: iso(12, 8), publicada_por: 2, substitui_regra_id: 2,
    },
    {
      id: 4, edicao_id: edicaoAtual.id, modalidade_id: 3, versao: 1,
      titulo: 'Edital técnico — Sumô 1 kg',
      conteudo: 'Robôs de até 1 kg, 20x20 cm. Combate de 180 s ou saída da arena.',
      status: 'publicada', publicada_em: iso(11, 14), publicada_por: 2, substitui_regra_id: null,
    },
  ];

  const escolas: Escola[] = ESCOLAS.map(([nome, rede], i) => ({
    id: i + 1,
    identificador_publico: uuid(),
    nome,
    rede,
    municipio: 'Joinville',
    uf: 'SC',
    ativo: true,
  }));

  const equipes = gerarEquipes(escolas, edicaoAtual.id);

  const participantes: Participante[] = [];
  let pid = 0;
  equipes.forEach((eq) => {
    for (let i = 0; i < 3; i += 1) {
      pid += 1;
      participantes.push({
        id: pid,
        equipe_id: eq.id,
        nome: `${pick(NOMES)} ${pick(SOBRENOMES)}`,
        papel: i === 0 ? 'capitao' : 'integrante',
        serie: `${int(6, 9)}º ano`,
      });
    }
    pid += 1;
    participantes.push({
      id: pid,
      equipe_id: eq.id,
      nome: `${pick(NOMES)} ${pick(SOBRENOMES)}`,
      papel: 'tecnico',
      serie: 'Professor(a) orientador(a)',
    });
  });

  const inscricoes: Inscricao[] = [];
  let insId = 0;
  const statusN2: Inscricao['status'][] = [
    'aprovada', 'aprovada', 'aprovada', 'aprovada', 'aprovada', 'aprovada',
    'aprovada', 'aprovada', 'aprovada', 'aprovada', 'aprovada', 'aprovada',
    'submetida', 'submetida', 'em_analise', 'em_analise',
  ];
  statusN2.forEach((status, i) => {
    insId += 1;
    inscricoes.push({
      id: insId,
      identificador_publico: uuid(),
      edicao_id: edicaoAtual.id,
      equipe_id: equipes[i].id,
      modalidade_id: 2,
      status,
      submetida_em: iso(10 + i, 9),
      avaliada_em: status === 'aprovada' ? iso(8, 15) : null,
      avaliada_por: status === 'aprovada' ? 2 : null,
      motivo_rejeicao: null,
    });
  });
  const outrasModalidades = [1, 1, 1, 1, 3, 3, 3, 4, 4, 4, 4, 4];
  outrasModalidades.forEach((modalidadeId, i) => {
    insId += 1;
    inscricoes.push({
      id: insId,
      identificador_publico: uuid(),
      edicao_id: edicaoAtual.id,
      equipe_id: equipes[20 + i].id,
      modalidade_id: modalidadeId,
      status: i % 5 === 0 ? 'em_analise' : 'aprovada',
      submetida_em: iso(9 + i, 11),
      avaliada_em: i % 5 === 0 ? null : iso(7, 16),
      avaliada_por: i % 5 === 0 ? null : 2,
      motivo_rejeicao: null,
    });
  });

  const etapas: Database['etapas'] = [
    {
      id: 1, edicao_id: edicaoAtual.id, modalidade_id: 1, nome: 'Final — Nível 1',
      tipo: 'final', ordem: 1, data_inicio: '2026-11-10', data_fim: '2026-11-10', status: 'publicada',
    },
    {
      id: 2, edicao_id: edicaoAtual.id, modalidade_id: 2, nome: 'Fase de Grupos — Nível 2',
      tipo: 'grupos', ordem: 2, data_inicio: '2026-11-11', data_fim: '2026-11-12', status: 'em_andamento',
    },
    {
      id: 3, edicao_id: edicaoAtual.id, modalidade_id: 3, nome: 'Eliminatórias — Sumô',
      tipo: 'eliminatoria', ordem: 1, data_inicio: '2026-11-12', data_fim: '2026-11-12', status: 'planejada',
    },
  ];

  const grupos: Database['grupos'] = [
    { id: 1, etapa_id: 2, nome: 'Grupo A', ordem: 1 },
    { id: 2, etapa_id: 2, nome: 'Grupo B', ordem: 2 },
  ];

  const equipeGrupo: Database['equipeGrupo'] = [
    { grupo_id: 1, equipe_id: 1 },
    { grupo_id: 1, equipe_id: 2 },
    { grupo_id: 1, equipe_id: 3 },
    { grupo_id: 2, equipe_id: 4 },
    { grupo_id: 2, equipe_id: 5 },
    { grupo_id: 2, equipe_id: 6 },
  ];

  const disputas: Database['disputas'] = [
    { id: 1, etapa_id: 2, grupo_id: 1, codigo: 'FG-A1', rodada: 1, ordem: 1, arena: 'Pista 1', data_hora: '2026-11-11T09:00:00Z', status: 'concluida', equipe_a_id: 1, equipe_b_id: 2, vencedor_equipe_id: 1 },
    { id: 2, etapa_id: 2, grupo_id: 1, codigo: 'FG-A2', rodada: 1, ordem: 2, arena: 'Pista 1', data_hora: '2026-11-11T09:40:00Z', status: 'concluida', equipe_a_id: 3, equipe_b_id: 1, vencedor_equipe_id: 1 },
    { id: 3, etapa_id: 2, grupo_id: 1, codigo: 'FG-A3', rodada: 2, ordem: 3, arena: 'Pista 1', data_hora: '2026-11-11T10:20:00Z', status: 'concluida', equipe_a_id: 2, equipe_b_id: 3, vencedor_equipe_id: 2 },
    { id: 4, etapa_id: 2, grupo_id: 2, codigo: 'FG-B1', rodada: 1, ordem: 4, arena: 'Pista 2', data_hora: '2026-11-11T09:20:00Z', status: 'concluida', equipe_a_id: 4, equipe_b_id: 5, vencedor_equipe_id: 4 },
    { id: 5, etapa_id: 2, grupo_id: 2, codigo: 'FG-B2', rodada: 1, ordem: 5, arena: 'Pista 2', data_hora: '2026-11-11T10:00:00Z', status: 'concluida', equipe_a_id: 4, equipe_b_id: 6, vencedor_equipe_id: 4 },
    { id: 6, etapa_id: 2, grupo_id: 2, codigo: 'FG-B3', rodada: 2, ordem: 6, arena: 'Pista 2', data_hora: '2026-11-11T14:00:00Z', status: 'agendada', equipe_a_id: 5, equipe_b_id: 6, vencedor_equipe_id: null },
    { id: 7, etapa_id: 1, grupo_id: null, codigo: 'FINAL-N1', rodada: 1, ordem: 1, arena: 'Pista Central', data_hora: '2026-11-10T15:00:00Z', status: 'concluida', equipe_a_id: 21, equipe_b_id: 22, vencedor_equipe_id: 21 },
  ];

  // pontos = Σ (valor do critério × peso): precisão×3 + tempo×2 + design×1
  const resultadosSeed: { disputa_id: number; equipe_id: number; valores: number[]; penalidades: number }[] = [
    { disputa_id: 1, equipe_id: 1, valores: [9, 10, 5], penalidades: 0 },
    { disputa_id: 1, equipe_id: 2, valores: [8, 8, 6], penalidades: 0 },
    { disputa_id: 2, equipe_id: 3, valores: [8, 7, 7], penalidades: 0 },
    { disputa_id: 2, equipe_id: 1, valores: [8, 9, 6], penalidades: 0 },
    // FG-A3: equipes 2 e 3 terminam com 93 pontos — desempate por vitórias
    { disputa_id: 3, equipe_id: 2, valores: [9, 7, 6], penalidades: 0 },
    { disputa_id: 3, equipe_id: 3, valores: [9, 8, 5], penalidades: 0 },
    { disputa_id: 4, equipe_id: 4, valores: [10, 10, 5], penalidades: 0 },
    { disputa_id: 4, equipe_id: 5, valores: [9, 5, 4], penalidades: 2 },
    { disputa_id: 5, equipe_id: 4, valores: [9, 9, 6], penalidades: 0 },
    { disputa_id: 5, equipe_id: 6, valores: [8, 7, 6], penalidades: 0 },
    { disputa_id: 7, equipe_id: 21, valores: [10, 10, 8], penalidades: 0 },
    { disputa_id: 7, equipe_id: 22, valores: [9, 8, 6], penalidades: 5 },
  ];

  const resultados: Database['resultados'] = [];
  const pontuacoesCriterio: Database['pontuacoesCriterio'] = [];
  let rid = 0;
  let cid = 0;
  const PESOS = [3, 2, 1];
  resultadosSeed.forEach((r) => {
    rid += 1;
    const pontos = r.valores.reduce((soma, valor, i) => soma + valor * PESOS[i], 0);
    resultados.push({
      id: rid,
      disputa_id: r.disputa_id,
      equipe_id: r.equipe_id,
      pontos,
      penalidades: r.penalidades,
      pontos_finais: pontos - r.penalidades,
      posicao: null,
      observacao: '',
      registrado_por: 3,
      registrado_em: iso(1, 10),
    });
    r.valores.forEach((valor, i) => {
      cid += 1;
      pontuacoesCriterio.push({
        id: cid,
        resultado_disputa_id: rid,
        criterio_pontuacao_id: [1, 2, 3][i],
        valor,
        observacao: '',
      });
    });
  });

  const publicacoes: Publicacao[] = [
    {
      id: 1,
      edicao_id: edicaoAtual.id,
      etapa_id: 1,
      modalidade_id: 1,
      versao: 1,
      status: 'publicada',
      snapshot: null,
      homologado_por: 4,
      homologado_em: iso(1, 16),
      publicado_em: iso(1, 17),
      motivo_retificacao: null,
    },
  ];

  const logs: Database['logs'] = [];
  let logId = 0;
  const registrar = (
    tabela: string,
    registroId: number,
    acao: string,
    campo: string | null,
    anterior: unknown,
    novo: unknown,
    userId: number,
    horasAtras: number,
  ) => {
    logId += 1;
    const user = usuarios.find((u) => u.id === userId);
    logs.push({
      id: logId,
      tabela,
      registro_id: registroId,
      acao,
      campo,
      valor_anterior: anterior,
      valor_novo: novo,
      user_id: userId,
      user_nome: user?.nome ?? 'Sistema',
      ip: `10.0.0.${10 + userId}`,
      origem: 'web',
      created_at: iso(horasAtras, 9),
    });
  };

  for (let i = 1; i <= 12; i += 1) {
    registrar('inscricoes', i, 'alteracao', 'status', 'submetida', 'aprovada', 2, 8);
  }
  registrar('resultados_disputa', 1, 'criacao', null, null, '{"pontos":52,"penalidades":0}', 3, 1);
  registrar('resultados_disputa', 2, 'criacao', null, null, '{"pontos":46,"penalidades":0}', 3, 1);
  registrar('publicacoes_resultado', 1, 'publicacao', 'status', 'homologada', 'publicada', 4, 1);

  return {
    usuarios,
    cargosVoluntarios,
    inscricoesVoluntarios,
    cadastrosParticipantes,
    parcerias,
    edicoes,
    modalidades,
    criteriosPontuacao,
    criteriosDesempate,
    regras,
    escolas,
    equipes,
    participantes,
    inscricoes,
    etapas,
    grupos,
    equipeGrupo,
    disputas,
    resultados,
    pontuacoesCriterio,
    publicacoes,
    logs,
    usuarioAtualId: null,
  };
}

export const CONTAS_DEMO = [
  { email: 'admin@arena.demo', perfil: 'administrador', rotulo: 'Administração' },
  { email: 'organizador@arena.demo', perfil: 'organizador', rotulo: 'Organização' },
  { email: 'mesario@arena.demo', perfil: 'mesario', rotulo: 'Mesário de pista' },
  { email: 'homologador@arena.demo', perfil: 'homologador', rotulo: 'Homologação' },
] as const;

export const SENHA_DEMO = 'demo1234';
