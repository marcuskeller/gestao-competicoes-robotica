import { Component, computed, inject, input, signal } from '@angular/core';
import { StoreService } from '../core/store.service';
import { StatusBadgeComponent } from './status-badge.component';

@Component({
  selector: 'app-team-details',
  imports: [StatusBadgeComponent],
  template: `
    <button
      class="{{ classe() }}"
      type="button"
      [attr.aria-haspopup]="'dialog'"
      (click)="aberto.set(true)"
    >
      {{ nome() }}
    </button>

    @if (aberto() && detalhes(); as item) {
      <div class="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="titulo-detalhes-equipe">
        <div class="modal-box max-h-[90vh] max-w-2xl overflow-y-auto">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-primary">Detalhes da equipe</p>
              <h2 id="titulo-detalhes-equipe" class="mt-1 break-words text-2xl font-semibold">{{ item.equipe.nome }}</h2>
            </div>
            <button class="btn btn-ghost btn-sm shrink-0" type="button" (click)="aberto.set(false)">Fechar</button>
          </div>

          <dl class="mt-5 grid gap-3 rounded-xl bg-base-200 p-4 sm:grid-cols-2">
            <div>
              <dt class="text-xs uppercase tracking-wide text-base-content/60">Escola</dt>
              <dd class="mt-1 break-words font-medium">{{ item.escola }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-base-content/60">Modalidade</dt>
              <dd class="mt-1 break-words font-medium">{{ item.modalidade }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-base-content/60">Situação da equipe</dt>
              <dd class="mt-1"><app-status-badge [status]="item.equipe.status" /></dd>
            </div>
            @if (item.inscricao) {
              <div>
                <dt class="text-xs uppercase tracking-wide text-base-content/60">Inscrição</dt>
                <dd class="mt-1"><app-status-badge [status]="item.inscricao.status" /></dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-base-content/60">Código da inscrição</dt>
                <dd class="mt-1 break-all font-medium">{{ item.inscricao.identificador_publico }}</dd>
              </div>
            }
            @if (item.edicao) {
              <div>
                <dt class="text-xs uppercase tracking-wide text-base-content/60">Edição</dt>
                <dd class="mt-1 font-medium">{{ item.edicao.nome }}</dd>
              </div>
            }
          </dl>

          <section class="mt-6" aria-labelledby="titulo-integrantes-equipe">
            <h3 id="titulo-integrantes-equipe" class="text-lg font-semibold">Integrantes ({{ item.integrantes.length }})</h3>
            @if (item.integrantes.length) {
              <ul class="mt-3 divide-y divide-base-300 rounded-xl border border-base-300">
                @for (integrante of item.integrantes; track integrante.id) {
                  <li class="flex flex-wrap items-center justify-between gap-2 p-4">
                    <span class="font-medium">{{ integrante.nome }}</span>
                    <span class="text-sm text-base-content/65">{{ papel(integrante.papel) }} · {{ integrante.serie || 'Série não informada' }}</span>
                  </li>
                }
              </ul>
            } @else {
              <p class="mt-3 rounded-xl border border-dashed border-base-300 p-4 text-sm text-base-content/65">
                Nenhum integrante foi cadastrado para esta equipe.
              </p>
            }
          </section>
        </div>
        <button class="modal-backdrop" type="button" aria-label="Fechar detalhes da equipe" (click)="aberto.set(false)"></button>
      </div>
    }
  `,
})
export class TeamDetailsComponent {
  private readonly store = inject(StoreService);
  readonly equipeId = input.required<number>();
  readonly equipeNome = input('');
  readonly inscricaoId = input<number | undefined>();
  readonly classe = input('link link-primary text-left');
  readonly aberto = signal(false);
  readonly nome = computed(
    () => this.equipeNome() || this.store.db().equipes.find((item) => item.id === this.equipeId())?.nome || 'Equipe',
  );
  readonly detalhes = computed(() => {
    const db = this.store.db();
    const equipe = db.equipes.find((item) => item.id === this.equipeId());
    if (!equipe) return null;
    const inscricaoId = this.inscricaoId();
    const inscricao = (inscricaoId ? db.inscricoes.find((item) => item.id === inscricaoId) : undefined)
      ?? db.inscricoes.find((item) => item.equipe_id === equipe.id);
    const modalidadeId = inscricao?.modalidade_id ?? equipe.modalidade_id;
    return {
      equipe,
      inscricao,
      escola: db.escolas.find((item) => item.id === equipe.escola_id)?.nome ?? 'Escola não informada',
      modalidade: db.modalidades.find((item) => item.id === modalidadeId)?.nome ?? 'Modalidade não informada',
      edicao: db.edicoes.find((item) => item.id === equipe.edicao_id),
      integrantes: db.participantes.filter((item) => item.equipe_id === equipe.id),
    };
  });

  papel(papel: string): string {
    const rotulos: Record<string, string> = {
      capitao: 'Capitão/Capitã',
      integrante: 'Integrante',
      tecnico: 'Técnico(a)',
    };
    return rotulos[papel] ?? papel;
  }
}
