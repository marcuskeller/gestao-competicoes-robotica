import { computed, effect, Injectable, signal } from '@angular/core';
import { cnpjValido, cpfValido, montarSnapshot, pontosPorCriterios, publicacaoVigente } from './domain';
import type {
  CriterioPontuacao,
  CriterioDesempate,
  Database,
  Disputa,
  Edicao,
  Etapa,
  Escola,
  Equipe,
  Inscricao,
  Modalidade,
  Parceria,
  Perfil,
  Participante,
  Resultado,
  StatusEdicao,
  StatusEtapa,
  StatusPublicacao,
  TipoConta,
  Usuario,
} from './models';
import { AVISO_SEM_PERMISSAO, PERMISSOES_PADRAO_VOLUNTARIO, pode } from './permissions';
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
    const usuario = this.usuario();
    if (!usuario) return false;
    if (acao === 'voluntario.portal') return usuario.tipo_conta === 'voluntario';
    if (usuario.tipo_conta === 'voluntario') {
      if (usuario.permissoes !== undefined) return usuario.permissoes.includes(acao);
      return PERMISSOES_PADRAO_VOLUNTARIO[usuario.perfil]?.includes(acao) ?? false;
    }
    if (usuario.perfil === 'administrador') return true;
    if (usuario.permissoes !== undefined) return usuario.permissoes.includes(acao);
    return pode(usuario.perfil, acao);
  }

  entrar(email: string): Resultado {
    const db = this._db();
    const usuario = db.usuarios.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!usuario)
      return { ok: false, erro: 'Usuário não encontrado. Use uma das contas de demonstração.' };
    if (!usuario.ativo)
      return { ok: false, erro: 'Usuário inativo não pode autenticar (RN-13.6).' };
    const proximo = { ...db, usuarioAtualId: usuario.id };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'users',
        registro_id: usuario.id,
        acao: 'login',
        novo: usuario.email,
      }),
    );
    return { ok: true, id: usuario.id };
  }

  cadastrarContaDemo(dados: {
    nome: string;
    email: string;
    tipo_conta: TipoConta;
    cpf?: string;
    organizacao?: string;
    telefone?: string;
    disponibilidade?: string;
    cargo_voluntario_id?: number;
    tipo_participante?: 'pessoa_fisica' | 'escola';
    nome_escola?: string;
    serie?: string;
    responsavel?: string;
    telefone_responsavel?: string;
    modalidade_id?: number;
    equipe_nome?: string;
    nome_equipe?: string;
    alunos?: { nome: string; serie: string }[];
    cnpj?: string;
    valor_proposto?: number;
    mensagem?: string;
  }): Resultado {
    const nome = dados.nome.trim();
    const email = dados.email.trim().toLowerCase();
    const organizacao = dados.organizacao?.trim() ?? '';
    const telefone = dados.telefone?.trim() ?? '';
    const cpf = dados.cpf?.replace(/\D/g, '') ?? '';
    const cnpj = dados.cnpj?.replace(/\D/g, '') ?? '';

    if (!nome) return { ok: false, erro: 'Informe seu nome.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, erro: 'Informe um e-mail válido.' };
    }

    const db = this._db();
    if (db.usuarios.some((usuario) => usuario.email.toLowerCase() === email)) {
      return { ok: false, erro: 'Já existe uma conta com este e-mail neste navegador.' };
    }

    let perfil: Perfil;
    if (dados.tipo_conta === 'administrador') perfil = 'administrador';
    else if (dados.tipo_conta === 'voluntario') {
      if (!cpfValido(cpf)) return { ok: false, erro: 'Informe um CPF válido para o voluntário.' };
      if ((db.inscricoesVoluntarios ?? []).some((inscricao) => inscricao.cpf === cpf)) {
        return { ok: false, erro: 'Já existe uma inscrição voluntária com este CPF.' };
      }
      const cargo = db.cargosVoluntarios?.find(
        (item) => item.id === Number(dados.cargo_voluntario_id) && item.ativo,
      );
      if (!cargo) return { ok: false, erro: 'Selecione um cargo voluntário disponível.' };
      const ocupadas = (db.inscricoesVoluntarios ?? []).filter(
        (inscricao) =>
          inscricao.cargo_id === cargo.id && inscricao.status !== 'rejeitada',
      ).length;
      if (ocupadas >= cargo.vagas_total) return { ok: false, erro: 'As vagas deste cargo foram preenchidas.' };
      if (!telefone || !dados.disponibilidade?.trim()) {
        return { ok: false, erro: 'Informe telefone e disponibilidade para atuar.' };
      }
      perfil = 'voluntario';
    } else if (dados.tipo_conta === 'participante') {
      if (!telefone) return { ok: false, erro: 'Informe um telefone de contato.' };
      if (dados.tipo_participante === 'escola' && (!organizacao || !cnpjValido(cnpj))) {
        return { ok: false, erro: 'Informe o nome e um CNPJ válido da escola.' };
      }
      perfil = 'participante';
    } else {
      if (!organizacao || !telefone) {
        return { ok: false, erro: 'Informe empresa e telefone de contato.' };
      }
      if (!cnpjValido(cnpj)) {
        return { ok: false, erro: 'Informe um CNPJ válido.' };
      }
      perfil = 'empresa';
    }

    if (dados.tipo_conta === 'empresa' || (dados.tipo_conta === 'participante' && dados.tipo_participante === 'escola')) {
      const documentoDuplicado = db.usuarios.some((item) => item.cnpj === cnpj) ||
        (db.parcerias ?? []).some((item) => item.cnpj === cnpj) ||
        (db.cadastrosParticipantes ?? []).some((item) => item.tipo === 'escola' && item.cnpj === cnpj);
      if (documentoDuplicado) return { ok: false, erro: 'Já existe um cadastro com este CNPJ.' };
    }

    const usuario: Usuario = {
      id: this.proximoId(db.usuarios),
      nome,
      email,
      perfil,
      tipo_conta: dados.tipo_conta,
      ...(dados.tipo_conta === 'participante'
        ? { tipo_participante: dados.tipo_participante ?? 'pessoa_fisica' }
        : {}),
      ...(organizacao ? { organizacao } : {}),
      ...(cnpj ? { cnpj } : {}),
      ...(telefone ? { telefone } : {}),
      ativo: true,
    };
    const usuario_id = usuario.id;
    let proximo = {
      ...db,
      usuarios: [...db.usuarios, usuario],
      usuarioAtualId: usuario.id,
    };
    if (dados.tipo_conta === 'voluntario') {
      proximo = {
        ...proximo,
        inscricoesVoluntarios: [
          ...(db.inscricoesVoluntarios ?? []),
          {
            id: this.proximoId(db.inscricoesVoluntarios ?? []),
            usuario_id,
            cargo_id: Number(dados.cargo_voluntario_id),
            cpf,
            telefone,
            disponibilidade: dados.disponibilidade!.trim(),
            status: 'pendente' as const,
          },
        ],
      };
    }
    this._db.set(
      this.comLog(proximo, {
        tabela: 'users',
        registro_id: usuario.id,
        acao: 'cadastro_demo',
        novo: { email, tipo_conta: dados.tipo_conta, perfil, organizacao: organizacao || null },
      }),
    );
    return { ok: true, id: usuario.id };
  }

  atualizarMinhaConta(dados: {
    nome: string;
    email: string;
    telefone: string;
    organizacao?: string;
    cnpj?: string;
    cpf?: string;
  }): Resultado {
    const usuario = this.usuario();
    if (!usuario) return { ok: false, erro: AVISO_SEM_PERMISSAO };

    const db = this._db();
    const nome = dados.nome.trim();
    const email = dados.email.trim().toLowerCase();
    const telefone = dados.telefone.trim();
    const organizacao = dados.organizacao?.trim() ?? '';
    const cnpj = dados.cnpj?.replace(/\D/g, '') ?? '';
    const cpf = dados.cpf?.replace(/\D/g, '') ?? '';
    const contaInstitucional = usuario.tipo_conta === 'empresa' ||
      (usuario.tipo_conta === 'participante' && usuario.tipo_participante === 'escola');
    const inscricaoVoluntario = db.inscricoesVoluntarios.find((item) => item.usuario_id === usuario.id);

    if (!nome) return { ok: false, erro: 'Informe seu nome.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, erro: 'Informe um e-mail válido.' };
    }
    if (db.usuarios.some((item) => item.id !== usuario.id && item.email.toLowerCase() === email)) {
      return { ok: false, erro: 'Este e-mail já está em uso por outra conta.' };
    }
    if (usuario.tipo_conta !== 'administrador' && !telefone) {
      return { ok: false, erro: 'Informe um telefone de contato.' };
    }
    if (contaInstitucional && (!organizacao || !cnpjValido(cnpj))) {
      return { ok: false, erro: 'Informe o nome da organização e um CNPJ válido.' };
    }
    if (contaInstitucional && db.usuarios.some((item) => item.id !== usuario.id && item.cnpj === cnpj)) {
      return { ok: false, erro: 'Este CNPJ já está associado a outra conta.' };
    }
    if (cpf && !cpfValido(cpf)) return { ok: false, erro: 'Informe um CPF válido.' };
    if (cpf && db.inscricoesVoluntarios.some((item) => item.usuario_id !== usuario.id && item.cpf === cpf)) {
      return { ok: false, erro: 'Este CPF já está associado a outra inscrição voluntária.' };
    }

    const atualizado: Usuario = {
      ...usuario,
      nome,
      email,
      telefone,
      ...(contaInstitucional ? { organizacao, cnpj } : {}),
    };
    const proximo: Database = {
      ...db,
      usuarios: db.usuarios.map((item) => item.id === usuario.id ? atualizado : item),
      inscricoesVoluntarios: inscricaoVoluntario
        ? db.inscricoesVoluntarios.map((item) => item.usuario_id === usuario.id
          ? { ...item, telefone, ...(cpf ? { cpf } : {}) }
          : item)
        : db.inscricoesVoluntarios,
      parcerias: db.parcerias.map((item) => item.usuario_id === usuario.id
        ? { ...item, telefone, ...(contaInstitucional ? { cnpj } : {}) }
        : item),
      cadastrosParticipantes: db.cadastrosParticipantes.map((item) => {
        if (item.usuario_id !== usuario.id || item.tipo !== 'escola') return item;
        return { ...item, nome_escola: organizacao, cnpj, telefone };
      }),
    };
    this._db.set(this.comLog(proximo, {
      tabela: 'users',
      registro_id: usuario.id,
      acao: 'dados_pessoais_atualizados',
      anterior: { nome: usuario.nome, email: usuario.email, telefone: usuario.telefone, organizacao: usuario.organizacao, cnpj: usuario.cnpj },
      novo: { nome, email, telefone, ...(contaInstitucional ? { organizacao, cnpj } : {}), ...(cpf ? { cpf } : {}) },
    }));
    return { ok: true, id: usuario.id };
  }

  atualizarPermissoesUsuario(usuarioId: number, permissoes: string[]): Resultado {
    if (!this.podeFazer('usuarios.gerenciar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const usuario = db.usuarios.find((item) => item.id === usuarioId);
    if (!usuario || usuario.perfil === 'administrador') {
      return { ok: false, erro: 'Não é possível alterar este perfil.' };
    }
    const lista = [...new Set(permissoes)];
    const proximo = {
      ...db,
      usuarios: db.usuarios.map((item) => item.id === usuarioId ? { ...item, permissoes: lista } : item),
    };
    this._db.set(this.comLog(proximo, {
      tabela: 'users', registro_id: usuarioId, acao: 'permissoes_atualizadas',
      anterior: usuario.permissoes ?? null, novo: lista,
    }));
    return { ok: true, id: usuarioId };
  }

  criarCargoVoluntario(dados: { nome: string; descricao: string; vagas_total: number }): Resultado {
    if (!this.podeFazer('cargos.gerenciar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const nome = dados.nome.trim();
    const vagas = Number(dados.vagas_total);
    if (!nome || !Number.isInteger(vagas) || vagas < 1) {
      return { ok: false, erro: 'Informe o cargo e pelo menos uma vaga.' };
    }
    const db = this._db();
    if (db.cargosVoluntarios.some((cargo) => cargo.nome.toLowerCase() === nome.toLowerCase())) {
      return { ok: false, erro: 'Este cargo já existe.' };
    }
    const cargo = { id: this.proximoId(db.cargosVoluntarios), nome, descricao: dados.descricao.trim(), vagas_total: vagas, ativo: true };
    const proximo = { ...db, cargosVoluntarios: [...db.cargosVoluntarios, cargo] };
    this._db.set(this.comLog(proximo, {
      tabela: 'cargos_voluntarios', registro_id: cargo.id, acao: 'criacao', novo: cargo,
    }));
    return { ok: true, id: cargo.id };
  }

  atualizarVagasCargoVoluntario(id: number, vagasTotal: number): Resultado {
    if (!this.podeFazer('cargos.gerenciar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const cargo = db.cargosVoluntarios.find((item) => item.id === id);
    const vagas = Number(vagasTotal);
    if (!cargo || !Number.isInteger(vagas) || vagas < 1) {
      return { ok: false, erro: 'Informe uma quantidade de vagas válida.' };
    }
    const ocupadas = db.inscricoesVoluntarios.filter(
      (inscricao) => inscricao.cargo_id === id && inscricao.status !== 'rejeitada',
    ).length;
    if (vagas < ocupadas) {
      return { ok: false, erro: `Não é possível reduzir abaixo das ${ocupadas} vagas ocupadas.` };
    }
    const proximo = {
      ...db,
      cargosVoluntarios: db.cargosVoluntarios.map((item) => item.id === id ? { ...item, vagas_total: vagas } : item),
    };
    this._db.set(this.comLog(proximo, {
      tabela: 'cargos_voluntarios', registro_id: id, acao: 'atualizacao',
      campo: 'vagas_total', anterior: cargo.vagas_total, novo: vagas,
    }));
    return { ok: true, id };
  }

  avaliarInscricaoVoluntario(id: number, status: 'aprovada' | 'rejeitada'): Resultado {
    if (!this.podeFazer('usuarios.gerenciar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const inscricao = db.inscricoesVoluntarios.find((item) => item.id === id);
    if (!inscricao) return { ok: false, erro: 'Inscrição voluntária não encontrada.' };
    if (status === 'aprovada') {
      const cargo = db.cargosVoluntarios.find((item) => item.id === inscricao.cargo_id);
      const ocupadas = db.inscricoesVoluntarios.filter(
        (item) => item.cargo_id === inscricao.cargo_id && item.status !== 'rejeitada',
      ).length;
      if (cargo && ocupadas > cargo.vagas_total) return { ok: false, erro: 'Não há mais vagas para este cargo.' };
    }
    const proximo = {
      ...db,
      inscricoesVoluntarios: db.inscricoesVoluntarios.map((item) => item.id === id ? { ...item, status } : item),
    };
    this._db.set(this.comLog(proximo, {
      tabela: 'inscricoes_voluntarios', registro_id: id, acao: 'avaliacao',
      campo: 'status', anterior: inscricao.status, novo: status,
    }));
    return { ok: true, id };
  }

  avaliarCadastroParticipante(id: number, status: 'aprovada' | 'rejeitada'): Resultado {
    if (!this.podeFazer('usuarios.gerenciar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const cadastro = db.cadastrosParticipantes.find((item) => item.id === id);
    if (!cadastro) return { ok: false, erro: 'Inscrição de participante não encontrada.' };
    const proximo = {
      ...db,
      cadastrosParticipantes: db.cadastrosParticipantes.map((item) => item.id === id ? { ...item, status } : item),
    };
    this._db.set(this.comLog(proximo, {
      tabela: 'cadastros_participantes', registro_id: id, acao: 'avaliacao',
      campo: 'status', anterior: cadastro.status, novo: status,
    }));
    return { ok: true, id };
  }

  criarPropostaApoio(dados: {
    tipo_apoio: NonNullable<Parceria['tipo_apoio']>;
    descricao_doacao: string;
    valor_proposto?: number;
  }): Resultado {
    const usuario = this.usuario();
    if (!usuario || usuario.tipo_conta !== 'empresa') {
      return { ok: false, erro: AVISO_SEM_PERMISSAO };
    }
    const descricao = dados.descricao_doacao.trim();
    const valor = Number(dados.valor_proposto ?? 0);
    if (!descricao) return { ok: false, erro: 'Descreva o que a empresa pretende doar.' };
    if (dados.tipo_apoio === 'financeiro' && (!Number.isFinite(valor) || valor <= 0)) {
      return { ok: false, erro: 'Informe o valor do apoio financeiro.' };
    }
    const db = this._db();
    const proposta: Parceria = {
      id: this.proximoId(db.parcerias),
      usuario_id: usuario.id,
      cnpj: usuario.cnpj ?? '',
      telefone: usuario.telefone ?? '',
      tipo_apoio: dados.tipo_apoio,
      descricao_doacao: descricao,
      valor_proposto: dados.tipo_apoio === 'financeiro' ? valor : 0,
      mensagem: descricao,
      status: 'em_analise',
    };
    this._db.set(this.comLog(
      { ...db, parcerias: [...db.parcerias, proposta] },
      { tabela: 'parcerias', registro_id: proposta.id, acao: 'proposta_apoio', novo: proposta },
    ));
    return { ok: true, id: proposta.id };
  }

  registrarContribuicaoDemo(dados: {
    descricao_doacao: string;
    valor_proposto: number;
    metodo_pagamento: NonNullable<Parceria['metodo_pagamento']>;
  }): Resultado {
    const usuario = this.usuario();
    if (!usuario || usuario.tipo_conta !== 'empresa') {
      return { ok: false, erro: AVISO_SEM_PERMISSAO };
    }
    const descricao = dados.descricao_doacao.trim() || 'Contribuição financeira para o campeonato.';
    const valor = Number(dados.valor_proposto);
    if (!Number.isFinite(valor) || valor <= 0) {
      return { ok: false, erro: 'Informe um valor válido para a contribuição.' };
    }

    const db = this._db();
    const contribuicao: Parceria = {
      id: this.proximoId(db.parcerias),
      usuario_id: usuario.id,
      cnpj: usuario.cnpj ?? '',
      telefone: usuario.telefone ?? '',
      tipo_apoio: 'financeiro',
      descricao_doacao: descricao,
      valor_proposto: valor,
      metodo_pagamento: dados.metodo_pagamento,
      mensagem: descricao,
      status: 'contribuicao_demo',
    };
    this._db.set(this.comLog(
      { ...db, parcerias: [...db.parcerias, contribuicao] },
      { tabela: 'parcerias', registro_id: contribuicao.id, acao: 'contribuicao_financeira_simulada', novo: contribuicao },
    ));
    return { ok: true, id: contribuicao.id };
  }

  avaliarParceria(id: number, status: 'aprovada' | 'recusada'): Resultado {
    if (!this.podeFazer('usuarios.gerenciar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const parceria = db.parcerias.find((item) => item.id === id);
    if (!parceria) return { ok: false, erro: 'Proposta de parceria não encontrada.' };
    if (parceria.tipo_apoio === 'financeiro' || (!parceria.tipo_apoio && parceria.valor_proposto > 0)) {
      return { ok: false, erro: 'Contribuições financeiras são registradas diretamente e não precisam de aprovação.' };
    }
    const proximo = {
      ...db,
      parcerias: db.parcerias.map((item) => item.id === id ? { ...item, status } : item),
    };
    this._db.set(this.comLog(proximo, {
      tabela: 'parcerias', registro_id: id, acao: 'avaliacao',
      campo: 'status', anterior: parceria.status, novo: status,
    }));
    return { ok: true, id };
  }

  sair(): void {
    const db = this._db();
    const usuario = this.usuario();
    const proximo = { ...db, usuarioAtualId: null };
    this._db.set(
      usuario
        ? this.comLog(proximo, {
            tabela: 'users',
            registro_id: usuario.id,
            acao: 'logout',
            anterior: usuario.email,
            novo: null,
          })
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

  criarEdicao(dados: {
    ano: number;
    numero: number;
    nome: string;
    tema: string;
    data_inicio: string;
    data_fim: string;
    local: string;
  }): Resultado {
    if (!this.podeFazer('edicao.criar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    if (db.edicoes.some((e) => e.ano === Number(dados.ano))) {
      return { ok: false, erro: 'Já existe uma edição com este ano (RN-1.1).' };
    }
    if (dados.data_fim < dados.data_inicio)
      return { ok: false, erro: 'A data final deve ser maior ou igual à inicial (RN-1.5).' };
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
    this._db.set(
      this.comLog(proximo, {
        tabela: 'campeonato_edicoes',
        registro_id: id,
        acao: 'criacao',
        novo: `${nova.ano} — ${nova.nome}`,
      }),
    );
    return { ok: true, id };
  }

  atualizarEdicao(id: number, dados: Partial<Edicao>): Resultado {
    if (!this.podeFazer('edicao.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const edicao = db.edicoes.find((e) => e.id === id);
    const statusValidos: StatusEdicao[] = ['planejada', 'inscricoes', 'em_andamento', 'encerrada', 'cancelada'];
    if (dados.status && !statusValidos.includes(dados.status)) {
      return { ok: false, erro: 'Status inv\u00e1lido para a edi\u00e7\u00e3o.' };
    }
    if (!edicao) return { ok: false, erro: 'Edição não encontrada.' };
    if (db.edicoes.some((e) => e.id !== id && e.ano === Number(dados.ano))) {
      return { ok: false, erro: 'Já existe uma edição com este ano (RN-1.1).' };
    }
    const atualizada = { ...edicao, ...dados };
    const proximo = {
      ...db,
      edicoes: db.edicoes.map((e) => (e.id === id ? atualizada : e)),
    };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'campeonato_edicoes',
        registro_id: id,
        acao: 'alteracao',
        anterior: edicao,
        novo: atualizada,
      }),
    );
    return { ok: true, id };
  }

  atualizarRegistroDemo(modulo: string, id: number, campos: Record<string, string>): Resultado {
    const numero = (chave: string) => Number(campos[chave]);
    const texto = (chave: string) => (campos[chave] ?? '').trim();
    switch (modulo) {
      case 'edicoes':
        return this.atualizarEdicao(id, {
          nome: texto('nome'),
          ano: numero('ano'),
          numero: numero('numero'),
          tema: texto('tema'),
          local: texto('local'),
          data_inicio: campos['data_inicio'],
          data_fim: campos['data_fim'],
          ...(campos['status'] ? { status: campos['status'] as StatusEdicao } : {}),
        });
      case 'modalidades': {
        if (!this.podeFazer('modalidade.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
        const db = this._db();
        const atual = db.modalidades.find((item) => item.id === id);
        if (!atual) return { ok: false, erro: 'Modalidade não encontrada.' };
        const dados = {
          edicao_id: numero('edicao_id'),
          nome: texto('nome'),
          slug: texto('slug'),
          descricao: texto('descricao'),
          tipo: campos['tipo'] as Modalidade['tipo'],
          min_integrantes: numero('min_integrantes'),
          max_integrantes: numero('max_integrantes'),
        };
        if (dados.min_integrantes < 1 || dados.min_integrantes > dados.max_integrantes) {
          return { ok: false, erro: 'O mínimo de integrantes deve ser positivo e não pode superar o máximo.' };
        }
        if (db.modalidades.some((item) => item.id !== id && item.edicao_id === dados.edicao_id && item.slug === dados.slug)) {
          return { ok: false, erro: 'Já existe modalidade com este identificador nesta edição.' };
        }
        const proximo = { ...db, modalidades: db.modalidades.map((item) => item.id === id ? { ...item, ...dados } : item) };
        this._db.set(this.comLog(proximo, { tabela: 'modalidades', registro_id: id, acao: 'alteracao', anterior: atual, novo: { ...atual, ...dados } }));
        return { ok: true, id };
      }
      case 'criterios': {
        if (!this.podeFazer('criterio.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
        const db = this._db();
        const atual = db.criteriosPontuacao.find((item) => item.id === id);
        if (!atual) return { ok: false, erro: 'Critério não encontrado.' };
        const dados = { modalidade_id: numero('modalidade_id'), nome: texto('nome'), descricao: texto('descricao'), peso: numero('peso') };
        if (dados.peso <= 0) return { ok: false, erro: 'O peso deve ser maior que zero.' };
        const proximo = { ...db, criteriosPontuacao: db.criteriosPontuacao.map((item) => item.id === id ? { ...item, ...dados } : item) };
        this._db.set(this.comLog(proximo, { tabela: 'criterios_pontuacao', registro_id: id, acao: 'alteracao', anterior: atual, novo: { ...atual, ...dados } }));
        return { ok: true, id };
      }
      case 'desempates': {
        if (!this.podeFazer('criterio.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
        const db = this._db();
        const atual = db.criteriosDesempate.find((item) => item.id === id);
        if (!atual) return { ok: false, erro: 'Critério de desempate não encontrado.' };
        const dados = {
          modalidade_id: numero('modalidade_id'),
          nome: texto('nome'),
          campo: campos['campo'] as CriterioDesempate['campo'],
          direcao: campos['direcao'] as CriterioDesempate['direcao'],
        };
        const proximo = { ...db, criteriosDesempate: db.criteriosDesempate.map((item) => item.id === id ? { ...item, ...dados } : item) };
        this._db.set(this.comLog(proximo, { tabela: 'criterios_desempate', registro_id: id, acao: 'alteracao', anterior: atual, novo: { ...atual, ...dados } }));
        return { ok: true, id };
      }
      case 'escolas': {
        if (!this.podeFazer('escola.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
        const db = this._db();
        const atual = db.escolas.find((item) => item.id === id);
        if (!atual) return { ok: false, erro: 'Escola não encontrada.' };
        const dados = { nome: texto('nome'), rede: campos['rede'] as Escola['rede'], municipio: texto('municipio'), uf: texto('uf').toUpperCase() };
        if (!dados.nome || !dados.municipio || !/^[A-Z]{2}$/.test(dados.uf)) return { ok: false, erro: 'Informe nome, município e UF válida.' };
        const proximo = { ...db, escolas: db.escolas.map((item) => item.id === id ? { ...item, ...dados } : item) };
        this._db.set(this.comLog(proximo, { tabela: 'escolas', registro_id: id, acao: 'alteracao', anterior: atual, novo: { ...atual, ...dados } }));
        return { ok: true, id };
      }
      case 'equipes': {
        if (!this.podeFazer('equipe.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
        const db = this._db();
        const atual = db.equipes.find((item) => item.id === id);
        if (!atual) return { ok: false, erro: 'Equipe não encontrada.' };
        const edicaoId = numero('edicao_id');
        const escolaId = numero('escola_id');
        if (!db.edicoes.some((item) => item.id === edicaoId) || !db.escolas.some((item) => item.id === escolaId)) {
          return { ok: false, erro: 'Selecione uma edição e uma escola válidas.' };
        }
        const dados = { edicao_id: edicaoId, escola_id: escolaId, nome: texto('nome') };
        if (!dados.nome) return { ok: false, erro: 'Informe o nome da equipe.' };
        const proximo = { ...db, equipes: db.equipes.map((item) => item.id === id ? { ...item, ...dados } : item) };
        this._db.set(this.comLog(proximo, { tabela: 'equipes', registro_id: id, acao: 'alteracao', anterior: atual, novo: { ...atual, ...dados } }));
        return { ok: true, id };
      }
      case 'participantes': {
        if (!this.podeFazer('equipe.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
        const db = this._db();
        const atual = db.participantes.find((item) => item.id === id);
        if (!atual) return { ok: false, erro: 'Participante não encontrado.' };
        const equipeId = numero('equipe_id');
        if (!db.equipes.some((item) => item.id === equipeId)) return { ok: false, erro: 'Selecione uma equipe válida.' };
        const dados = { equipe_id: equipeId, nome: texto('nome'), papel: campos['papel'] as Participante['papel'], serie: texto('serie') };
        if (!dados.nome || !dados.serie) return { ok: false, erro: 'Informe nome e série do participante.' };
        const proximo = { ...db, participantes: db.participantes.map((item) => item.id === id ? { ...item, ...dados } : item) };
        this._db.set(this.comLog(proximo, { tabela: 'participantes', registro_id: id, acao: 'alteracao', anterior: atual, novo: { ...atual, ...dados } }));
        return { ok: true, id };
      }
      case 'etapas': {
        if (!this.podeFazer('etapa.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
        const db = this._db();
        const atual = db.etapas.find((item) => item.id === id);
        if (!atual) return { ok: false, erro: 'Etapa não encontrada.' };
        if (db.disputas.some((item) => item.etapa_id === id)) return { ok: false, erro: 'Não é possível alterar uma etapa depois da criação de disputas.' };
        const modalidade = db.modalidades.find((item) => item.id === numero('modalidade_id'));
        if (!modalidade || !texto('nome') || campos['data_fim'] < campos['data_inicio']) return { ok: false, erro: 'Informe modalidade, nome e período válidos.' };
        const dados = { modalidade_id: modalidade.id, edicao_id: modalidade.edicao_id, nome: texto('nome'), tipo: campos['tipo'] as Etapa['tipo'], data_inicio: campos['data_inicio'], data_fim: campos['data_fim'] };
        const proximo = { ...db, etapas: db.etapas.map((item) => item.id === id ? { ...item, ...dados } : item) };
        this._db.set(this.comLog(proximo, { tabela: 'etapas', registro_id: id, acao: 'alteracao', anterior: atual, novo: { ...atual, ...dados } }));
        return { ok: true, id };
      }
      default:
        return { ok: false, erro: 'Este registro é alterado pelo fluxo específico da sua área.' };
    }
  }

  mudarStatusEdicao(id: number, status: StatusEdicao): Resultado {
    if (!this.podeFazer('edicao.status')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const edicao = db.edicoes.find((e) => e.id === id);
    if (!edicao) return { ok: false, erro: 'Edição não encontrada.' };
    const fluxo: StatusEdicao[] = ['planejada', 'inscricoes', 'em_andamento', 'encerrada'];
    const atual = fluxo.indexOf(edicao.status);
    const alvo = fluxo.indexOf(status);
    if (atual === -1 || alvo !== atual + 1)
      return { ok: false, erro: 'Transição de status inválida (RN-1.2).' };
    const proximo = { ...db, edicoes: db.edicoes.map((e) => (e.id === id ? { ...e, status } : e)) };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'campeonato_edicoes',
        registro_id: id,
        acao: 'alteracao',
        campo: 'status',
        anterior: edicao.status,
        novo: status,
      }),
    );
    return { ok: true, id };
  }

  excluirEdicao(id: number): Resultado {
    if (!this.podeFazer('edicao.excluir')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    if (
      db.modalidades.some((m) => m.edicao_id === id) ||
      db.equipes.some((e) => e.edicao_id === id)
    ) {
      return {
        ok: false,
        erro: 'Edição com modalidades ou equipes vinculadas não pode ser excluída (RN-1.6).',
      };
    }
    const proximo = { ...db, edicoes: db.edicoes.filter((e) => e.id !== id) };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'campeonato_edicoes',
        registro_id: id,
        acao: 'exclusao',
        anterior: db.edicoes.find((e) => e.id === id)?.nome,
      }),
    );
    return { ok: true, id };
  }

  criarModalidade(dados: {
    edicao_id: number;
    nome: string;
    slug: string;
    descricao: string;
    tipo: 'individual' | 'dupla' | 'equipe';
    min_integrantes: number;
    max_integrantes: number;
  }): Resultado {
    if (!this.podeFazer('modalidade.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    if (db.modalidades.some((m) => m.edicao_id === dados.edicao_id && m.slug === dados.slug)) {
      return { ok: false, erro: 'Já existe modalidade com este slug na edição (RN-2.2).' };
    }
    if (
      Number(dados.min_integrantes) > Number(dados.max_integrantes) ||
      Number(dados.min_integrantes) < 1
    ) {
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
    this._db.set(
      this.comLog(proximo, {
        tabela: 'modalidades',
        registro_id: id,
        acao: 'criacao',
        novo: nova.nome,
      }),
    );
    return { ok: true, id };
  }

  criarCriterioPontuacao(dados: {
    modalidade_id: number;
    nome: string;
    descricao: string;
    peso: number;
  }): Resultado {
    if (!this.podeFazer('criterio.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    if (Number(dados.peso) <= 0)
      return { ok: false, erro: 'O peso deve ser maior que zero (RN-2.4).' };
    const id = this.proximoId(db.criteriosPontuacao);
    const criterio: CriterioPontuacao = {
      id,
      ordem:
        db.criteriosPontuacao.filter((c) => c.modalidade_id === dados.modalidade_id).length + 1,
      ativo: true,
      ...dados,
      peso: Number(dados.peso),
    };
    const proximo = { ...db, criteriosPontuacao: [...db.criteriosPontuacao, criterio] };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'criterios_pontuacao',
        registro_id: id,
        acao: 'criacao',
        novo: criterio.nome,
      }),
    );
    return { ok: true, id };
  }

  excluirCriterioPontuacao(id: number): Resultado {
    if (!this.podeFazer('criterio.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const criterio = db.criteriosPontuacao.find((c) => c.id === id);
    if (!criterio) return { ok: false, erro: 'Critério não encontrado.' };
    const proximo = { ...db, criteriosPontuacao: db.criteriosPontuacao.filter((c) => c.id !== id) };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'criterios_pontuacao',
        registro_id: id,
        acao: 'exclusao',
        anterior: criterio.nome,
      }),
    );
    return { ok: true, id };
  }

  criarCriterioDesempate(dados: {
    modalidade_id: number;
    nome: string;
    campo: 'pontos_finais' | 'penalidades' | 'vitorias' | 'saldo' | 'tempo';
    direcao: 'asc' | 'desc';
  }): Resultado {
    if (!this.podeFazer('criterio.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const id = this.proximoId(db.criteriosDesempate);
    const criterio = {
      id,
      ...dados,
      ordem:
        db.criteriosDesempate.filter((c) => c.modalidade_id === dados.modalidade_id).length + 1,
    };
    const proximo = { ...db, criteriosDesempate: [...db.criteriosDesempate, criterio] };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'criterios_desempate',
        registro_id: id,
        acao: 'criacao',
        novo: criterio.nome,
      }),
    );
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
    this._db.set(
      this.comLog(proximo, {
        tabela: 'criterios_desempate',
        registro_id: id,
        acao: 'exclusao',
        anterior: criterio.nome,
      }),
    );
    return { ok: true, id };
  }

  publicarRegra(dados: {
    edicao_id: number;
    modalidade_id: number | null;
    titulo: string;
    conteudo: string;
  }): Resultado {
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
      ...db.regras.map((r) =>
        anteriores.some((a) => a.id === r.id) ? { ...r, status: 'revogada' as const } : r,
      ),
      nova,
    ];
    const proximo = { ...db, regras };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'regras',
        registro_id: id,
        acao: 'publicacao',
        novo: `${nova.titulo} (v${nova.versao})`,
      }),
    );
    return { ok: true, id };
  }

  criarEscola(dados: {
    nome: string;
    rede: Escola['rede'];
    municipio: string;
    uf: string;
  }): Resultado {
    if (!this.podeFazer('escola.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const id = this.proximoId(db.escolas);
    const escola: Escola = {
      id,
      identificador_publico: crypto.randomUUID(),
      ativo: true,
      ...dados,
    };
    const proximo = { ...db, escolas: [...db.escolas, escola] };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'escolas',
        registro_id: id,
        acao: 'criacao',
        novo: escola.nome,
      }),
    );
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
    this._db.set(
      this.comLog(proximo, {
        tabela: 'equipes',
        registro_id: id,
        acao: 'criacao',
        novo: `${equipe.nome} (escola ${equipe.escola_id})`,
      }),
    );
    return { ok: true, id };
  }

  criarParticipante(dados: Omit<Participante, 'id'>): Resultado {
    if (!this.podeFazer('equipe.editar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    if (!db.equipes.some((e) => e.id === dados.equipe_id))
      return { ok: false, erro: 'Equipe não encontrada.' };
    const id = this.proximoId(db.participantes);
    this._db.set(
      this.comLog(
        { ...db, participantes: [...db.participantes, { id, ...dados }] },
        { tabela: 'participantes', registro_id: id, acao: 'criacao', novo: dados.nome },
      ),
    );
    return { ok: true, id };
  }

  criarEquipeParticipante(dados: {
    nome: string;
    modalidade_id: number;
    nome_escola?: string;
    rede: Escola['rede'];
    municipio: string;
    uf: string;
    alunos: { nome: string; serie: string }[];
  }): Resultado {
    const usuario = this.usuario();
    if (!usuario || usuario.tipo_conta !== 'participante') {
      return { ok: false, erro: AVISO_SEM_PERMISSAO };
    }
    const nomeEquipe = dados.nome.trim();
    const modalidade = this._db().modalidades.find(
      (item) => item.id === Number(dados.modalidade_id) && item.ativo,
    );
    if (!nomeEquipe || !modalidade) return { ok: false, erro: 'Informe equipe e modalidade.' };

    const alunos = dados.alunos
      .map((aluno) => ({ nome: aluno.nome.trim(), serie: aluno.serie.trim() }))
      .filter((aluno) => aluno.nome && aluno.serie);
    if (alunos.length < modalidade.min_integrantes || alunos.length > modalidade.max_integrantes) {
      return {
        ok: false,
        erro: `A modalidade permite de ${modalidade.min_integrantes} a ${modalidade.max_integrantes} integrantes.`,
      };
    }

    const db = this._db();
    const nomeEscola = usuario.tipo_participante === 'escola'
      ? usuario.organizacao?.trim() ?? ''
      : dados.nome_escola?.trim() ?? '';
    if (!nomeEscola || !dados.municipio.trim() || !/^[A-Za-z]{2}$/.test(dados.uf.trim())) {
      return { ok: false, erro: 'Informe escola, município e UF para cadastrar a equipe.' };
    }

    let escola = db.escolas.find((item) =>
      usuario.tipo_participante === 'escola' && usuario.cnpj
        ? item.cnpj === usuario.cnpj
        : item.responsavel_usuario_id === usuario.id && item.nome.toLowerCase() === nomeEscola.toLowerCase(),
    );
    let escolas = db.escolas;
    if (!escola) {
      escola = {
        id: this.proximoId(db.escolas),
        identificador_publico: crypto.randomUUID(),
        nome: nomeEscola,
        rede: dados.rede,
        municipio: dados.municipio.trim(),
        uf: dados.uf.trim().toUpperCase(),
        ...(usuario.cnpj ? { cnpj: usuario.cnpj } : {}),
        responsavel_usuario_id: usuario.id,
        ativo: true,
      };
      escolas = [...db.escolas, escola];
    }

    const equipe: Equipe = {
      id: this.proximoId(db.equipes),
      identificador_publico: crypto.randomUUID(),
      edicao_id: modalidade.edicao_id,
      escola_id: escola.id,
      responsavel_usuario_id: usuario.id,
      modalidade_id: modalidade.id,
      nome: nomeEquipe,
      status: 'inscrita',
      observacoes: '',
    };
    const primeiroParticipanteId = this.proximoId(db.participantes);
    const novosParticipantes = alunos.map((aluno, index) => ({
      id: primeiroParticipanteId + index,
      equipe_id: equipe.id,
      nome: aluno.nome,
      papel: index === 0 ? 'capitao' as const : 'integrante' as const,
      serie: aluno.serie,
    }));
    const proximo = {
      ...db,
      escolas,
      equipes: [...db.equipes, equipe],
      participantes: [...db.participantes, ...novosParticipantes],
    };
    this._db.set(this.comLog(proximo, {
      tabela: 'equipes', registro_id: equipe.id, acao: 'pre_cadastro_participante',
      novo: { nome: equipe.nome, escola: escola.nome, participantes: alunos.length },
    }));

    const edicao = db.edicoes.find((item) => item.id === modalidade.edicao_id);
    const inscricao = edicao?.status === 'inscricoes'
      ? this.submeterInscricao(equipe.id, modalidade.id)
      : null;
    if (inscricao && !inscricao.ok) return inscricao;
    return { ok: true, id: equipe.id };
  }

  submeterInscricao(equipeId: number, modalidadeId: number): Resultado {
    const db = this._db();
    const usuario = this.usuario();
    const responsavelDaEquipe = usuario?.tipo_conta === 'participante' && db.equipes.some(
      (equipe) => equipe.id === equipeId && equipe.responsavel_usuario_id === usuario.id,
    );
    if (!this.podeFazer('equipe.editar') && !responsavelDaEquipe) {
      return { ok: false, erro: AVISO_SEM_PERMISSAO };
    }
    const equipe = db.equipes.find((e) => e.id === equipeId);
    const modalidade = db.modalidades.find((m) => m.id === modalidadeId && m.ativo);
    if (!equipe || !modalidade || equipe.edicao_id !== modalidade.edicao_id)
      return { ok: false, erro: 'Equipe e modalidade devem pertencer à mesma edição.' };
    if (db.edicoes.find((e) => e.id === equipe.edicao_id)?.status !== 'inscricoes')
      return { ok: false, erro: 'A edição não está no período de inscrições.' };
    if (
      db.inscricoes.some(
        (i) =>
          i.equipe_id === equipeId && i.modalidade_id === modalidadeId && i.status !== 'cancelada',
      )
    )
      return { ok: false, erro: 'A equipe já possui inscrição nesta modalidade.' };
    const integrantes = db.participantes.filter(
      (p) => p.equipe_id === equipeId && p.papel !== 'tecnico',
    ).length;
    if (integrantes < modalidade.min_integrantes || integrantes > modalidade.max_integrantes)
      return {
        ok: false,
        erro: `A modalidade exige entre ${modalidade.min_integrantes} e ${modalidade.max_integrantes} integrantes.`,
      };
    const id = this.proximoId(db.inscricoes);
    const inscricao: Inscricao = {
      id,
      identificador_publico: crypto.randomUUID(),
      edicao_id: equipe.edicao_id,
      equipe_id: equipeId,
      modalidade_id: modalidadeId,
      status: 'submetida',
      submetida_em: new Date().toISOString(),
      avaliada_em: null,
      avaliada_por: null,
      motivo_rejeicao: null,
    };
    this._db.set(
      this.comLog(
        { ...db, inscricoes: [...db.inscricoes, inscricao] },
        { tabela: 'inscricoes', registro_id: id, acao: 'criacao', novo: equipe.nome },
      ),
    );
    return { ok: true, id };
  }

  avaliarInscricao(id: number, status: Inscricao['status'], motivo?: string): Resultado {
    if (!this.podeFazer('inscricao.avaliar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const inscricao = db.inscricoes.find((i) => i.id === id);
    if (!inscricao) return { ok: false, erro: 'Inscrição não encontrada.' };
    if (status === 'rejeitada' && !motivo?.trim())
      return { ok: false, erro: 'Rejeição exige motivo (RN-5.3).' };
    const equipe = db.equipes.find((e) => e.id === inscricao.equipe_id);
    if (status === 'aprovada' && ['desclassificada', 'desistente'].includes(equipe?.status ?? '')) {
      return {
        ok: false,
        erro: 'Equipe desclassificada/desistente não pode ser aprovada (RN-5.6).',
      };
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
    this._db.set(
      this.comLog(proximo, {
        tabela: 'inscricoes',
        registro_id: id,
        acao: 'alteracao',
        campo: 'status',
        anterior: inscricao.status,
        novo: status,
      }),
    );
    return { ok: true, id };
  }

  criarEtapa(dados: {
    edicao_id: number;
    modalidade_id: number;
    nome: string;
    tipo: Etapa['tipo'];
    data_inicio: string;
    data_fim: string;
  }): Resultado {
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
    this._db.set(
      this.comLog(proximo, {
        tabela: 'etapas',
        registro_id: id,
        acao: 'criacao',
        novo: etapa.nome,
      }),
    );
    return { ok: true, id };
  }

  gerarChaveamento(etapaId: number): Resultado {
    if (!this.podeFazer('chaveamento.gerar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const etapa = db.etapas.find((e) => e.id === etapaId);
    if (!etapa) return { ok: false, erro: 'Etapa não encontrada.' };
    if (db.disputas.some((d) => d.etapa_id === etapaId)) {
      return {
        ok: false,
        erro: 'Já existem disputas nesta etapa — geração idempotente bloqueada (RN-6.7).',
      };
    }
    const aprovadas = db.inscricoes
      .filter(
        (i) =>
          i.edicao_id === etapa.edicao_id &&
          i.modalidade_id === etapa.modalidade_id &&
          i.status === 'aprovada',
      )
      .map((i) => i.equipe_id);
    if (aprovadas.length < 2)
      return { ok: false, erro: 'É necessário ao menos 2 inscrições aprovadas (RN-6.4).' };

    if (etapa.tipo !== 'grupos')
      return { ok: false, erro: 'Esta versão gera chaveamento apenas para fases de grupos.' };
    const gruposExistentes = db.grupos.filter((g) => g.etapa_id === etapaId);
    const grupos = gruposExistentes.length
      ? gruposExistentes
      : aprovadas.length < 4
        ? [{ id: this.proximoId(db.grupos), etapa_id: etapaId, nome: 'Grupo A', ordem: 1 }]
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
      const integrantes = associacoes
        .filter((a) => a.grupo_id === grupo.id)
        .map((a) => a.equipe_id);
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
      equipeGrupo: [
        ...db.equipeGrupo.filter((eg) => !grupos.some((g) => g.id === eg.grupo_id)),
        ...associacoes,
      ],
      disputas: [...db.disputas, ...disputas],
    };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'disputas',
        registro_id: etapaId,
        acao: 'criacao',
        novo: `${disputas.length} disputas geradas em ${etapa.nome}`,
      }),
    );
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
      return {
        ok: false,
        erro: 'Disputa concluída exige resultado para as duas equipes (RN-7.4).',
      };
    }
    let vencedor = disputa.vencedor_equipe_id;
    if (status === 'concluida') {
      const a = resultados.find((r) => r.equipe_id === disputa.equipe_a_id);
      const b = resultados.find((r) => r.equipe_id === disputa.equipe_b_id);
      if (a && b)
        vencedor =
          a.pontos_finais === b.pontos_finais
            ? null
            : a.pontos_finais > b.pontos_finais
              ? a.equipe_id
              : b.equipe_id;
    }
    if (status === 'wo' && !disputa.vencedor_equipe_id) {
      return { ok: false, erro: 'WO exige vencedor definido (RN-7.5).' };
    }
    const proximo = {
      ...db,
      disputas: db.disputas.map((d) =>
        d.id === id ? { ...d, status, vencedor_equipe_id: vencedor } : d,
      ),
    };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'disputas',
        registro_id: id,
        acao: 'alteracao',
        campo: 'status',
        anterior: disputa.status,
        novo: status,
      }),
    );
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
      return {
        ok: false,
        erro: 'Etapa publicada: correção exige retificação com motivo (RN-8.8).',
      };
    }
    if (![disputa.equipe_a_id, disputa.equipe_b_id].includes(equipeId)) {
      return { ok: false, erro: 'Equipe não pertence a esta disputa.' };
    }
    const penalidades = Number(dados.penalidades);
    if (!Number.isFinite(penalidades) || penalidades < 0)
      return { ok: false, erro: 'Penalidades devem ser ≥ 0 (RN-8.3).' };
    const criterios = db.criteriosPontuacao.filter(
      (c) => etapa && c.modalidade_id === etapa.modalidade_id && c.ativo,
    );
    if (
      !criterios.length ||
      criterios.some(
        (c) => !Number.isFinite(Number(dados.valores[c.id])) || Number(dados.valores[c.id]) < 0,
      )
    )
      return { ok: false, erro: 'Informe valores válidos para todos os critérios ativos.' };
    if (['cancelada', 'wo'].includes(disputa.status))
      return { ok: false, erro: 'Disputa cancelada ou com WO não recebe pontuação.' };
    const pontos = pontosPorCriterios(criterios, dados.valores);
    const usuario = this.usuario();
    const agora = new Date().toISOString();
    const existente = db.resultados.find(
      (r) => r.disputa_id === disputaId && r.equipe_id === equipeId,
    );
    let resultadoId = existente?.id ?? this.proximoId(db.resultados);

    const resultados = existente
      ? db.resultados.map((r) =>
          r.id === existente.id
            ? {
                ...r,
                pontos,
                penalidades,
                pontos_finais: pontos - penalidades,
                observacao: dados.observacao ?? '',
                registrado_por: usuario?.id ?? r.registrado_por,
                registrado_em: agora,
              }
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

    const pontuacoesSemAntigas = db.pontuacoesCriterio.filter(
      (p) => p.resultado_disputa_id !== resultadoId,
    );
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
      disputas: db.disputas.map((d) =>
        d.id === disputaId
          ? { ...d, status: 'em_andamento' as const, vencedor_equipe_id: null }
          : d,
      ),
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
    if (['homologada', 'publicada', 'cancelada'].includes(etapa.status))
      return { ok: false, erro: 'Esta etapa não está disponível para homologação.' };
    if (!db.disputas.some((d) => d.etapa_id === etapaId && d.status === 'concluida'))
      return {
        ok: false,
        erro: 'A etapa precisa ter pelo menos uma disputa concluída com resultados.',
      };
    const pendentes = db.disputas.filter(
      (d) => d.etapa_id === etapaId && !['concluida', 'cancelada', 'wo'].includes(d.status),
    );
    if (pendentes.length) {
      return {
        ok: false,
        erro: `Existem ${pendentes.length} disputa(s) pendente(s): ${pendentes.map((d) => d.codigo).join(', ')} (RN-10.2).`,
      };
    }
    const usuario = this.usuario();
    const proximo = {
      ...db,
      etapas: db.etapas.map((e) =>
        e.id === etapaId ? { ...e, status: 'homologada' as StatusEtapa } : e,
      ),
    };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'etapas',
        registro_id: etapaId,
        acao: 'homologacao',
        campo: 'status',
        anterior: etapa.status,
        novo: `homologada por ${usuario?.nome ?? ''}`,
      }),
    );
    return { ok: true, id: etapaId };
  }

  publicarEtapa(etapaId: number): Resultado {
    if (!this.podeFazer('publicar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    const db = this._db();
    const etapa = db.etapas.find((e) => e.id === etapaId);
    if (!etapa) return { ok: false, erro: 'Etapa não encontrada.' };
    if (etapa.status === 'publicada')
      return { ok: false, erro: 'Etapa já publicada — use retificação (RN-10.6).' };
    if (etapa.status !== 'homologada')
      return { ok: false, erro: 'Publicar exige homologação prévia (RN-10.5).' };
    const pendentes = db.disputas.filter(
      (d) => d.etapa_id === etapaId && !['concluida', 'cancelada', 'wo'].includes(d.status),
    );
    if (pendentes.length)
      return { ok: false, erro: 'Todas as disputas precisam estar concluídas (RN-10.2).' };

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
      motivo_retificacao:
        versao > 1
          ? String(
              [...db.logs]
                .reverse()
                .find(
                  (l) =>
                    l.tabela === 'etapas' && l.registro_id === etapaId && l.acao === 'reabertura',
                )?.valor_novo ?? '',
            )
          : null,
    };
    const proximo = {
      ...db,
      publicacoes: [
        ...db.publicacoes.map((p) =>
          p.etapa_id === etapaId && p.status === 'publicada'
            ? { ...p, status: 'retificada' as StatusPublicacao }
            : p,
        ),
        publicacao,
      ],
      etapas: db.etapas.map((e) =>
        e.id === etapaId ? { ...e, status: 'publicada' as StatusEtapa } : e,
      ),
    };
    this._db.set(
      this.comLog(proximo, {
        tabela: 'publicacoes_resultado',
        registro_id: id,
        acao: 'publicacao',
        campo: 'versao',
        anterior: versao - 1,
        novo: versao,
      }),
    );
    return { ok: true, id };
  }

  reabrirEtapa(publicacaoId: number, motivo: string): Resultado {
    if (!this.podeFazer('retificar')) return { ok: false, erro: AVISO_SEM_PERMISSAO };
    if (!motivo.trim()) return { ok: false, erro: 'Retificação exige justificativa.' };
    const db = this._db();
    const pub = db.publicacoes.find((p) => p.id === publicacaoId && p.status === 'publicada');
    const etapa = db.etapas.find((e) => e.id === pub?.etapa_id);
    if (!pub || !etapa || etapa.status !== 'publicada')
      return { ok: false, erro: 'A etapa precisa estar publicada para ser reaberta.' };
    this._db.set(
      this.comLog(
        {
          ...db,
          etapas: db.etapas.map((e) =>
            e.id === etapa.id ? { ...e, status: 'em_andamento' as StatusEtapa } : e,
          ),
        },
        {
          tabela: 'etapas',
          registro_id: etapa.id,
          acao: 'reabertura',
          anterior: 'publicada',
          novo: motivo.trim(),
        },
      ),
    );
    return { ok: true, id: etapa.id };
  }

  retificarPublicacao(publicacaoId: number, motivo: string): Resultado {
    return this.reabrirEtapa(publicacaoId, motivo);
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
        if (salvo?.edicoes?.length) {
          const inicial = criarEstadoInicial();
          const usuariosSalvos = salvo.usuarios ?? [];
          let proximoUsuarioId = this.proximoId(usuariosSalvos);
          const idsPorUsuarioSeed = new Map<number, number>();
          const usuariosMock = inicial.usuarios.flatMap((mock) => {
            const existente = usuariosSalvos.find(
              (usuario) => usuario.email.toLowerCase() === mock.email.toLowerCase(),
            );
            if (existente) {
              idsPorUsuarioSeed.set(mock.id, existente.id);
              return [];
            }
            const usuario = { ...mock, id: proximoUsuarioId++ };
            idsPorUsuarioSeed.set(mock.id, usuario.id);
            return [usuario];
          });
          const remapearUsuarios = <T extends { usuario_id: number }>(
            registros: T[] | undefined,
            mocks: T[],
          ): T[] => registros ?? mocks.map((registro) => ({
            ...registro,
            usuario_id: idsPorUsuarioSeed.get(registro.usuario_id) ?? registro.usuario_id,
          }));
          const usuarioEscolaId = usuariosSalvos.find(
            (usuario) => usuario.email.toLowerCase() === 'carla.diretora@escola.demo',
          )?.id ?? idsPorUsuarioSeed.get(8) ?? 8;
          const usuarioPessoaId = usuariosSalvos.find(
            (usuario) => usuario.email.toLowerCase() === 'lucas.estudante@arena.demo',
          )?.id ?? idsPorUsuarioSeed.get(7) ?? 7;
          const escolasSalvas = salvo.escolas ?? inicial.escolas;
          const escolaDemoSeed = inicial.escolas.find((escola) => escola.cnpj === '11222333000181')!;
          const escolaDemoExistente = escolasSalvas.find((escola) => escola.cnpj === '11222333000181');
          const escolaDemoId = escolaDemoExistente?.id ?? (salvo.escolas
            ? this.proximoId(escolasSalvas)
            : escolaDemoSeed.id);
          const escolasComDemo = escolaDemoExistente
            ? escolasSalvas.map((escola) => escola.id === escolaDemoId
              ? { ...escola, responsavel_usuario_id: usuarioEscolaId }
              : escola)
            : [...escolasSalvas, { ...escolaDemoSeed, id: escolaDemoId, responsavel_usuario_id: usuarioEscolaId }];
          const equipesSalvas = salvo.equipes ?? inicial.equipes;
          const equipesDemoSeed = inicial.equipes.filter((equipe) => equipe.responsavel_usuario_id === 8 || equipe.responsavel_usuario_id === 7);
          const equipesComDemo = equipesSalvas.map((equipe) => {
            const equipeDemo = equipesDemoSeed.find((item) => item.id === equipe.id);
            return equipeDemo
              ? {
                ...equipe,
                escola_id: escolaDemoId,
                responsavel_usuario_id: equipeDemo.responsavel_usuario_id === 8 ? usuarioEscolaId : usuarioPessoaId,
              }
              : equipe;
          });
          return {
            ...inicial,
            ...salvo,
            usuarios: [...usuariosSalvos, ...usuariosMock].map((usuario) => {
              const tipoConta = usuario.tipo_conta ?? (usuario.perfil === 'administrador'
                ? 'administrador'
                : usuario.perfil === 'empresa'
                  ? 'empresa'
                  : usuario.perfil === 'participante'
                    ? 'participante'
                    : 'voluntario');
              const cadastroLegado = (salvo.cadastrosParticipantes ?? []).find(
                (item) => item.usuario_id === usuario.id,
              );
              const parceriaLegada = (salvo.parcerias ?? []).find((item) => item.usuario_id === usuario.id);
              const inscricaoVoluntariaLegada = (salvo.inscricoesVoluntarios ?? []).find(
                (item) => item.usuario_id === usuario.id,
              );
              const telefoneLegado = cadastroLegado && 'telefone_responsavel' in cadastroLegado
                ? cadastroLegado.telefone_responsavel
                : cadastroLegado && 'telefone' in cadastroLegado
                  ? cadastroLegado.telefone
                  : parceriaLegada?.telefone ?? inscricaoVoluntariaLegada?.telefone;
              return {
                ...usuario,
                ...(usuario.email.toLowerCase() === 'admin@arena.demo' && usuario.nome.startsWith('Marina ')
                  ? { nome: 'Admin' }
                  : {}),
                ...(usuario.email.toLowerCase() === 'ana@tecnologia.demo' && usuario.nome === 'Ana Parceira'
                  ? { nome: 'SENAI', organizacao: 'SENAI' }
                  : {}),
                tipo_conta: tipoConta,
                ...(tipoConta === 'participante'
                  ? { tipo_participante: usuario.tipo_participante ?? (cadastroLegado?.tipo === 'escola' ? 'escola' : 'pessoa_fisica') }
                  : {}),
                ...(usuario.cnpj || !cadastroLegado || !('cnpj' in cadastroLegado)
                  ? {}
                  : { cnpj: cadastroLegado.cnpj }),
                ...(usuario.cnpj || !parceriaLegada ? {} : { cnpj: parceriaLegada.cnpj }),
                ...(usuario.telefone || !telefoneLegado ? {} : { telefone: telefoneLegado }),
                ...(usuario.organizacao || !cadastroLegado || !('nome_escola' in cadastroLegado)
                  ? {}
                  : { organizacao: cadastroLegado.nome_escola }),
              };
            }),
            cargosVoluntarios: salvo.cargosVoluntarios ?? inicial.cargosVoluntarios,
            escolas: escolasComDemo,
            equipes: equipesComDemo,
            inscricoesVoluntarios: remapearUsuarios(salvo.inscricoesVoluntarios, inicial.inscricoesVoluntarios),
            cadastrosParticipantes: remapearUsuarios(salvo.cadastrosParticipantes, inicial.cadastrosParticipantes),
            parcerias: remapearUsuarios(salvo.parcerias, inicial.parcerias),
          };
        }
      }
    } catch {
      /* estado corrompido: recria */
    }
    return criarEstadoInicial();
  }
}
