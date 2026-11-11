import { computed, effect, Injectable, signal } from '@angular/core';
import { montarSnapshot, pontosPorCriterios, publicacaoVigente } from './domain';
import type {
  CriterioPontuacao,
  Database,
  Disputa,
  Edicao,
  Etapa,
  Escola,
  Equipe,
  Inscricao,
  Resultado,
  StatusEdicao,
  StatusEtapa,
  StatusPublicacao,
  Usuario,
} from './models';
import { AVISO_SEM_PERMISSAO, pode } from './permissions';
import { criarEstadoInicial } from './seed';

const STORAGE_KEY = 'arena-robotica:db:v2';

interface DadosLog {
  tabela: string;
  registro_id: number;
  acao: string;
  campo?: string | null;
  anterior?: unknown;
  novo?: unknown;
}

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly _db = signal<Database>(this.carregar());
  readonly db = this._db.asReadonly();

  readonly usuario = computed<Usuario | null>(() => {
    const db = this._db();
    return db.usuarios.find((u) => u.id === db.usuarioAtualId) ?? null;
  });

  readonly perfil = computed(() => this.usuario()?.perfil);

  readonly edicaoAtiva = computed<Edicao | undefined>(() => {
    const db = this._db();
    return [...db.edicoes].sort((a, b) => b.ano - a.ano)[0];
  });

  constructor() {
    this._db.set(this.hidratarSnapshots(this._db()));
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._db()));
      } catch {
        /* armazenamento indisponível: segue em memória */
      }
    });
  }

  podeFazer(acao: string): boolean {
    return pode(this.perfil(), acao);
  }

  entrar(email: string): Resultado {
    const db = this._db();
    const usuario = db.usuarios.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!usuario) return { ok: false, erro: 'Usuário não encontrado. Use uma das contas de demonstração.' };
    if (!usuario.ativo) return { ok: false, erro: 'Usuário inativo não pode autenticar (RN-13.6).' };
    const proximo = { ...db, usuarioAtualId: usuario.id };
    this._db.set(this.comLog(proximo, { tabela: 'users', registro_id: usuario.id, acao: 'login', novo: usuario.email }));
    return { ok: true, id: usuario.id };
  }

  sair(): void {
    const db = this._db();
    const usuario = this.usuario();
    const proximo = { ...db, usuarioAtualId: null };
    this._db.set(
      usuario
        ? this.comLog(proximo, { tabela: 'users', registro_id: usuario.id, acao: 'logout', anterior: usuario.email, novo: null })
        : proximo,
    );
  }

  resetarDemo(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignora */
    }
    this._db.set(criarEstadoInicial());
  }

  criarEdicao(dados: { ano: number; numero: number; nome: string; tema: string; data_inicio: string; data_fim: string; local: string }): Resultado {
    if (!this.podeFazer('edicao.criar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    if (db.edicoes.some((e) => e.ano === Number(dados.ano))) {
      return { ok: false, erro: 'Já existe uma edição com este ano (RN-1.1).' };
    }
    if (dados.data_fim < dados.data_inicio) return { ok: false, erro: 'A data final deve ser maior ou igual à inicial (RN-1.5).' };
    const id = this.proximoId(db.edicoes);
    const nova: Edicao = {
      id,
      identificador_publico: crypto.randomUUID(),
      status: 'planejada',
      ...dados,
      ano: Number(dados.ano),
      numero: Number(dados.numero),
    };
    const proximo = { ...db, edicoes: [nova, ...db.edicoes] };
    this._db.set(this.comLog(proximo, { tabela: 'campeonato_edicoes', registro_id: id, acao: 'criacao', novo: `${nova.ano} — ${nova.nome}` }));
    return { ok: true, id };
  }

  atualizarEdicao(id: number, dados: Partial<Edicao>): Resultado {
    if (!this.podeFazer('edicao.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const edicao = db.edicoes.find((e) => e.id === id);
    if (!edicao) return { ok: false, erro: 'Edição não encontrada.' };
    if (db.edicoes.some((e) => e.id !== id && e.ano === Number(dados.ano))) {
      return { ok: false, erro: 'Já existe uma edição com este ano (RN-1.1).' };
    }
    const proximo = { ...db, edicoes: db.edicoes.map((e) => (e.id === id ? { ...e, ...dados } : e)) };
    this._db.set(this.comLog(proximo, { tabela: 'campeonato_edicoes', registro_id: id, acao: 'alteracao', campo: 'nome', anterior: edicao.nome, novo: dados.nome ?? edicao.nome }));
    return { ok: true, id };
  }

  mudarStatusEdicao(id: number, status: StatusEdicao): Resultado {
    if (!this.podeFazer('edicao.status')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const edicao = db.edicoes.find((e) => e.id === id);
    if (!edicao) return { ok: false, erro: 'Edição não encontrada.' };
    const fluxo: StatusEdicao[] = ['planejada', 'inscricoes', 'em_andamento', 'encerrada'];
    const atual = fluxo.indexOf(edicao.status);
    const alvo = fluxo.indexOf(status);
    if (atual === -1 || alvo !== atual + 1) return { ok: false, erro: 'Transição de status inválida (RN-1.2).' };
    const proximo = { ...db, edicoes: db.edicoes.map((e) => (e.id === id ? { ...e, status } : e)) };
    this._db.set(this.comLog(proximo, { tabela: 'campeonato_edicoes', registro_id: id, acao: 'alteracao', campo: 'status', anterior: edicao.status, novo: status }));
    return { ok: true, id };
  }

  excluirEdicao(id: number): Resultado {
    if (!this.podeFazer('edicao.excluir')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    if (db.modalidades.some((m) => m.edicao_id === id) || db.equipes.some((e) => e.edicao_id === id)) {
      return { ok: false, erro: 'Edição com modalidades ou equipes vinculadas não pode ser excluída (RN-1.6).' };
    }
    const proximo = { ...db, edicoes: db.edicoes.filter((e) => e.id !== id) };
    this._db.set(this.comLog(proximo, { tabela: 'campeonato_edicoes', registro_id: id, acao: 'exclusao', anterior: db.edicoes.find((e) => e.id === id)?.nome }));
    return { ok: true, id };
  }

  criarModalidade(dados: { edicao_id: number; nome: string; slug: string; descricao: string; tipo: 'individual' | 'dupla' | 'equipe'; min_integrantes: number; max_integrantes: number }): Resultado {
    if (!this.podeFazer('modalidade.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    if (db.modalidades.some((m) => m.edicao_id === dados.edicao_id && m.slug === dados.slug)) {
      return { ok: false, erro: 'Já existe modalidade com este slug na edição (RN-2.2).' };
    }
    if (Number(dados.min_integrantes) > Number(dados.max_integrantes) || Number(dados.min_integrantes) < 1) {
      return { ok: false, erro: 'Mínimo deve ser ≥ 1 e menor ou igual ao máximo (RN-2.3).' };
    }
    const id = this.proximoId(db.modalidades);
    const nova = {
      id,
      identificador_publico: crypto.randomUUID(),
      ordem: db.modalidades.length + 1,
      ativo: true,
      ...dados,
      min_integrantes: Number(dados.min_integrantes),
      max_integrantes: Number(dados.max_integrantes),
    };
    const proximo = { ...db, modalidades: [...db.modalidades, nova] };
    this._db.set(this.comLog(proximo, { tabela: 'modalidades', registro_id: id, acao: 'criacao', novo: nova.nome }));
    return { ok: true, id };
  }

  criarCriterioPontuacao(dados: { modalidade_id: number; nome: string; descricao: string; peso: number }): Resultado {
    if (!this.podeFazer('criterio.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    if (Number(dados.peso) <= 0) return { ok: false, erro: 'O peso deve ser maior que zero (RN-2.4).' };
    const id = this.proximoId(db.criteriosPontuacao);
    const criterio: CriterioPontuacao = {
      id,
      ordem: db.criteriosPontuacao.filter((c) => c.modalidade_id === dados.modalidade_id).length + 1,
      ativo: true,
      ...dados,
      peso: Number(dados.peso),
    };
    const proximo = { ...db, criteriosPontuacao: [...db.criteriosPontuacao, criterio] };
    this._db.set(this.comLog(proximo, { tabela: 'criterios_pontuacao', registro_id: id, acao: 'criacao', novo: criterio.nome }));
    return { ok: true, id };
  }

  excluirCriterioPontuacao(id: number): Resultado {
    if (!this.podeFazer('criterio.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const criterio = db.criteriosPontuacao.find((c) => c.id === id);
    if (!criterio) return { ok: false, erro: 'Critério não encontrado.' };
    const proximo = { ...db, criteriosPontuacao: db.criteriosPontuacao.filter((c) => c.id !== id) };
    this._db.set(this.comLog(proximo, { tabela: 'criterios_pontuacao', registro_id: id, acao: 'exclusao', anterior: criterio.nome }));
    return { ok: true, id };
  }

  criarCriterioDesempate(dados: { modalidade_id: number; nome: string; campo: 'pontos_finais' | 'penalidades' | 'vitorias' | 'saldo' | 'tempo'; direcao: 'asc' | 'desc' }): Resultado {
    if (!this.podeFazer('criterio.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const id = this.proximoId(db.criteriosDesempate);
    const criterio = {
      id,
      ...dados,
      ordem: db.criteriosDesempate.filter((c) => c.modalidade_id === dados.modalidade_id).length + 1,
    };
    const proximo = { ...db, criteriosDesempate: [...db.criteriosDesempate, criterio] };
    this._db.set(this.comLog(proximo, { tabela: 'criterios_desempate', registro_id: id, acao: 'criacao', novo: criterio.nome }));
    return { ok: true, id };
  }

  excluirCriterioDesempate(id: number): Resultado {
    if (!this.podeFazer('criterio.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const criterio = db.criteriosDesempate.find((c) => c.id === id);
    if (!criterio) return { ok: false, erro: 'Critério não encontrado.' };
    const restantes = db.criteriosDesempate
      .filter((c) => c.id !== id)
      .map((c) => (c.modalidade_id === criterio.modalidade_id ? c : c));
    const proximo = { ...db, criteriosDesempate: restantes };
    this._db.set(this.comLog(proximo, { tabela: 'criterios_desempate', registro_id: id, acao: 'exclusao', anterior: criterio.nome }));
    return { ok: true, id };
  }

  publicarRegra(dados: { edicao_id: number; modalidade_id: number | null; titulo: string; conteudo: string }): Resultado {
    if (!this.podeFazer('regra.publicar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const usuario = this.usuario();
    const anteriores = db.regras.filter(
      (r) =>
        r.edicao_id === dados.edicao_id &&
        r.modalidade_id === dados.modalidade_id &&
        r.status === 'publicada',
    );
    const ultima = db.regras
      .filter((r) => r.edicao_id === dados.edicao_id && r.modalidade_id === dados.modalidade_id)
      .sort((a, b) => b.versao - a.versao)[0];
    const id = this.proximoId(db.regras);
    const agora = new Date().toISOString();
    const nova = {
      id,
      ...dados,
      versao: (ultima?.versao ?? 0) + 1,
      status: 'publicada' as const,
      publicada_em: agora,
      publicada_por: usuario?.id ?? null,
      substitui_regra_id: anteriores[0]?.id ?? null,
    };
    const regras = [
      ...db.regras.map((r) => (anteriores.some((a) => a.id === r.id) ? { ...r, status: 'revogada' as const } : r)),
      nova,
    ];
    const proximo = { ...db, regras };
    this._db.set(this.comLog(proximo, { tabela: 'regras', registro_id: id, acao: 'publicacao', novo: `${nova.titulo} (v${nova.versao})` }));
    return { ok: true, id };
  }

  criarEscola(dados: { nome: string; rede: Escola['rede']; municipio: string; uf: string }): Resultado {
    if (!this.podeFazer('escola.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const id = this.proximoId(db.escolas);
    const escola: Escola = { id, identificador_publico: crypto.randomUUID(), ativo: true, ...dados };
    const proximo = { ...db, escolas: [...db.escolas, escola] };
    this._db.set(this.comLog(proximo, { tabela: 'escolas', registro_id: id, acao: 'criacao', novo: escola.nome }));
    return { ok: true, id };
  }

  criarEquipe(dados: { edicao_id: number; escola_id: number; nome: string }): Resultado {
    if (!this.podeFazer('equipe.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const id = this.proximoId(db.equipes);
    const equipe: Equipe = {
      id,
      identificador_publico: crypto.randomUUID(),
      status: 'inscrita',
      observacoes: '',
      ...dados,
    };
    const proximo = { ...db, equipes: [...db.equipes, equipe] };
    this._db.set(this.comLog(proximo, { tabela: 'equipes', registro_id: id, acao: 'criacao', novo: `${equipe.nome} (escola ${equipe.escola_id})` }));
    return { ok: true, id };
  }

  avaliarInscricao(id: number, status: Inscricao['status'], motivo?: string): Resultado {
    if (!this.podeFazer('inscricao.avaliar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const inscricao = db.inscricoes.find((i) => i.id === id);
    if (!inscricao) return { ok: false, erro: 'Inscrição não encontrada.' };
    if (status === 'rejeitada' && !motivo?.trim()) return { ok: false, erro: 'Rejeição exige motivo (RN-5.3).' };
    const equipe = db.equipes.find((e) => e.id === inscricao.equipe_id);
    if (status === 'aprovada' && ['desclassificada', 'desistente'].includes(equipe?.status ?? '')) {
      return { ok: false, erro: 'Equipe desclassificada/desistente não pode ser aprovada (RN-5.6).' };
    }
    const usuario = this.usuario();
    const agora = new Date().toISOString();
    const proximo = {
      ...db,
      inscricoes: db.inscricoes.map((i) =>
        i.id === id
          ? {
              ...i,
              status,
              avaliada_em: agora,
              avaliada_por: usuario?.id ?? null,
              motivo_rejeicao: status === 'rejeitada' ? (motivo ?? '').trim() : null,
            }
          : i,
      ),
    };
    this._db.set(this.comLog(proximo, { tabela: 'inscricoes', registro_id: id, acao: 'alteracao', campo: 'status', anterior: inscricao.status, novo: status }));
    return { ok: true, id };
  }

  criarEtapa(dados: { edicao_id: number; modalidade_id: number; nome: string; tipo: Etapa['tipo']; data_inicio: string; data_fim: string }): Resultado {
    if (!this.podeFazer('etapa.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const id = this.proximoId(db.etapas);
    const etapa: Etapa = {
      id,
      ...dados,
      ordem: db.etapas.filter((e) => e.modalidade_id === dados.modalidade_id).length + 1,
      status: 'planejada',
    };
    const proximo = { ...db, etapas: [...db.etapas, etapa] };
    this._db.set(this.comLog(proximo, { tabela: 'etapas', registro_id: id, acao: 'criacao', novo: etapa.nome }));
    return { ok: true, id };
  }

  gerarChaveamento(etapaId: number): Resultado {
    if (!this.podeFazer('chaveamento.gerar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const etapa = db.etapas.find((e) => e.id === etapaId);
    if (!etapa) return { ok: false, erro: 'Etapa não encontrada.' };
    if (db.disputas.some((d) => d.etapa_id === etapaId)) {
      return { ok: false, erro: 'Já existem disputas nesta etapa — geração idempotente bloqueada (RN-6.7).' };
    }
    const aprovadas = db.inscricoes
      .filter((i) => i.edicao_id === etapa.edicao_id && i.modalidade_id === etapa.modalidade_id && i.status === 'aprovada')
      .map((i) => i.equipe_id);
    if (aprovadas.length < 2) return { ok: false, erro: 'É necessário ao menos 2 inscrições aprovadas (RN-6.4).' };

    const gruposExistentes = db.grupos.filter((g) => g.etapa_id === etapaId);
    const grupos = gruposExistentes.length
      ? gruposExistentes
      : [
          { id: this.proximoId(db.grupos), etapa_id: etapaId, nome: 'Grupo A', ordem: 1 },
          { id: this.proximoId(db.grupos) + 1, etapa_id: etapaId, nome: 'Grupo B', ordem: 2 },
        ];

    const associacoes = aprovadas.map((equipeId, indice) => ({
      grupo_id: grupos[indice % grupos.length].id,
      equipe_id: equipeId,
    }));

    const disputas: Disputa[] = [];
    const baseId = this.proximoId(db.disputas);
    let sequencia = 0;
    grupos.forEach((grupo) => {
      const integrantes = associacoes.filter((a) => a.grupo_id === grupo.id).map((a) => a.equipe_id);
      for (let i = 0; i < integrantes.length; i += 1) {
        for (let j = i + 1; j < integrantes.length; j += 1) {
          sequencia += 1;
          disputas.push({
            id: baseId + sequencia - 1,
            etapa_id: etapaId,
            grupo_id: grupo.id,
            codigo: `${grupo.nome.replace(/\s/g, '')}-${sequencia}`,
            rodada: 1,
            ordem: sequencia,
            arena: 'A definir',
            data_hora: `${etapa.data_inicio}T10:00:00Z`,
            status: 'agendada',
            equipe_a_id: integrantes[i],
            equipe_b_id: integrantes[j],
            vencedor_equipe_id: null,
          });
        }
      }
    });

    const proximo = {
      ...db,
      grupos: gruposExistentes.length ? db.grupos : [...db.grupos, ...grupos],
      equipeGrupo: [...db.equipeGrupo.filter((eg) => !grupos.some((g) => g.id === eg.grupo_id)), ...associacoes],
      disputas: [...db.disputas, ...disputas],
    };
    this._db.set(this.comLog(proximo, { tabela: 'disputas', registro_id: etapaId, acao: 'criacao', novo: `${disputas.length} disputas geradas em ${etapa.nome}` }));
    return { ok: true, id: etapaId };
  }

  atualizarStatusDisputa(id: number, status: Disputa['status']): Resultado {
    if (!this.podeFazer('disputa.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const disputa = db.disputas.find((d) => d.id === id);
    if (!disputa) return { ok: false, erro: 'Disputa não encontrada.' };
    const etapa = db.etapas.find((e) => e.id === disputa.etapa_id);
    if (etapa && ['homologada', 'publicada'].includes(etapa.status)) {
      return { ok: false, erro: 'Etapa homologada/publicada não pode ser editada (RN-7.6).' };
    }
    const resultados = db.resultados.filter((r) => r.disputa_id === id);
    if (status === 'concluida' && resultados.length < 2) {
      return { ok: false, erro: 'Disputa concluída exige resultado para as duas equipes (RN-7.4).' };
    }
    let vencedor = disputa.vencedor_equipe_id;
    if (status === 'concluida') {
      const a = resultados.find((r) => r.equipe_id === disputa.equipe_a_id);
      const b = resultados.find((r) => r.equipe_id === disputa.equipe_b_id);
      if (a && b) vencedor = a.pontos_finais >= b.pontos_finais ? a.equipe_id : b.equipe_id;
    }
    if (status === 'wo' && !disputa.vencedor_equipe_id) {
      return { ok: false, erro: 'WO exige vencedor definido (RN-7.5).' };
    }
    const proximo = {
      ...db,
      disputas: db.disputas.map((d) => (d.id === id ? { ...d, status, vencedor_equipe_id: vencedor } : d)),
    };
    this._db.set(this.comLog(proximo, { tabela: 'disputas', registro_id: id, acao: 'alteracao', campo: 'status', anterior: disputa.status, novo: status }));
    return { ok: true, id };
  }

  lancarResultado(
    disputaId: number,
    equipeId: number,
    dados: { valores: Record<number, number>; penalidades: number; observacao?: string },
  ): Resultado {
    if (!this.podeFazer('resultado.lancar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const disputa = db.disputas.find((d) => d.id === disputaId);
    if (!disputa) return { ok: false, erro: 'Disputa não encontrada.' };
    const etapa = db.etapas.find((e) => e.id === disputa.etapa_id);
    if (etapa && ['homologada', 'publicada'].includes(etapa.status)) {
      return { ok: false, erro: 'Etapa publicada: correção exige retificação com motivo (RN-8.8).' };
    }
    if (![disputa.equipe_a_id, disputa.equipe_b_id].includes(equipeId)) {
      return { ok: false, erro: 'Equipe não pertence a esta disputa.' };
    }
    const penalidades = Number(dados.penalidades);
    if (Number.isNaN(penalidades) || penalidades < 0) return { ok: false, erro: 'Penalidades devem ser ≥ 0 (RN-8.3).' };
    const criterios = db.criteriosPontuacao.filter(
      (c) => etapa && c.modalidade_id === etapa.modalidade_id && c.ativo,
    );
    const pontos = pontosPorCriterios(criterios, dados.valores);
    const usuario = this.usuario();
    const agora = new Date().toISOString();
    const existente = db.resultados.find((r) => r.disputa_id === disputaId && r.equipe_id === equipeId);
    let resultadoId = existente?.id ?? this.proximoId(db.resultados);

    const resultados = existente
      ? db.resultados.map((r) =>
          r.id === existente.id
            ? { ...r, pontos, penalidades, pontos_finais: pontos - penalidades, observacao: dados.observacao ?? '', registrado_por: usuario?.id ?? r.registrado_por, registrado_em: agora }
            : r,
        )
      : [
          ...db.resultados,
          {
            id: resultadoId,
            disputa_id: disputaId,
            equipe_id: equipeId,
            pontos,
            penalidades,
            pontos_finais: pontos - penalidades,
            posicao: null,
            observacao: dados.observacao ?? '',
            registrado_por: usuario?.id ?? 0,
            registrado_em: agora,
          },
        ];

    const pontuacoesSemAntigas = db.pontuacoesCriterio.filter((p) => p.resultado_disputa_id !== resultadoId);
    let proximaPontuacao = this.proximoId(db.pontuacoesCriterio);
    const novasPontuacoes = criterios.map((criterio) => ({
      id: proximaPontuacao++,
      resultado_disputa_id: resultadoId,
      criterio_pontuacao_id: criterio.id,
      valor: Number(dados.valores[criterio.id]) || 0,
      observacao: '',
    }));

    const proximo = {
      ...db,
      resultados,
      pontuacoesCriterio: [...pontuacoesSemAntigas, ...novasPontuacoes],
      disputas: db.disputas.map((d) => (d.id === disputaId && d.status === 'agendada' ? { ...d, status: 'em_andamento' as const } : d)),
    };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'resultados_disputa',
        registro_id: resultadoId,
        acao: existente ? 'alteracao' : 'criacao',
        campo: 'pontos_finais',
        anterior: existente?.pontos_finais ?? null,
        novo: pontos - penalidades,
      }),
    );
    return { ok: true, id: resultadoId };
  }

  homologarEtapa(etapaId: number): Resultado {
    if (!this.podeFazer('homologar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const etapa = db.etapas.find((e) => e.id === etapaId);
    if (!etapa) return { ok: false, erro: 'Etapa não encontrada.' };
    const pendentes = db.disputas.filter(
      (d) => d.etapa_id === etapaId && !['concluida', 'cancelada', 'wo'].includes(d.status),
    );
    if (pendentes.length) {
      return { ok: false, erro: `Existem ${pendentes.length} disputa(s) pendente(s): ${pendentes.map((d) => d.codigo).join(', ')} (RN-10.2).` };
    }
    const usuario = this.usuario();
    const proximo = {
      ...db,
      etapas: db.etapas.map((e) => (e.id === etapaId ? { ...e, status: 'homologada' as StatusEtapa } : e)),
    };
    this._db.set(this.comLog(proximo, { tabela: 'etapas', registro_id: etapaId, acao: 'homologacao', campo: 'status', anterior: etapa.status, novo: `homologada por ${usuario?.nome ?? ''}` }));
    return { ok: true, id: etapaId };
  }

  publicarEtapa(etapaId: number): Resultado {
    if (!this.podeFazer('publicar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const etapa = db.etapas.find((e) => e.id === etapaId);
    if (!etapa) return { ok: false, erro: 'Etapa não encontrada.' };
    if (etapa.status === 'publicada') return { ok: false, erro: 'Etapa já publicada — use retificação (RN-10.6).' };
    if (etapa.status !== 'homologada') return { ok: false, erro: 'Publicar exige homologação prévia (RN-10.5).' };
    const pendentes = db.disputas.filter((d) => d.etapa_id === etapaId && !['concluida', 'cancelada', 'wo'].includes(d.status));
    if (pendentes.length) return { ok: false, erro: 'Todas as disputas precisam estar concluídas (RN-10.2).' };

    const usuario = this.usuario();
    const versao = (publicacaoVigente(db, etapaId)?.versao ?? 0) + 1;
    const snapshot = montarSnapshot(db, etapaId, versao);
    const id = this.proximoId(db.publicacoes);
    const agora = new Date().toISOString();
    const publicacao = {
      id,
      edicao_id: etapa.edicao_id,
      etapa_id: etapaId,
      modalidade_id: etapa.modalidade_id,
      versao,
      status: 'publicada' as StatusPublicacao,
      snapshot,
      homologado_por: usuario?.id ?? null,
      homologado_em: agora,
      publicado_em: agora,
      motivo_retificacao: null,
    };
    const proximo = {
      ...db,
      publicacoes: [...db.publicacoes, publicacao],
      etapas: db.etapas.map((e) => (e.id === etapaId ? { ...e, status: 'publicada' as StatusEtapa } : e)),
    };
    this._db.set(this.comLog(proximo, { tabela: 'publicacoes_resultado', registro_id: id, acao: 'publicacao', campo: 'versao', anterior: versao - 1, novo: versao }));
    return { ok: true, id };
  }

  retificarPublicacao(publicacaoId: number, motivo: string): Resultado {
    if (!this.podeFazer('retificar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    if (!motivo?.trim()) return { ok: false, erro: 'Retificação exige motivo (RN-10.6).' };
    const db = this._db();
    const publicacao = db.publicacoes.find((p) => p.id === publicacaoId);
    if (!publicacao) return { ok: false, erro: 'Publicação não encontrada.' };
    if (publicacao.status !== 'publicada') return { ok: false, erro: 'Apenas a versão publicada pode ser retificada.' };
    const usuario = this.usuario();
    const versao = publicacao.versao + 1;
    const snapshot = montarSnapshot(db, publicacao.etapa_id, versao);
    const id = this.proximoId(db.publicacoes);
    const agora = new Date().toISOString();
    const nova = {
      ...publicacao,
      id,
      versao,
      status: 'publicada' as StatusPublicacao,
      snapshot,
      homologado_por: usuario?.id ?? null,
      homologado_em: agora,
      publicado_em: agora,
      motivo_retificacao: motivo.trim(),
    };
    const proximo = {
      ...db,
      publicacoes: [
        ...db.publicacoes.map((p) => (p.id === publicacaoId ? { ...p, status: 'retificada' as StatusPublicacao } : p)),
        nova,
      ],
    };
    this._db.set(this.comLog(proximo, { tabela: 'publicacoes_resultado', registro_id: id, acao: 'retificacao', campo: 'versao', anterior: publicacao.versao, novo: versao }));
    return { ok: true, id };
  }

  private comLog(db: Database, dados: DadosLog): Database {
    const usuario = db.usuarios.find((u) => u.id === db.usuarioAtualId);
    const log = {
      id: this.proximoId(db.logs),
      tabela: dados.tabela,
      registro_id: dados.registro_id,
      acao: dados.acao,
      campo: dados.campo ?? null,
      valor_anterior: dados.anterior ?? null,
      valor_novo: dados.novo ?? null,
      user_id: usuario?.id ?? 0,
      user_nome: usuario?.nome ?? 'Sistema',
      ip: usuario ? `10.0.0.${10 + usuario.id}` : '127.0.0.1',
      origem: 'web',
      created_at: new Date().toISOString(),
    };
    return { ...db, logs: [...db.logs, log] };
  }

  private hidratarSnapshots(db: Database): Database {
    const publicacoes = db.publicacoes.map((p) =>
      p.snapshot ? p : { ...p, snapshot: montarSnapshot(db, p.etapa_id, p.versao) },
    );
    return { ...db, publicacoes };
  }

  private proximoId(itens: { id: number }[]): number {
    return itens.reduce((maior, item) => Math.max(maior, item.id), 0) + 1;
  }

  private carregar(): Database {
    try {
      const bruto = localStorage.getItem(STORAGE_KEY);
      if (bruto) {
        const salvo = JSON.parse(bruto) as Database;
        if (salvo?.edicoes?.length) return salvo;
      }
    } catch {
      /* estado corrompido: recria */
    }
    return criarEstadoInicial();
  }
}
