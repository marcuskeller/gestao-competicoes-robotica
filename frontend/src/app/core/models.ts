export type Perfil = 'administrador' | 'organizador' | 'mesario' | 'homologador';

export type StatusEdicao = 'planejada' | 'inscricoes' | 'em_andamento' | 'encerrada' | 'cancelada';
export type StatusInscricao = 'submetida' | 'em_analise' | 'aprovada' | 'rejeitada' | 'cancelada';
export type StatusEtapa = 'planejada' | 'em_andamento' | 'concluida' | 'homologada' | 'publicada' | 'cancelada';
export type StatusDisputa = 'agendada' | 'em_andamento' | 'concluida' | 'cancelada' | 'wo';
export type StatusPublicacao = 'pendente' | 'homologada' | 'publicada' | 'retificada';
export type TipoEtapa = 'grupos' | 'eliminatoria' | 'avaliacao_tecnica' | 'final';
export type Rede = 'municipal' | 'estadual' | 'federal' | 'privada';
export type CampoDesempate = 'pontos_finais' | 'penalidades' | 'vitorias' | 'saldo' | 'tempo';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
}

export interface Edicao {
  id: number;
  identificador_publico: string;
  ano: number;
  numero: number;
  nome: string;
  tema: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  status: StatusEdicao;
}

export interface Modalidade {
  id: number;
  identificador_publico: string;
  edicao_id: number;
  nome: string;
  slug: string;
  descricao: string;
  tipo: 'individual' | 'dupla' | 'equipe';
  min_integrantes: number;
  max_integrantes: number;
  ativo: boolean;
  ordem: number;
}

export interface CriterioPontuacao {
  id: number;
  modalidade_id: number;
  nome: string;
  descricao: string;
  peso: number;
  ordem: number;
  ativo: boolean;
}

export interface CriterioDesempate {
  id: number;
  modalidade_id: number;
  nome: string;
  campo: CampoDesempate;
  direcao: 'asc' | 'desc';
  ordem: number;
}

export interface Regra {
  id: number;
  edicao_id: number;
  modalidade_id: number | null;
  versao: number;
  titulo: string;
  conteudo: string;
  status: 'rascunho' | 'publicada' | 'revogada';
  publicada_em: string | null;
  publicada_por: number | null;
  substitui_regra_id: number | null;
}

export interface Escola {
  id: number;
  identificador_publico: string;
  nome: string;
  rede: Rede;
  municipio: string;
  uf: string;
  ativo: boolean;
}

export interface Equipe {
  id: number;
  identificador_publico: string;
  edicao_id: number;
  escola_id: number;
  nome: string;
  status: 'inscrita' | 'confirmada' | 'desclassificada' | 'desistente';
  observacoes: string;
}

export interface Participante {
  id: number;
  equipe_id: number;
  nome: string;
  papel: 'capitao' | 'integrante' | 'tecnico';
  serie: string;
}

export interface Inscricao {
  id: number;
  identificador_publico: string;
  edicao_id: number;
  equipe_id: number;
  modalidade_id: number;
  status: StatusInscricao;
  submetida_em: string;
  avaliada_em: string | null;
  avaliada_por: number | null;
  motivo_rejeicao: string | null;
}

export interface Etapa {
  id: number;
  edicao_id: number;
  modalidade_id: number;
  nome: string;
  tipo: TipoEtapa;
  ordem: number;
  data_inicio: string;
  data_fim: string;
  status: StatusEtapa;
}

export interface Grupo {
  id: number;
  etapa_id: number;
  nome: string;
  ordem: number;
}

export interface EquipeGrupo {
  grupo_id: number;
  equipe_id: number;
}

export interface Disputa {
  id: number;
  etapa_id: number;
  grupo_id: number | null;
  codigo: string;
  rodada: number;
  ordem: number;
  arena: string;
  data_hora: string;
  status: StatusDisputa;
  equipe_a_id: number;
  equipe_b_id: number;
  vencedor_equipe_id: number | null;
  disputa_origem_a_id?: number | null;
  disputa_origem_b_id?: number | null;
}

export interface ResultadoDisputa {
  id: number;
  disputa_id: number;
  equipe_id: number;
  pontos: number;
  penalidades: number;
  pontos_finais: number;
  posicao: number | null;
  observacao: string;
  registrado_por: number;
  registrado_em: string;
}

export interface PontuacaoCriterio {
  id: number;
  resultado_disputa_id: number;
  criterio_pontuacao_id: number;
  valor: number;
  observacao: string;
}

export interface LinhaSnapshot {
  posicao: number;
  equipe_uuid: string | null;
  equipe: string;
  escola: string;
  pontos_finais: number;
  vitorias: number;
  saldo: number;
  empatado: boolean;
}

export interface SnapshotPublicacao {
  contrato: string;
  versao: number;
  edicao_uuid: string | null;
  etapa: {
    id: number;
    nome: string;
    tipo: TipoEtapa;
    modalidade: string;
    modalidade_slug: string;
  };
  gerado_em: string;
  classificacao: LinhaSnapshot[];
}

export interface Publicacao {
  id: number;
  edicao_id: number;
  etapa_id: number;
  modalidade_id: number;
  versao: number;
  status: StatusPublicacao;
  snapshot: SnapshotPublicacao | null;
  homologado_por: number | null;
  homologado_em: string | null;
  publicado_em: string | null;
  motivo_retificacao: string | null;
}

export interface LogAuditoria {
  id: number;
  tabela: string;
  registro_id: number;
  acao: string;
  campo: string | null;
  valor_anterior: unknown;
  valor_novo: unknown;
  user_id: number;
  user_nome: string;
  ip: string;
  origem: string;
  created_at: string;
}

export interface Database {
  usuarios: Usuario[];
  edicoes: Edicao[];
  modalidades: Modalidade[];
  criteriosPontuacao: CriterioPontuacao[];
  criteriosDesempate: CriterioDesempate[];
  regras: Regra[];
  escolas: Escola[];
  equipes: Equipe[];
  participantes: Participante[];
  inscricoes: Inscricao[];
  etapas: Etapa[];
  grupos: Grupo[];
  equipeGrupo: EquipeGrupo[];
  disputas: Disputa[];
  resultados: ResultadoDisputa[];
  pontuacoesCriterio: PontuacaoCriterio[];
  publicacoes: Publicacao[];
  logs: LogAuditoria[];
  usuarioAtualId: number | null;
}

export interface Resultado {
  ok: boolean;
  erro?: string;
  id?: number;
}

export interface LinhaClassificacao {
  equipe_id: number;
  equipe_nome: string;
  equipe_uuid: string | null;
  escola_nome: string;
  escola_rede: string;
  pontos: number;
  penalidades: number;
  pontos_finais: number;
  vitorias: number;
  saldo: number;
  tempo: number;
  partidas: number;
  posicao: number;
  empatado: boolean;
  desempateAplicado: string | null;
  modalidade_nome: string;
}
