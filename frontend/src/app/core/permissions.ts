import type { Perfil } from './models';

export const PERFIS: Record<Perfil, { rotulo: string; cor: string }> = {
  administrador: { rotulo: 'Administração', cor: 'primary' },
  organizador: { rotulo: 'Organização', cor: 'secondary' },
  mesario: { rotulo: 'Mesário de pista', cor: 'accent' },
  homologador: { rotulo: 'Homologação', cor: 'info' },
};

const TODOS: Perfil[] = ['administrador', 'organizador', 'mesario', 'homologador'];

export const PERMISSOES: Record<string, Perfil[]> = {
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
  'classificacao.interna': TODOS,
};

export function pode(perfil: Perfil | undefined, acao: string): boolean {
  if (!perfil) return false;
  return (PERMISSOES[acao] ?? []).includes(perfil);
}

export const AVISO_SEM_PERMISSAO = 'Seu perfil não tem permissão para esta ação.';
