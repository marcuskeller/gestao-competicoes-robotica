import type {
  CriterioDesempate,
  CriterioPontuacao,
  Database,
  Disputa,
  Etapa,
  LinhaClassificacao,
  LinhaSnapshot,
  Publicacao,
  SnapshotPublicacao,
} from './models';

export const CAMPOS_DESEMPATE: Record<string, string> = {
  pontos_finais: 'Pontos finais',
  penalidades: 'Penalidades',
  vitorias: 'Vitórias',
  saldo: 'Saldo de pontos',
  tempo: 'Tempo',
};

export function pontosPorCriterios(
  criterios: CriterioPontuacao[],
  valores: Record<number, number>,
): number {
  return criterios.reduce(
    (soma, criterio) => soma + (Number(valores[criterio.id]) || 0) * Number(criterio.peso),
    0,
  );
}

type LinhaParcial = Omit<LinhaClassificacao, 'posicao' | 'empatado' | 'desempateAplicado' | 'modalidade_nome'>;

function valorDoCampo(linha: LinhaParcial, campo: string): number {
  return Number((linha as unknown as Record<string, number>)[campo] ?? 0);
}

function compararPorCriterios(a: LinhaParcial, b: LinhaParcial, criterios: CriterioDesempate[]): number {
  for (const criterio of criterios) {
    const va = valorDoCampo(a, criterio.campo);
    const vb = valorDoCampo(b, criterio.campo);
    if (va !== vb) return criterio.direcao === 'asc' ? va - vb : vb - va;
  }
  return a.equipe_nome.localeCompare(b.equipe_nome, 'pt-BR');
}

function criterioDecisivo(
  a: LinhaParcial,
  b: LinhaParcial,
  criterios: CriterioDesempate[],
): CriterioDesempate | null {
  for (const criterio of criterios) {
    if (valorDoCampo(a, criterio.campo) !== valorDoCampo(b, criterio.campo)) return criterio;
  }
  return null;
}

export function calcularClassificacao(db: Database, etapaId: number): LinhaClassificacao[] {
  const etapa = db.etapas.find((e) => e.id === Number(etapaId));
  if (!etapa) return [];

  const modalidade = db.modalidades.find((m) => m.id === etapa.modalidade_id);
  const criterios = db.criteriosPontuacao
    .filter((c) => c.modalidade_id === etapa.modalidade_id && c.ativo)
    .sort((a, b) => a.ordem - b.ordem);
  const desempates = db.criteriosDesempate
    .filter((c) => c.modalidade_id === etapa.modalidade_id)
    .sort((a, b) => a.ordem - b.ordem);
  const criterioTempo = criterios.find((c) => c.nome.toLowerCase().includes('tempo'));

  const disputas = db.disputas.filter((d) => d.etapa_id === etapa.id && d.status === 'concluida');
  const mapa = new Map<number, LinhaParcial>();

  const garantir = (equipeId: number): LinhaParcial => {
    let linha = mapa.get(equipeId);
    if (!linha) {
      const equipe = db.equipes.find((e) => e.id === equipeId);
      const escola = db.escolas.find((e) => e.id === equipe?.escola_id);
      linha = {
        equipe_id: equipeId,
        equipe_nome: equipe?.nome ?? `Equipe ${equipeId}`,
        equipe_uuid: equipe?.identificador_publico ?? null,
        escola_nome: escola?.nome ?? '—',
        escola_rede: escola?.rede ?? '—',
        pontos: 0,
        penalidades: 0,
        pontos_finais: 0,
        vitorias: 0,
        saldo: 0,
        tempo: 0,
        partidas: 0,
      };
      mapa.set(equipeId, linha);
    }
    return linha;
  };

  disputas.forEach((disputa) => {
    const resultados = db.resultados.filter((r) => r.disputa_id === disputa.id);
    resultados.forEach((resultado) => {
      const linha = garantir(resultado.equipe_id);
      const adversario = resultados.find((r) => r.equipe_id !== resultado.equipe_id);
      linha.pontos += Number(resultado.pontos);
      linha.penalidades += Number(resultado.penalidades);
      linha.pontos_finais += Number(resultado.pontos_finais);
      linha.partidas += 1;
      linha.saldo += adversario ? resultado.pontos_finais - adversario.pontos_finais : 0;
      if (disputa.vencedor_equipe_id === resultado.equipe_id) linha.vitorias += 1;
      if (criterioTempo) {
        linha.tempo += db.pontuacoesCriterio
          .filter(
            (p) =>
              p.resultado_disputa_id === resultado.id && p.criterio_pontuacao_id === criterioTempo.id,
          )
          .reduce((soma, nota) => soma + Number(nota.valor), 0);
      }
    });
  });

  const linhas = [...mapa.values()].sort((a, b) => compararPorCriterios(a, b, desempates));
  const criteriosUsados: CriterioDesempate[] = desempates.length
    ? desempates
    : [{ id: 0, modalidade_id: etapa.modalidade_id, nome: 'Pontos finais', campo: 'pontos_finais', direcao: 'desc', ordem: 1 }];

  let posicaoAnterior = 0;
  return linhas.map((linha, indice) => {
    const anterior = linhas[indice - 1];
    const empatadoComAnterior =
      Boolean(anterior) &&
      criteriosUsados.every((c) => valorDoCampo(anterior, c.campo) === valorDoCampo(linha, c.campo));
    const posicao = empatadoComAnterior ? posicaoAnterior : indice + 1;
    posicaoAnterior = posicao;

    const proximo = linhas[indice + 1];
    const mesmoPontos = Boolean(proximo) && proximo.pontos_finais === linha.pontos_finais;
    const decisivo = mesmoPontos ? criterioDecisivo(linha, proximo, criteriosUsados) : null;

    return {
      ...linha,
      posicao,
      empatado: empatadoComAnterior || mesmoPontos,
      desempateAplicado: decisivo?.nome ?? null,
      modalidade_nome: modalidade?.nome ?? '',
    };
  });
}

