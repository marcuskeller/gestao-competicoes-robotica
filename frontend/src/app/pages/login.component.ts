import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { PERFIS } from '../core/permissions';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <main class="grid min-h-dvh place-items-center bg-base-200 p-6 grid-pattern">
      <section class="w-full max-w-lg rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm">
        <span class="badge badge-primary badge-outline">Campeonato Joinvilense de Robótica</span>
        <h1 class="mt-6 text-3xl font-semibold">Arena Robótica</h1>
        <p class="mt-3 text-base-content/65">
          Acompanhe equipes, disputas e resultados em um só lugar.
        </p>
        <h2 class="mt-8 text-sm font-semibold">Entrar na demonstração</h2>
        <p class="mt-1 mb-4 text-sm text-base-content/60">
          Escolha um perfil. Esta demonstração usa dados fictícios salvos neste navegador.
        </p>
        <div class="grid gap-3">
          @for (usuario of store.db().usuarios; track usuario.id) {
            @if (usuario.ativo) {
              <button
                type="button"
                class="btn btn-outline h-auto justify-between py-3 text-left"
                (click)="entrar(usuario.email)"
              >
                <span>{{ usuario.nome }}</span><span class="text-xs opacity-65">{{
                  perfis[usuario.perfil].rotulo
                }}</span>
              </button>
            }
          }
        </div>
        @if (erro()) {
          <p role="alert" class="mt-4 text-error">{{ erro() }}</p>
        }
        <a class="btn btn-ghost mt-6 w-full" routerLink="/publico"
          >Consultar resultados públicos →</a
        >
      </section>
    </main>
  `,
})
export class LoginComponent {
  readonly store = inject(StoreService);
  private readonly router = inject(Router);
  readonly perfis = PERFIS;
  readonly erro = signal('');

  entrar(email: string): void {
    const resultado = this.store.entrar(email);
    if (resultado.ok) void this.router.navigate(['/app/dashboard']);
    else this.erro.set(resultado.erro ?? 'Não foi possível entrar.');
  }
}
