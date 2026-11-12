import type { Database } from '../core/models';

type Collection = Exclude<keyof Database, 'usuarioAtualId' | 'usuarios'>;
interface ModuleConfig {
  title: string;
  description: string;
  source?: Collection;
  columns: { key: string; label: string }[];
  permission?: string;
  create?: { label: string; permission: string };
}
const cols = (...pairs: [string, string][]) => pairs.map(([key, label]) => ({ key, label }));
export const MODULES = {
  edicoes: {
    title: 'Edições',
    description: 'Organize o calendário e acompanhe o ciclo de cada edição.',
    source: 'edicoes',
    columns: cols(
      ['nome', 'Edição'],
      ['ano', 'Ano'],
      ['local', 'Local'],
      ['data_inicio', 'Início'],
      ['status', 'Status'],
    ),
    create: { label: 'Nova edição', permission: 'edicao.criar' },
  },
  modalidades: {
    title: 'Modalidades e critérios',
    description: 'Configure as modalidades e suas regras de participação.',
    source: 'modalidades',
    columns: cols(
      ['nome', 'Modalidade'],
      ['tipo', 'Tipo'],
      ['min_integrantes', 'Mínimo'],
      ['max_integrantes', 'Máximo'],
    ),
    create: { label: 'Nova modalidade', permission: 'modalidade.editar' },
  },
  criterios: {
    title: 'Critérios de pontuação',
    description: 'A pontuação considera o valor lançado multiplicado pelo peso.',
    source: 'criteriosPontuacao',
    columns: cols(
      ['modalidade', 'Modalidade'],
      ['nome', 'Critério'],
      ['peso', 'Peso'],
      ['ordem', 'Ordem'],
    ),
    create: { label: 'Novo critério', permission: 'criterio.editar' },
  },
  desempates: {
    title: 'Critérios de desempate',
    description: 'Os critérios são aplicados na ordem cadastrada.',
    source: 'criteriosDesempate',
    columns: cols(
      ['modalidade', 'Modalidade'],
      ['nome', 'Critério'],
      ['campo', 'Campo'],
      ['direcao', 'Direção'],
      ['ordem', 'Ordem'],
    ),
    create: { label: 'Novo desempate', permission: 'criterio.editar' },
  },
  regras: {
    title: 'Regras versionadas',
    description: 'Uma nova publicação preserva a versão anterior como revogada.',
    source: 'regras',
    columns: cols(
      ['titulo', 'Título'],
      ['modalidade', 'Modalidade'],
      ['versao', 'Versão'],
      ['conteudo', 'Conteúdo'],
      ['status', 'Status'],
    ),
    create: { label: 'Publicar regra', permission: 'regra.publicar' },
  },
  escolas: {
    title: 'Escolas',
    description: 'Instituições participantes do campeonato.',
    source: 'escolas',
    columns: cols(['nome', 'Escola'], ['rede', 'Rede'], ['municipio', 'Município'], ['uf', 'UF']),
    create: { label: 'Nova escola', permission: 'escola.editar' },
  },
  equipes: {
    title: 'Equipes',
    description: 'Equipes vinculadas às escolas e edições.',
    source: 'equipes',
    columns: cols(['nome', 'Equipe'], ['escola', 'Escola'], ['status', 'Status']),
    create: { label: 'Nova equipe', permission: 'equipe.editar' },
  },
  participantes: {
    title: 'Participantes',
    description: 'Participantes fictícios para a demonstração.',
    source: 'participantes',
    columns: cols(['nome', 'Nome'], ['equipe', 'Equipe'], ['papel', 'Papel'], ['serie', 'Série']),
    create: { label: 'Novo participante', permission: 'equipe.editar' },
  },
  inscricoes: {
    title: 'Inscrições',
    description: 'Inscreva equipes e avalie sua participação por modalidade.',
    source: 'inscricoes',
    columns: cols(
      ['equipe', 'Equipe'],
      ['modalidade', 'Modalidade'],
      ['status', 'Status'],
      ['motivo_rejeicao', 'Motivo'],
    ),
    create: { label: 'Nova inscrição', permission: 'equipe.editar' },
  },
  etapas: {
    title: 'Etapas e chaveamento',
    description: 'Crie fases de grupos e gere os confrontos das equipes aprovadas.',
    source: 'etapas',
    columns: cols(
      ['nome', 'Etapa'],
      ['modalidade', 'Modalidade'],
      ['tipo', 'Tipo'],
      ['status', 'Status'],
    ),
    create: { label: 'Nova etapa', permission: 'etapa.editar' },
  },
  disputas: {
    title: 'Disputas',
    description: 'Acompanhe os confrontos e conclua as disputas após registrar os pontos.',
    source: 'disputas',
    columns: cols(
      ['codigo', 'Código'],
      ['etapa', 'Etapa'],
      ['confronto', 'Confronto'],
      ['arena', 'Arena'],
      ['status', 'Status'],
    ),
  },
  resultados: {
    title: 'Pontuações registradas',
    description: 'Para lançar ou corrigir pontos, abra a disputa correspondente.',
    source: 'resultados',
    columns: cols(
      ['disputa', 'Disputa'],
      ['equipe', 'Equipe'],
      ['pontos', 'Pontos'],
      ['penalidades', 'Penalidades'],
      ['pontos_finais', 'Total'],
    ),
  },
  classificacao: {
    title: 'Classificação',
    description: 'Calculada automaticamente a partir das disputas concluídas.',
    columns: cols(
      ['posicao', 'Posição'],
      ['equipe_nome', 'Equipe'],
      ['pontos_finais', 'Pontos'],
      ['vitorias', 'Vitórias'],
      ['desempateAplicado', 'Desempate'],
    ),
    permission: 'classificacao.interna',
  },
  publicacao: {
    title: 'Homologação e publicação',
    description: 'Confira as disputas antes de homologar e publicar os resultados.',
    source: 'etapas',
    columns: cols(['nome', 'Etapa'], ['modalidade', 'Modalidade'], ['status', 'Status']),
  },
  auditoria: {
    title: 'Trilha de auditoria',
    description: 'Histórico local das operações de demonstração. IPs são simulados.',
    source: 'logs',
    columns: cols(
      ['created_at', 'Data'],
      ['user_nome', 'Autor'],
      ['acao', 'Ação'],
      ['tabela', 'Registro'],
      ['valor_anterior', 'Antes'],
      ['valor_novo', 'Depois'],
    ),
    permission: 'auditoria.ver',
  },
  interop: {
    title: 'Interoperabilidade',
    description: 'Snapshots versionados dos resultados publicados.',
    source: 'publicacoes',
    columns: cols(
      ['etapa', 'Etapa'],
      ['versao', 'Versão'],
      ['status', 'Status'],
      ['publicado_em', 'Publicado em'],
    ),
  },
} satisfies Record<string, ModuleConfig>;
export type ModuleKey = keyof typeof MODULES;
export function moduleConfig(key: ModuleKey): ModuleConfig {
  return MODULES[key];
}
