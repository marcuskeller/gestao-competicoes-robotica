import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { StatCardComponent } from '../shared/stat-card.component';

@Component({
  selector: 'app-overview',
  imports: [RouterLink, StatCardComponent],
  template: `
    <header class="min-w-0">
      <p class="text-sm font-semibold text-primary">CAMPEONATO JOINVILENSE DE ROBÓTICA</p>
      <h1 class="mt-2 text-3xl font-semibold">Visão geral</h1>
      <p class="mt-2 max-w-2xl text-base-content/60">
        Acompanhe inscrições, disputas e resultados oficiais em um só lugar.
      </p>
    </header>

    <section aria-label="Indicadores da edição" class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <app-stat-card rotulo="Equipes" [valor]="resumo().equipes" icone="users" />
      <app-stat-card rotulo="Inscrições pendentes" [valor]="resumo().inscricoesPendentes" icone="clipboard" />
      <app-stat-card rotulo="Disputas em aberto" [valor]="resumo().disputasAbertas" icone="flag" />
      <app-stat-card rotulo="Resultados publicados" [valor]="resumo().resultadosPublicados" icone="globe" />
    </section>

    <section class="mt-8 rounded-2xl border border-base-300 bg-base-100 p-4 sm:p-6">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">Fluxo principal</p>
          <h2 class="mt-1 text-xl font-semibold sm:text-2xl">Jornada da competição</h2>
          <p class="mt-1 text-sm text-base-content/60">
            Do cadastro das equipes à divulgação de resultados conferidos.
          </p>
        </div>
        <a class="btn btn-primary mt-2 w-full sm:mt-0 sm:w-auto" routerLink="/app/disputas">
          Abrir disputas
        </a>
      </div>

      <div class="mt-5 grid min-w-0 gap-3 md:grid-cols-3">
        <a
          routerLink="/app/inscricoes"
          class="rounded-xl border border-base-300 p-4 transition-colors hover:bg-base-200 focus-visible:outline-primary"
        >
          <span class="badge badge-outline">01 · Participação</span>
          <h3 class="mt-3 font-semibold">Revisar inscrições</h3>
          <p class="mt-1 text-sm text-base-content/60">
            Confira equipes inscritas e aprove as que atendem às regras.
          </p>
          <p class="mt-3 text-sm font-medium text-primary">
            {{ resumo().inscricoesPendentes }} pendente(s)
          </p>
        </a>

        <a
          routerLink="/app/disputas"
          class="rounded-xl border border-base-300 p-4 transition-colors hover:bg-base-200 focus-visible:outline-primary"
        >
          <span class="badge badge-outline">02 · Competição</span>
          <h3 class="mt-3 font-semibold">Acompanhar disputas</h3>
          <p class="mt-1 text-sm text-base-content/60">
            Registre a súmula por critério e acompanhe a classificação calculada.
          </p>
          <p class="mt-3 text-sm font-medium text-primary">
            {{ resumo().disputasAbertas }} disputa(s) em aberto
          </p>
        </a>

        <a
          routerLink="/app/publicacao"
          class="rounded-xl border border-base-300 p-4 transition-colors hover:bg-base-200 focus-visible:outline-primary"
        >
          <span class="badge badge-outline">03 · Resultado oficial</span>
          <h3 class="mt-3 font-semibold">Homologar resultados</h3>
          <p class="mt-1 text-sm text-base-content/60">
            Confira a etapa antes de publicar a versão oficial para o público.
          </p>
          <p class="mt-3 text-sm font-medium text-primary">
            {{ resumo().resultadosPublicados }} resultado(s) publicado(s)
          </p>
        </a>
      </div>
      <p class="mt-4 rounded-lg bg-info/10 p-3 text-sm text-base-content/70">
        A classificação só se torna resultado público depois da homologação e publicação.
      </p>
    </section>

    <section class="mt-7 rounded-2xl border border-base-300 bg-base-100 p-4 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold">Etapas da edição</h2>
          <p class="mt-1 text-sm text-base-content/60">Acompanhe o andamento de cada modalidade.</p>
        </div>
        <a class="btn btn-ghost btn-sm" routerLink="/app/etapas">Ver etapas</a>
      </div>
      <div class="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
        @for (etapa of resumo().etapas; track etapa.id) {
          <a
            routerLink="/app/etapas"
            class="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-base-300 p-4 hover:bg-base-200"
          >
            <span class="min-w-0 truncate font-medium">{{ etapa.nome }}</span>
            <span class="badge badge-outline shrink-0">{{ statusEtapa(etapa.status) }}</span>
          </a>
        } @empty {
          <p class="rounded-lg bg-base-200 p-4 text-sm text-base-content/60">
            Ainda não há etapas para esta edição. Consulte as etapas para começar.
          </p>
        }
      </div>
    </section>
  `,
})
export class OverviewComponent {
  readonly store = inject(StoreService);

  readonly resumo = computed(() => {
    const db = this.store.db();
    const edicaoId = this.store.edicaoAtiva()?.id;
    const etapas = db.etapas.filter((etapa) => etapa.edicao_id === edicaoId);
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
