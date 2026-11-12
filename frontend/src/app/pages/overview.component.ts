import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { StatCardComponent } from '../shared/stat-card.component';

@Component({
  selector: 'app-overview',
  imports: [RouterLink, StatCardComponent],
  template: `
    <p class="text-sm text-primary font-semibold">PAINEL DA COMPETIÇÃO</p>
    <h1 class="mt-2 text-3xl font-semibold">Visão geral</h1>
    <p class="mt-2 text-base-content/60">
      {{ store.edicaoAtiva()?.nome }} · Acompanhe a operação do campeonato.
    </p>
    <div class="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <app-stat-card rotulo="Equipes" [valor]="store.db().equipes.length" icone="users" />
      <app-stat-card rotulo="Escolas" [valor]="store.db().escolas.length" icone="school" />
      <app-stat-card rotulo="Modalidades" [valor]="store.db().modalidades.length" icone="layers" />
      <app-stat-card rotulo="Disputas" [valor]="store.db().disputas.length" icone="flag" />
    </div>
    <section class="mt-8 rounded-xl border border-base-300 bg-base-100 p-6">
      <h2 class="text-lg font-semibold">Explore o campeonato</h2>
      <p class="mt-2 text-sm text-base-content/60">
        Consulte os dados de demonstração usando os módulos do menu.
      </p>
      <div class="mt-5 flex flex-wrap gap-3">
        <a class="btn btn-primary" routerLink="/app/disputas">Ver disputas</a>
        <a class="btn btn-outline" routerLink="/app/classificacao">Ver classificação</a>
        <a class="btn btn-outline" routerLink="/app/inscricoes">Ver inscrições</a>
      </div>
    </section>
    <section class="mt-7 rounded-xl border border-base-300 bg-base-100 p-6">
      <h2 class="text-lg font-semibold">Etapas do campeonato</h2>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        @for (etapa of store.db().etapas; track etapa.id) {
          <a
            routerLink="/app/etapas"
            class="flex items-center justify-between gap-4 rounded-lg border border-base-300 p-4 hover:bg-base-200"
          >
            <span class="font-medium">{{ etapa.nome }}</span><span class="badge badge-outline">{{
              etapa.status
            }}</span>
          </a>
        } @empty {
          <p>Nenhuma etapa cadastrada.</p>
        }
      </div>
    </section>
  `,
})
export class OverviewComponent {
  readonly store = inject(StoreService);
}