export function disputasPendentes(db: Database, etapaId: number): Disputa[] {
  return db.disputas.filter(
    (d) => d.etapa_id === Number(etapaId) && !['concluida', 'cancelada', 'wo'].includes(d.status),
  );
}

export function publicacaoVigente(db: Database, etapaId: number): Publicacao | undefined {
  return [...db.publicacoes]
    .filter((p) => p.etapa_id === Number(etapaId))
    .sort((a, b) => b.versao - a.versao)[0];
}

export function montarSnapshot(db: Database, etapaId: number, versao: number): SnapshotPublicacao {
  const etapa = db.etapas.find((e) => e.id === Number(etapaId)) as Etapa;
  const modalidade = db.modalidades.find((m) => m.id === etapa?.modalidade_id);
  const classificacao: LinhaSnapshot[] = calcularClassificacao(db, etapaId).map((linha) => ({
    posicao: linha.posicao,
    equipe_uuid: linha.equipe_uuid,
    equipe: linha.equipe_nome,
    escola: linha.escola_nome,
    pontos_finais: linha.pontos_finais,
    vitorias: linha.vitorias,
    saldo: linha.saldo,
    empatado: linha.empatado,
  }));

  return {
    contrato: 'resultado-publicado/v1',
    versao,
    edicao_uuid: db.edicoes.find((e) => e.id === etapa?.edicao_id)?.identificador_publico ?? null,
    etapa: {
      id: etapa.id,
      nome: etapa.nome,
      tipo: etapa.tipo,
      modalidade: modalidade?.nome ?? '',
      modalidade_slug: modalidade?.slug ?? '',
    },
    gerado_em: new Date().toISOString(),
    classificacao,
  };
}

export function publicacoesPublicadas(db: Database): Publicacao[] {
  return db.publicacoes
    .filter((p) => p.status === 'publicada')
    .sort((a, b) => new Date(b.publicado_em ?? 0).getTime() - new Date(a.publicado_em ?? 0).getTime());
}
