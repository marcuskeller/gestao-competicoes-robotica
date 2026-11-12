import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';

@Component({
  selector: 'app-overview',
  imports: [RouterLink],
  template: `
    <header class="min-w-0">
      <p class="text-sm font-semibold text-primary">CAMPEONATO JOINVILENSE DE ROBÓTICA</p>
      <h1 class="mt-2 text-3xl font-semibold">Visão geral</h1>
      <p class="mt-2 max-w-2xl text-base-content/60">
        Acompanhe inscrições, disputas e resultados oficiais em um só lugar.
      </p>
    </header>

    <section aria-label="Indicadores gerais do campeonato" class="mt-6 grid min-w-0 gap-3 sm:grid-cols-2">
        <a routerLink="/app/equipes" class="rounded-2xl border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary/40 hover:bg-base-100/80">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">Participação</p>
          <p class="mt-3 text-4xl font-semibold tabular-nums">{{ resumo().participacao.equipes }}</p>
          <h3 class="mt-1 font-semibold">Equipes participantes</h3>
          <p class="mt-3 text-sm text-base-content/65">{{ resumo().participacao.escolas }} escolas · {{ resumo().participacao.estudantes }} estudantes</p>
          <p class="mt-1 text-sm text-base-content/65">{{ resumo().participacao.inscricoes }} inscrições · {{ resumo().participacao.pendentes }} pendentes · {{ resumo().participacao.aprovadas }} aprovadas</p>
        </a>

        <a routerLink="/app/voluntario" class="rounded-2xl border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary/40 hover:bg-base-100/80">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">Voluntariado</p>
          <p class="mt-3 text-4xl font-semibold tabular-nums">{{ resumo().voluntariado.inscritos }}</p>
          <h3 class="mt-1 font-semibold">Inscrições de voluntários</h3>
          <p class="mt-3 text-sm text-base-content/65">{{ resumo().voluntariado.pendentes }} pendentes · {{ resumo().voluntariado.aprovadas }} aprovadas</p>
          <p class="mt-1 text-sm text-base-content/65">{{ resumo().voluntariado.cargos }} cargos · {{ resumo().voluntariado.vagas }} vagas previstas</p>
        </a>

        <a routerLink="/app/usuarios" class="rounded-2xl border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary/40 hover:bg-base-100/80">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">Apoios</p>
          <p class="mt-3 text-4xl font-semibold tabular-nums">{{ resumo().apoios.total }}</p>
          <h3 class="mt-1 font-semibold">Propostas de apoio</h3>
          <p class="mt-3 text-sm text-base-content/65">{{ resumo().apoios.emAnalise }} em análise · {{ resumo().apoios.aprovadas }} aprovadas</p>
          <p class="mt-1 text-sm text-base-content/65">{{ resumo().apoios.contribuicoesDemo }} contribuições diretas de demonstração</p>
        </a>

        <a routerLink="/app/disputas" class="rounded-2xl border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary/40 hover:bg-base-100/80">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">Competição e resultados</p>
          <p class="mt-3 text-4xl font-semibold tabular-nums">{{ resumo().competicao.disputas }}</p>
          <h3 class="mt-1 font-semibold">Disputas na edição</h3>
          <p class="mt-3 text-sm text-base-content/65">{{ resumo().competicao.abertas }} abertas · {{ resumo().competicao.concluidas }} concluídas</p>
          <p class="mt-1 text-sm text-base-content/65">{{ resumo().competicao.modalidades }} modalidades · {{ resumo().competicao.etapas }} etapas · {{ resumo().competicao.publicados }} resultados publicados</p>
        </a>
    </section>
  `,
})
export class OverviewComponent {
  readonly store = inject(StoreService);

  readonly resumo = computed(() => {
    const db = this.store.db();
    const edicaoId = this.store.edicaoAtiva()?.id;
    const equipes = db.equipes.filter((equipe) => equipe.edicao_id === edicaoId);
    const equipeIds = new Set(equipes.map((equipe) => equipe.id));
    const inscricoes = db.inscricoes.filter((inscricao) => inscricao.edicao_id === edicaoId);
    const etapas = db.etapas.filter((etapa) => etapa.edicao_id === edicaoId);
    const etapaIds = new Set(etapas.map((etapa) => etapa.id));
    const disputas = db.disputas.filter((disputa) => etapaIds.has(disputa.etapa_id));
    const inscricoesVoluntarios = db.inscricoesVoluntarios;
    const cargosAtivos = db.cargosVoluntarios.filter((cargo) => cargo.ativo);
    const apoios = db.parcerias;

    return {
      participacao: {
        equipes: equipes.length,
        escolas: new Set(equipes.map((equipe) => equipe.escola_id)).size,
        estudantes: db.participantes.filter((participante) => equipeIds.has(participante.equipe_id)).length,
        inscricoes: inscricoes.length,
        pendentes: inscricoes.filter((item) => item.status === 'submetida' || item.status === 'em_analise').length,
        aprovadas: inscricoes.filter((item) => item.status === 'aprovada').length,
      },
      voluntariado: {
        inscritos: inscricoesVoluntarios.length,
        pendentes: inscricoesVoluntarios.filter((item) => item.status === 'pendente').length,
        aprovadas: inscricoesVoluntarios.filter((item) => item.status === 'aprovada').length,
        cargos: cargosAtivos.length,
        vagas: cargosAtivos.reduce((total, cargo) => total + cargo.vagas_total, 0),
      },
      apoios: {
        total: apoios.length,
        emAnalise: apoios.filter((item) => item.status === 'em_analise').length,
        aprovadas: apoios.filter((item) => item.status === 'aprovada').length,
        contribuicoesDemo: apoios.filter((item) => item.status === 'contribuicao_demo').length,
      },
      competicao: {
        disputas: disputas.length,
        abertas: disputas.filter((item) => item.status === 'agendada' || item.status === 'em_andamento').length,
        concluidas: disputas.filter((item) => item.status === 'concluida' || item.status === 'wo').length,
        modalidades: db.modalidades.filter((item) => item.edicao_id === edicaoId && item.ativo).length,
        etapas: etapas.length,
        publicados: db.publicacoes.filter((item) => item.edicao_id === edicaoId && item.status === 'publicada').length,
      },
    };
  });
}
