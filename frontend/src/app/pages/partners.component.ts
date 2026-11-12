import { Component, inject } from '@angular/core';
import { computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';

@Component({
  selector: 'app-partners',
  imports: [RouterLink, CurrencyPipe],
  template: `
    <header>
      <p class="text-sm font-semibold text-primary">PARCERIAS DO CAMPEONATO</p>
      <h1 class="mt-2 text-3xl font-semibold">Área da empresa apoiadora</h1>
      <p class="mt-2 text-base-content/60">
        Bem-vinda, {{ store.usuario()?.organizacao || store.usuario()?.nome }}.
      </p>
    </header>

    <section class="mt-7 max-w-3xl rounded-2xl border border-base-300 bg-base-100 p-5 sm:p-7">
      <span class="badge badge-secondary badge-outline">Conta de demonstração</span>
      <h2 class="mt-4 text-xl font-semibold">Apoio ao Campeonato Joinvilense de Robótica</h2>
      <p class="mt-2 text-sm leading-6 text-base-content/70">
        O campeonato reúne estudantes, voluntários e parceiros para promover aprendizagem prática
        em robótica nas escolas de Joinville.
      </p>
      @if (parceria(); as proposta) {
        <dl class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg bg-base-200 p-4">
            <dt class="text-xs uppercase tracking-wide text-base-content/60">Apoio financeiro proposto</dt>
            <dd class="mt-1 text-lg font-semibold">{{ proposta.valor_proposto | currency: 'BRL' }}</dd>
          </div>
          <div class="rounded-lg bg-base-200 p-4">
            <dt class="text-xs uppercase tracking-wide text-base-content/60">Situação</dt>
            <dd class="mt-1 font-semibold">{{ rotuloStatus(proposta.status) }}</dd>
          </div>
        </dl>
        <p class="mt-3 text-sm text-base-content/65">{{ proposta.mensagem }}</p>
      } @else {
        <p class="mt-4 rounded-lg bg-base-200 p-4 text-sm leading-6 text-base-content/70">
          Ainda não há uma proposta de apoio registrada para esta conta.
        </p>
      }
      <p class="mt-4 rounded-lg bg-warning/10 p-4 text-sm leading-6 text-base-content/70">
        Esta demonstração registra a proposta para análise da organização. Não processa pagamentos,
        cobranças ou prestação de contas.
      </p>
      <a class="btn btn-primary mt-5 w-full sm:w-auto" routerLink="/publico">
        Consultar resultados públicos
      </a>
    </section>
  `,
})
export class PartnersComponent {
  readonly store = inject(StoreService);

  readonly parceria = computed(() => {
    const usuarioId = this.store.usuario()?.id;
    return this.store.db().parcerias.find((item) => item.usuario_id === usuarioId);
  });

  rotuloStatus(status: string): string {
    return ({ em_analise: 'Em análise', aprovada: 'Aprovada', recusada: 'Não aprovada' } as Record<string, string>)[status] ?? status;
  }
}
