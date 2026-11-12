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

    <section aria-label="Indicadores e etapas da edição" class="mt-6 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <a routerLink="/app/equipes" class="rounded-2xl border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary/40 hover:bg-base-100/80">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">Participação</p>
          <p class="mt-3 text-4xl font-semibold tabular-nums">{{ resumo().equipes }}</p>
          <h3 class="mt-1 font-semibold">Equipes cadastradas</h3>
          <p class="mt-2 text-sm text-base-content/60">Total de equipes participantes nesta edição.</p>
        </a>
        <a routerLink="/app/inscricoes" class="rounded-2xl border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary/40 hover:bg-base-100/80">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">Inscrições</p>
          <p class="mt-3 text-4xl font-semibold tabular-nums">{{ resumo().inscricoesPendentes }}</p>
          <h3 class="mt-1 font-semibold">Pendentes</h3>
          <p class="mt-2 text-sm text-base-content/60">Revise as equipes inscritas e aprove as que atendem às regras.</p>
        </a>
        <a routerLink="/app/disputas" class="rounded-2xl border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary/40 hover:bg-base-100/80">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">Competição</p>
          <p class="mt-3 text-4xl font-semibold tabular-nums">{{ resumo().disputasAbertas }}</p>
          <h3 class="mt-1 font-semibold">Disputas em aberto</h3>
          <p class="mt-2 text-sm text-base-content/60">Acompanhe as partidas e registre as súmulas por critério.</p>
        </a>
        <a routerLink="/app/publicacao" class="rounded-2xl border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary/40 hover:bg-base-100/80">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">Resultado oficial</p>
          <p class="mt-3 text-4xl font-semibold tabular-nums">{{ resumo().resultadosPublicados }}</p>
          <h3 class="mt-1 font-semibold">Publicados</h3>
          <p class="mt-2 text-sm text-base-content/60">Homologue as etapas antes de publicar os resultados ao público.</p>
        </a>
        @for (etapa of resumo().etapas; track etapa.id) {
          <a routerLink="/app/etapas" class="rounded-2xl border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary/40 hover:bg-base-100/80">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-primary">Etapa · {{ statusEtapa(etapa.status) }}</p>
            </div>
            <p class="mt-3 text-4xl font-semibold tabular-nums">{{ etapa.disputas }}</p>
            <h3 class="mt-1 font-semibold">{{ etapa.nome }}</h3>
            <p class="mt-2 text-sm text-base-content/60">Disputa(s) nesta etapa.</p>
          </a>
        } @empty {
          <article class="rounded-2xl border border-dashed border-base-300 p-5">
            <p class="text-xs font-semibold uppercase tracking-wide text-base-content/50">Etapas</p>
            <p class="mt-3 text-4xl font-semibold tabular-nums">0</p>
            <h3 class="mt-1 font-semibold">Etapas cadastradas</h3>
            <p class="mt-2 text-sm text-base-content/60">Nenhuma etapa cadastrada nesta edição.</p>
          </article>
        }
    </section>
  `,
})
export class OverviewComponent {
  readonly store = inject(StoreService);

  readonly resumo = computed(() => {
    const db = this.store.db();
    const edicaoId = this.store.edicaoAtiva()?.id;
    const etapas = db.etapas
      .filter((etapa) => etapa.edicao_id === edicaoId)
      .map((etapa) => ({
        ...etapa,
        disputas: db.disputas.filter((disputa) => disputa.etapa_id === etapa.id).length,
      }));
    const etapaIds = new Set(etapas.map((etapa) => etapa.id));

    return {
      equipes: db.equipes.filter((equipe) => equipe.edicao_id === edicaoId).length,
      inscricoesPendentes: db.inscricoes.filter(
        (inscricao) =>
          inscricao.edicao_id === edicaoId &&
          (inscricao.status === 'submetida' || inscricao.status === 'em_analise'),
      ).length,
      disputasAbertas: db.disputas.filter(
        (disputa) =>
          etapaIds.has(disputa.etapa_id) &&
          (disputa.status === 'agendada' || disputa.status === 'em_andamento'),
      ).length,
      resultadosPublicados: db.publicacoes.filter(
        (publicacao) => publicacao.edicao_id === edicaoId && publicacao.status === 'publicada',
      ).length,
      etapas,
    };
  });

  statusEtapa(status: string): string {
    const rotulos: Record<string, string> = {
      planejada: 'Planejada',
      em_andamento: 'Em andamento',
      concluida: 'Concluída',
      homologada: 'Homologada',
      publicada: 'Publicada',
      cancelada: 'Cancelada',
    };
    return rotulos[status] ?? status;
  }
}
