import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { publicacoesPublicadas } from '../core/domain';
import { IconComponent } from '../shared/icon.component';
import type { LinhaSnapshot, SnapshotPublicacao } from '../core/models';

@Component({
  selector: 'app-public',
  imports: [RouterLink, IconComponent],
  template: `
    <main class="min-h-dvh bg-base-200 p-6 sm:p-10">
      <div class="mx-auto max-w-5xl">
        <a [routerLink]="rotaRetorno()" class="btn btn-ghost mb-6">
          <app-icon nome="arrow" classe="size-4 rotate-180" />
          {{ rotuloRetorno() }}
        </a>
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
                      <tr class="cursor-pointer hover:bg-base-200" tabindex="0" [attr.aria-label]="'Ver resultado da equipe ' + linha.equipe" (click)="abrirDetalhesResultado(linha, snapshot, $event)" (keydown.enter)="abrirDetalhesResultado(linha, snapshot, $event)" (keydown.space)="abrirDetalhesResultado(linha, snapshot, $event)">
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
      @if (resultadoSelecionado(); as detalhe) {
        <div class="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="titulo-detalhe-resultado">
          <div class="modal-box max-w-xl">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-primary">Resultado publicado · v{{ detalhe.snapshot.versao }}</p>
                <h2 id="titulo-detalhe-resultado" class="mt-1 text-2xl font-semibold">{{ detalhe.linha.equipe }}</h2>
              </div>
              <button class="btn btn-ghost btn-sm" type="button" (click)="resultadoSelecionado.set(null)">Fechar</button>
            </div>
            <dl class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-lg bg-base-200 p-4"><dt class="text-xs uppercase tracking-wide text-base-content/55">Etapa</dt><dd class="mt-1 font-medium">{{ detalhe.snapshot.etapa.nome }}</dd></div>
              <div class="rounded-lg bg-base-200 p-4"><dt class="text-xs uppercase tracking-wide text-base-content/55">Modalidade</dt><dd class="mt-1 font-medium">{{ detalhe.snapshot.etapa.modalidade }}</dd></div>
              <div class="rounded-lg bg-base-200 p-4"><dt class="text-xs uppercase tracking-wide text-base-content/55">Posição</dt><dd class="mt-1 font-medium">{{ detalhe.linha.posicao }}</dd></div>
              <div class="rounded-lg bg-base-200 p-4"><dt class="text-xs uppercase tracking-wide text-base-content/55">Escola</dt><dd class="mt-1 font-medium">{{ detalhe.linha.escola }}</dd></div>
              <div class="rounded-lg bg-base-200 p-4"><dt class="text-xs uppercase tracking-wide text-base-content/55">Pontos</dt><dd class="mt-1 text-xl font-semibold">{{ detalhe.linha.pontos_finais }}</dd></div>
              <div class="rounded-lg bg-base-200 p-4"><dt class="text-xs uppercase tracking-wide text-base-content/55">Vitórias</dt><dd class="mt-1 font-medium">{{ detalhe.linha.vitorias }}</dd></div>
            </dl>
          </div>
          <button class="modal-backdrop" type="button" aria-label="Fechar detalhes do resultado" (click)="resultadoSelecionado.set(null)"></button>
        </div>
      }
    </main>
  `,
})
export class PublicComponent {
  private readonly store = inject(StoreService);
  readonly publicacoes = computed(() => publicacoesPublicadas(this.store.db()));
  readonly resultadoSelecionado = signal<{ linha: LinhaSnapshot; snapshot: SnapshotPublicacao } | null>(null);

  abrirDetalhesResultado(linha: LinhaSnapshot, snapshot: SnapshotPublicacao, event: Event): void {
    if (event instanceof KeyboardEvent) event.preventDefault();
    this.resultadoSelecionado.set({ linha, snapshot });
  }
  readonly rotaRetorno = computed(() => {
    switch (this.store.usuario()?.tipo_conta) {
      case 'empresa': return '/app/parceiros';
      case 'participante': return '/app/participante';
      case 'voluntario': return '/app/voluntario';
      case 'administrador': return '/app/dashboard';
      default: return '/login';
    }
  });
  readonly rotuloRetorno = computed(() => {
    switch (this.store.usuario()?.tipo_conta) {
      case 'empresa': return 'Voltar às contribuições';
      case 'participante': return 'Voltar à minha conta';
      case 'voluntario': return 'Voltar ao voluntariado';
      case 'administrador': return 'Voltar à organização';
      default: return 'Acessar a organização';
    }
  });
}
