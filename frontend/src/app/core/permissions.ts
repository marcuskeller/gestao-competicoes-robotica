import type { Perfil } from './models';

export const PERFIS: Record<Perfil, { rotulo: string; cor: string }> = {
  administrador: { rotulo: 'Administração', cor: 'primary' },
  organizador: { rotulo: 'Organização', cor: 'secondary' },
  mesario: { rotulo: 'Mesário de pista', cor: 'accent' },
  homologador: { rotulo: 'Homologação', cor: 'info' },
  voluntario: { rotulo: 'Voluntário', cor: 'accent' },
  participante: { rotulo: 'Participante', cor: 'info' },
  empresa: { rotulo: 'Empresa apoiadora', cor: 'secondary' },
};

const TODOS: Perfil[] = ['administrador', 'organizador', 'mesario', 'homologador'];

export const PERMISSOES_PADRAO_VOLUNTARIO: Partial<Record<Perfil, string[]>> = {
  organizador: ['voluntario.portal'],
  mesario: ['voluntario.portal', 'disputa.ver', 'resultados.ver', 'resultado.lancar'],
  homologador: ['voluntario.portal', 'publicacao.ver', 'homologar', 'publicar', 'retificar'],
  voluntario: ['voluntario.portal'],
};

export const PERMISSOES: Record<string, Perfil[]> = {
  'dashboard.interno': TODOS,
  'edicao.ver': ['administrador', 'organizador'],
  'modalidade.ver': ['administrador', 'organizador'],
  'regras.ver': ['administrador', 'organizador'],
  'escolas.ver': ['administrador', 'organizador'],
  'equipes.ver': ['administrador', 'organizador'],
  'inscricao.ver': ['administrador', 'organizador'],
  'etapa.ver': ['administrador', 'organizador'],
  'disputa.ver': ['administrador', 'organizador', 'mesario'],
  'resultados.ver': ['administrador', 'mesario'],
  'publicacao.ver': ['administrador', 'homologador'],
  'interop.ver': ['administrador', 'organizador'],
  'voluntario.portal': ['organizador', 'mesario', 'homologador', 'voluntario'],
  'edicao.criar': ['administrador'],
  'edicao.editar': ['administrador'],
  'edicao.status': ['administrador', 'organizador'],
  'edicao.excluir': ['administrador'],
  'modalidade.editar': ['administrador', 'organizador'],
  'criterio.editar': ['administrador', 'organizador'],
  'regra.publicar': ['administrador', 'organizador'],
  'escola.editar': ['administrador', 'organizador'],
  'equipe.editar': ['administrador', 'organizador'],
  'inscricao.avaliar': ['administrador', 'organizador'],
  'etapa.editar': ['administrador', 'organizador'],
  'chaveamento.gerar': ['administrador', 'organizador'],
  'disputa.editar': ['administrador', 'organizador'],
  'resultado.lancar': ['administrador', 'mesario'],
  homologar: ['administrador', 'homologador'],
  publicar: ['administrador', 'homologador'],
  retificar: ['administrador', 'homologador'],
  'auditoria.ver': ['administrador', 'homologador'],
  'usuarios.gerenciar': ['administrador'],
  'cargos.gerenciar': ['administrador'],
  'parceiros.portal': ['empresa'],
  'participante.portal': ['participante'],
  'classificacao.interna': TODOS,
};

export function pode(perfil: Perfil | undefined, acao: string): boolean {
  if (!perfil) return false;
  return (PERMISSOES[acao] ?? []).includes(perfil);
}

export const AVISO_SEM_PERMISSAO = 'Seu perfil não tem permissão para esta ação.';
