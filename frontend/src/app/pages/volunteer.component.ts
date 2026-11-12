import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';

@Component({
  selector: 'app-volunteer',
  imports: [RouterLink],
  template: `
    <header>
      <p class="text-sm font-semibold text-primary">ÁREA DO VOLUNTARIADO</p>
      <h1 class="mt-2 text-3xl font-semibold">Visão geral</h1>
      <p class="mt-2 text-base-content/60">Olá, {{ store.usuario()?.nome }}.</p>
    </header>

    <section class="mt-7 max-w-3xl rounded-2xl border border-base-300 bg-base-100 p-5 sm:p-7">
      <h2 class="text-xl font-semibold">Sua atuação no campeonato</h2>
      @if (inscricao(); as candidatura) {
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg bg-base-200 p-4">
            <p class="text-xs uppercase tracking-wide text-base-content/60">Cargo</p>
            <p class="mt-1 font-semibold">{{ candidatura.cargo?.nome ?? 'Cargo indisponível' }}</p>
            <p class="mt-1 text-sm text-base-content/65">{{ candidatura.cargo?.descricao }}</p>
          </div>
          <div class="rounded-lg bg-base-200 p-4">
            <p class="text-xs uppercase tracking-wide text-base-content/60">Inscrição</p>
            <p class="mt-1 font-semibold">{{ rotuloStatus(candidatura.inscricao.status) }}</p>
            <p class="mt-1 text-sm text-base-content/65">Disponibilidade: {{ candidatura.inscricao.disponibilidade }}</p>
          </div>
        </div>
      } @else {
        <p class="mt-3 rounded-lg bg-info/10 p-4 text-sm leading-6">
          Seu perfil está criado. A organização pode atribuir um cargo e liberar acessos de operação.
        </p>
      }

      <h3 class="mt-6 font-semibold">Acessos liberados</h3>
      <div class="mt-3 flex flex-wrap gap-2">
        @if (store.podeFazer('disputa.ver')) {
          <a class="btn btn-outline btn-sm" routerLink="/app/disputas">Disputas</a>
        }
        @if (store.podeFazer('resultado.lancar')) {
          <a class="btn btn-outline btn-sm" routerLink="/app/resultados">Lançar pontos</a>
        }
        @if (store.podeFazer('etapa.ver')) {
          <a class="btn btn-outline btn-sm" routerLink="/app/etapas">Etapas</a>
        }
        @if (!store.podeFazer('disputa.ver') && !store.podeFazer('resultado.lancar') && !store.podeFazer('etapa.ver')) {
          <p class="text-sm text-base-content/60">Aguardando liberação de acessos pela Administração.</p>
        }
      </div>
      <a class="btn btn-ghost mt-4" routerLink="/publico">Ver resultados públicos</a>
    </section>
  `,
})
export class VolunteerComponent {
  readonly store = inject(StoreService);

  readonly inscricao = computed(() => {
    const usuarioId = this.store.usuario()?.id;
    const db = this.store.db();
    const inscricao = db.inscricoesVoluntarios.find((item) => item.usuario_id === usuarioId);
    return inscricao
      ? { inscricao, cargo: db.cargosVoluntarios.find((cargo) => cargo.id === inscricao.cargo_id) }
      : undefined;
  });

  rotuloStatus(status: string): string {
    return ({ pendente: 'Aguardando confirmação', aprovada: 'Aprovada', rejeitada: 'Não aprovada' } as Record<string, string>)[status] ?? status;
  }
}
