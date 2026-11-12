import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { publicacoesPublicadas } from '../core/domain';

@Component({
  selector: 'app-public',
  imports: [RouterLink],
  template: `
    <main class="min-h-dvh bg-base-200 p-6 sm:p-10">
      <div class="mx-auto max-w-5xl">
        <a routerLink="/login" class="btn btn-ghost mb-6">← Área da organização</a>
        <h1 class="text-3xl font-semibold">Resultados públicos</h1>
        <p class="mt-3 mb-8 text-base-content/60">
          Campeonato Joinvilense de Robótica · Resultados homologados e publicados. Dados de
          demonstração.
        </p>
        @for (publicacao of publicacoes(); track publicacao.id) {
          @if (publicacao.snapshot; as snapshot) {
            <section class="mb-6 rounded-xl border border-base-300 bg-base-100 p-6">
              <h2 class="text-xl font-semibold">
                {{ snapshot.etapa.modalidade }} · {{ snapshot.etapa.nome }}
              </h2>
              <p class="mt-2 text-sm text-base-content/60">Versão {{ snapshot.versao }}</p>
              <div
                class="mt-4 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x"
                role="region"
                aria-label="Tabela de classificação"
                tabindex="0"
              >
                <table class="table">
                  <thead>
                    <tr>
                      <th>Posição</th>
                      <th>Equipe</th>
                      <th>Escola</th>
                      <th>Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (linha of snapshot.classificacao; track $index) {
                      <tr>
                        <td>{{ linha.posicao }}</td>
                        <td>{{ linha.equipe }}</td>
                        <td>{{ linha.escola }}</td>
                        <td>{{ linha.pontos_finais }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }
        } @empty {
          <p class="rounded-xl border border-base-300 bg-base-100 p-8">
            Nenhum resultado publicado até o momento.
          </p>
        }
      </div>
    </main>
  `,
})
export class PublicComponent {
  private readonly store = inject(StoreService);
  readonly publicacoes = computed(() => publicacoesPublicadas(this.store.db()));
}
