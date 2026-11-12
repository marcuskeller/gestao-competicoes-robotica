import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { TeamDetailsComponent } from '../shared/team-details.component';
import type { Resultado } from '../core/models';

@Component({
  selector: 'app-scoring',
  imports: [FormsModule, RouterLink, TeamDetailsComponent],
  template: `
    <a routerLink="/app/disputas" class="btn btn-ghost btn-sm mb-5">← Disputas</a>
    @if (match(); as disputa) {
      <h1 class="text-3xl font-semibold">Pontuação · {{ disputa.codigo }}</h1>
      <p class="mt-2 text-base-content/60">
        Lance os valores de cada critério. Total = soma dos valores × pesos − penalidades.
      </p>
      @if (locked()) {
        <div class="alert mt-5">
          Etapa homologada ou publicada. A homologação deve ser reaberta com justificativa antes de
          corrigir os pontos.
        </div>
      }
      @if (message(); as msg) {
        <div
          class="alert mt-5"
          [class.alert-error]="!msg.ok"
          [class.alert-success]="msg.ok"
          role="status"
        >
          {{ msg.erro ?? 'Pontuação salva. Após registrar as duas equipes, conclua a disputa.' }}
        </div>
      }
      <div class="grid gap-6 mt-6 lg:grid-cols-2">
        @for (id of [disputa.equipe_a_id, disputa.equipe_b_id]; track id) {
          <form class="rounded-xl border border-base-300 bg-base-100 p-6" (ngSubmit)="save(id)">
            <h2><app-team-details [equipeId]="id" [equipeNome]="team(id)" classe="link link-primary text-left text-xl font-semibold" /></h2>
            <fieldset
              [disabled]="locked() || !store.podeFazer('resultado.lancar')"
              class="mt-4 grid gap-4"
            >
              @for (criterio of criteria(); track criterio.id) {
                <label class="block text-sm" [for]="'score-' + id + '-' + criterio.id"
                  >{{ criterio.nome }}
                  <span class="text-base-content/50">· Peso {{ criterio.peso }}</span>
                  <input
                    class="input w-full mt-1"
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="Ex.: 10"
                    [id]="'score-' + id + '-' + criterio.id"
                    [name]="'criterion-' + criterio.id"
                    [(ngModel)]="scores[id][criterio.id]"
                  />
                </label>
              } @empty {
                <p class="text-warning">Cadastre critérios de pontuação para esta modalidade.</p>
              }
              <label class="block text-sm" [for]="'penalty-' + id"
                >Penalidades<input
                  class="input w-full mt-1"
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="Ex.: 0"
                  [id]="'penalty-' + id"
                  name="penalidades"
                  [(ngModel)]="penalties[id]"
              /></label>
              <label class="block text-sm" [for]="'note-' + id"
                >Observação<textarea
                  class="textarea w-full mt-1"
                  [id]="'note-' + id"
                  name="observacao"
                  placeholder="Ex.: A equipe saiu da pista na segunda tentativa."
                  [(ngModel)]="notes[id]"
                ></textarea>
              </label>
              <p class="text-lg font-semibold">Total: {{ total(id) }}</p>
              <button class="btn btn-primary" type="submit" [disabled]="!criteria().length">
                Salvar pontuação
              </button>
            </fieldset>
          </form>
        }
      </div>
      @if (!store.podeFazer('resultado.lancar')) {
        <p class="mt-5 text-sm">
          Seu perfil permite consultar os pontos. Use o perfil Mesário para lançá-los.
        </p>
      }
      @if (!locked() && store.podeFazer('disputa.editar')) {
        <button type="button" class="btn btn-primary mt-6" (click)="finish()">
          Concluir disputa
        </button>
      }
    } @else {
      <h1 class="text-2xl font-semibold">Disputa não encontrada</h1>
    }
  `,
})
export class ScoringComponent {
  readonly store = inject(StoreService);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly match = computed(() => this.store.db().disputas.find((d) => d.id === this.id));
  readonly stage = computed(() =>
    this.store.db().etapas.find((e) => e.id === this.match()?.etapa_id),
  );
  readonly locked = computed(
    () =>
      ['homologada', 'publicada', 'cancelada'].includes(this.stage()?.status ?? '') ||
      ['cancelada', 'wo'].includes(this.match()?.status ?? ''),
  );
  readonly criteria = computed(() =>
    this.store
      .db()
      .criteriosPontuacao.filter((c) => c.modalidade_id === this.stage()?.modalidade_id && c.ativo)
      .sort((a, b) => a.ordem - b.ordem),
  );
  readonly message = signal<Resultado | null>(null);
  scores: Record<number, Record<number, number>> = {};
  penalties: Record<number, number> = {};
  notes: Record<number, string> = {};
  constructor() {
    const db = this.store.db();
    const match = this.match();
    for (const id of match ? [match.equipe_a_id, match.equipe_b_id] : []) {
      const result = db.resultados.find((r) => r.disputa_id === this.id && r.equipe_id === id);
      this.scores[id] = Object.fromEntries(
        this.criteria().map((c) => [
          c.id,
          db.pontuacoesCriterio.find(
            (p) => p.resultado_disputa_id === result?.id && p.criterio_pontuacao_id === c.id,
          )?.valor ?? 0,
        ]),
      );
      this.penalties[id] = result?.penalidades ?? 0;
      this.notes[id] = result?.observacao ?? '';
    }
  }
  team(id: number): string {
    return this.store.db().equipes.find((e) => e.id === id)?.nome ?? 'Equipe';
  }
  total(id: number): number {
    return (
      this.criteria().reduce((sum, c) => sum + Number(this.scores[id][c.id] ?? 0) * c.peso, 0) -
      Number(this.penalties[id] ?? 0)
    );
  }
  save(id: number): void {
    this.message.set(
      this.store.lancarResultado(this.id, id, {
        valores: this.scores[id],
        penalidades: this.penalties[id],
        observacao: this.notes[id],
      }),
    );
  }
  finish(): void {
    this.message.set(this.store.atualizarStatusDisputa(this.id, 'concluida'));
  }
}
