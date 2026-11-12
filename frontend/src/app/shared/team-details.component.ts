import { Component, computed, inject, input, signal } from '@angular/core';
import { StoreService } from '../core/store.service';
import type { Equipe } from '../core/models';
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

          @if (store.podeFazer('equipe.editar')) {
            <section class="mt-5 rounded-xl border border-base-300 p-4">
              @if (!editando()) {
                <button class="btn btn-outline btn-sm" type="button" (click)="iniciarEdicao(item)">Editar dados da equipe</button>
              } @else {
                <h3 class="text-lg font-semibold">Editar equipe</h3>
                <div class="mt-3 grid gap-3">
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Nome da equipe</span>
                    <input class="input input-bordered w-full" [value]="nomeEdicao()" (input)="nomeEdicao.set(valorDo($event))" />
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Escola</span>
                    <select class="select select-bordered w-full" [value]="escolaEdicao()" (change)="escolaEdicao.set(+valorDo($event))">
                      @for (escola of store.db().escolas; track escola.id) {
                        <option [value]="escola.id">{{ escola.nome }}</option>
                      }
                    </select>
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Edição</span>
                    <select class="select select-bordered w-full" [value]="edicaoEdicao()" (change)="edicaoEdicao.set(+valorDo($event))">
                      @for (edicao of store.db().edicoes; track edicao.id) {
                        <option [value]="edicao.id">{{ edicao.nome }}</option>
                      }
                    </select>
                  </label>
                  @if (erroEdicao()) { <p role="alert" class="text-sm text-error">{{ erroEdicao() }}</p> }
                  <div class="flex flex-wrap justify-end gap-2">
                    <button class="btn btn-ghost" type="button" (click)="editando.set(false)">Cancelar</button>
                    <button class="btn btn-primary" type="button" (click)="salvarEdicao()">Salvar alterações</button>
                  </div>
                </div>
              }
            </section>
          }

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
  readonly store = inject(StoreService);
  readonly equipeId = input.required<number>();
  readonly equipeNome = input('');
  readonly inscricaoId = input<number | undefined>();
  readonly classe = input('text-left font-medium text-base-content transition-colors hover:text-primary focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary');
  readonly aberto = signal(false);
  readonly editando = signal(false);
  readonly nomeEdicao = signal('');
  readonly escolaEdicao = signal(0);
  readonly edicaoEdicao = signal(0);
  readonly erroEdicao = signal('');
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

  valorDo(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  iniciarEdicao(item: { equipe: Equipe }): void {
    this.nomeEdicao.set(item.equipe.nome);
    this.escolaEdicao.set(item.equipe.escola_id);
    this.edicaoEdicao.set(item.equipe.edicao_id);
    this.erroEdicao.set('');
    this.editando.set(true);
  }

  salvarEdicao(): void {
    const resultado = this.store.atualizarRegistroDemo('equipes', this.equipeId(), {
      nome: this.nomeEdicao(),
      escola_id: String(this.escolaEdicao()),
      edicao_id: String(this.edicaoEdicao()),
    });
    if (!resultado.ok) {
      this.erroEdicao.set(resultado.erro ?? 'Não foi possível salvar as alterações.');
      return;
    }
    this.erroEdicao.set('');
    this.editando.set(false);
  }
}
