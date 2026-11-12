import { Component, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { StoreService } from '../core/store.service';
import { calcularClassificacao } from '../core/domain';
import { StatusBadgeComponent } from '../shared/status-badge.component';
import { TeamDetailsComponent } from '../shared/team-details.component';
import { moduleConfig, type ModuleKey } from './records.config';
import { RecordFormComponent } from './record-form.component';
import type { Resultado, StatusEdicao } from '../core/models';

@Component({
  selector: 'app-records',
  imports: [FormsModule, NgTemplateOutlet, RouterLink, StatusBadgeComponent, TeamDetailsComponent, RecordFormComponent],
  template: `
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-primary">
          Gestão do campeonato
        </p>
        <h1 class="mt-2 text-3xl font-semibold">{{ config().title }}</h1>
        <p class="mt-2 text-sm text-base-content/60">{{ config().description }}</p>
      </div>
      @if (config().create; as create) {
        @if (store.podeFazer(create.permission)) {
          <button class="btn btn-primary" type="button" (click)="formOpen.set(!formOpen())">
            {{ formOpen() ? 'Fechar formulário' : create.label }}
          </button>
        }
      }
    </div>
    @if (module() === 'modalidades') {
      <div class="mt-5 flex flex-wrap gap-2">
        <a routerLink="/app/criterios" class="btn btn-outline btn-sm">Critérios de pontuação</a
        ><a routerLink="/app/desempates" class="btn btn-outline btn-sm">Critérios de desempate</a>
      </div>
    }
    @if (module() === 'equipes') {
      <a routerLink="/app/participantes" class="btn btn-outline btn-sm mt-5">Participantes</a>
    }
    @if (module() === 'resultados') {
      <a routerLink="/app/disputas" class="btn btn-primary btn-sm mt-5"
        >Lançar pontos em uma disputa</a
      >
    }
    @if (formOpen()) {
      <app-record-form [module]="module()" (saved)="formOpen.set(false)" />
    }
    @if (message(); as msg) {
      <div
        class="mt-5 alert"
        [class.alert-error]="!msg.ok"
        [class.alert-success]="msg.ok"
        role="status"
      >
        {{ msg.erro ?? 'Operação realizada com sucesso.' }}
      </div>
    }
    @if (!allowed()) {
      <div role="alert" class="alert mt-6">
        Seu perfil não tem permissão para consultar este módulo.
      </div>
    } @else {
      @if (module() === 'classificacao') {
        <label class="mt-6 block max-w-lg"
          >Etapa
          <select
            class="select w-full mt-2"
            [ngModel]="stageId()"
            (ngModelChange)="stageId.set(+$event)"
          >
            @for (etapa of store.db().etapas; track etapa.id) {
              <option [ngValue]="etapa.id">
                {{ etapa.nome }} · {{ modalidade(etapa.modalidade_id) }}
              </option>
            }
          </select>
        </label>
      }
      @if (module() === 'interop') {
        <div class="mt-6 rounded-xl border border-base-300 bg-base-100 p-6">
          <p>
            Exporte os snapshots publicados para consultar o contrato de resultados. A integração
            HTTP depende do backend.
          </p>
          <a routerLink="/publico" class="btn btn-outline mt-4">Abrir portal público</a>
        </div>
      }
      <label class="block mt-6 max-w-md"
        ><span class="text-sm">Buscar nesta lista</span
        ><input
          class="input w-full mt-1"
          type="search"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
          placeholder="Digite um nome, status ou código"
      /></label>
      <ng-template #rowActions let-row>
        <div class="flex flex-wrap gap-2">
          @if (
            module() === 'edicoes' &&
            nextStatus(row['status']) &&
            store.podeFazer('edicao.status')
          ) {
            <button class="btn btn-outline btn-sm" (click)="advance(row)">Avançar status</button>
          }
          @if (
            module() === 'inscricoes' &&
            store.podeFazer('inscricao.avaliar') &&
            ['submetida', 'em_analise'].includes(display(row['status']))
          ) {
            <button class="btn btn-success btn-sm" (click)="report(store.avaliarInscricao(number(row['id']), 'aprovada'))">Aprovar</button>
            <button class="btn btn-outline btn-sm" (click)="requestReason('reject', number(row['id']))">Rejeitar</button>
          }
          @if (module() === 'disputas') {
            <a class="btn btn-outline btn-sm" [routerLink]="['/app/pontuar', row['id']]">Pontuação</a>
            @if (
              store.podeFazer('disputa.editar') &&
              !['concluida', 'cancelada', 'wo'].includes(display(row['status']))
            ) {
              <button class="btn btn-primary btn-sm" (click)="report(store.atualizarStatusDisputa(number(row['id']), 'concluida'))">Concluir</button>
            }
          }
          @if (module() === 'publicacao') {
            @if (
              store.podeFazer('homologar') &&
              !['homologada', 'publicada', 'cancelada'].includes(display(row['status']))
            ) {
              <button class="btn btn-outline btn-sm" (click)="report(store.homologarEtapa(number(row['id'])))">Homologar</button>
            }
            @if (store.podeFazer('publicar') && row['status'] === 'homologada') {
              <button class="btn btn-primary btn-sm" (click)="report(store.publicarEtapa(number(row['id'])))">Publicar</button>
            }
            @if (store.podeFazer('retificar') && row['status'] === 'publicada') {
              <button class="btn btn-outline btn-sm" (click)="requestReason('rectify', number(row['id']))">Retificar</button>
            }
          }
          @if (module() === 'interop') {
            <button class="btn btn-outline btn-sm" (click)="download(number(row['id']))">Baixar JSON</button>
          }
          @if (!['edicoes', 'inscricoes', 'etapas', 'disputas', 'publicacao', 'interop'].includes(module())) {
            <span class="text-base-content/40">—</span>
          }
        </div>
      </ng-template>

      <section class="mt-4 grid gap-3 xl:hidden" [attr.aria-label]="'Lista: ' + config().title">
        @for (row of filteredRows(); track row['id']) {
          <article
            class="cursor-pointer rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm transition-colors hover:bg-base-200/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            tabindex="0"
            [attr.aria-label]="'Ver detalhes: ' + config().title + ' — ' + rotuloRegistro(row)"
            (click)="abrirDetalhesDaLinha($event, row)"
            (keydown.enter)="abrirDetalhesDaLinha($event, row)"
            (keydown.space)="abrirDetalhesDaLinha($event, row)"
          >
            <h2 class="break-words text-base font-semibold">{{ rotuloRegistro(row) }}</h2>
            <dl class="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
              @for (column of config().columns; track column.key) {
                <div class="min-w-0">
                  <dt class="text-xs font-medium uppercase tracking-wide text-base-content/55">{{ column.label }}</dt>
                  <dd class="mt-1 break-words text-sm">
                    @if (column.key === 'status') {
                      <app-status-badge [status]="display(row[column.key])" />
                    } @else if (module() === 'equipes' && column.key === 'nome') {
                      <app-team-details [equipeId]="number(row['id'])" [equipeNome]="display(row[column.key])" />
                    } @else if (
                      ['inscricoes', 'participantes', 'resultados', 'classificacao'].includes(module()) &&
                      ['equipe', 'equipe_nome'].includes(column.key) && row['equipe_id'] !== undefined
                    ) {
                      <app-team-details [equipeId]="number(row['equipe_id'])" [equipeNome]="display(row[column.key])" [inscricaoId]="module() === 'inscricoes' ? number(row['id']) : undefined" />
                    } @else if (module() === 'disputas' && column.key === 'confronto') {
                      <div class="flex flex-wrap items-center gap-1">
                        <app-team-details [equipeId]="number(row['equipe_a_id'])" [equipeNome]="equipe(number(row['equipe_a_id']))" />
                        <span aria-hidden="true">×</span>
                        <app-team-details [equipeId]="number(row['equipe_b_id'])" [equipeNome]="equipe(number(row['equipe_b_id']))" />
                      </div>
                    } @else {
                      {{ display(row[column.key]) }}
                    }
                  </dd>
                </div>
              }
            </dl>
            <div class="mt-4 border-t border-base-300 pt-3" (click)="$event.stopPropagation()">
              <ng-container [ngTemplateOutlet]="rowActions" [ngTemplateOutletContext]="{ $implicit: row }" />
            </div>
          </article>
        } @empty {
          <p class="rounded-xl border border-dashed border-base-300 bg-base-100 p-6 text-center text-sm text-base-content/60">Nenhum registro encontrado.</p>
        }
      </section>

      <section
        class="mt-4 hidden max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-base-300 bg-base-100 xl:block"
        role="region"
        [attr.aria-label]="'Tabela: ' + config().title"
        tabindex="0"
      >
        <table class="table">
          <caption class="sr-only">
            {{
              config().title
            }}
          </caption>
          <thead>
            <tr>
              @for (column of config().columns; track column.key) {
                <th scope="col">{{ column.label }}</th>
              }
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            @for (row of filteredRows(); track row['id']) {
              <tr
                class="cursor-pointer hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                tabindex="0"
                [attr.aria-label]="'Ver detalhes: ' + config().title + ' — ' + rotuloRegistro(row)"
                (click)="abrirDetalhesDaLinha($event, row)"
                (keydown.enter)="abrirDetalhesDaLinha($event, row)"
                (keydown.space)="abrirDetalhesDaLinha($event, row)"
              >
                @for (column of config().columns; track column.key) {
                  <td class="max-w-sm whitespace-normal break-words">
                    @if (column.key === 'status') {
                      <app-status-badge [status]="display(row[column.key])" />
                    } @else if (module() === 'disputas' && column.key === 'confronto') {
                      <div class="flex flex-wrap items-center gap-1">
                        <app-team-details [equipeId]="number(row['equipe_a_id'])" [equipeNome]="equipe(number(row['equipe_a_id']))" />
                        <span aria-hidden="true">×</span>
                        <app-team-details [equipeId]="number(row['equipe_b_id'])" [equipeNome]="equipe(number(row['equipe_b_id']))" />
                      </div>
                    } @else if (module() === 'equipes' && column.key === 'nome') {
                      <app-team-details [equipeId]="number(row['id'])" [equipeNome]="display(row[column.key])" />
                    } @else if (
                      ['inscricoes', 'participantes', 'resultados', 'classificacao'].includes(module()) &&
                      ['equipe', 'equipe_nome'].includes(column.key) &&
                      row['equipe_id'] !== undefined
                    ) {
                      <app-team-details
                        [equipeId]="number(row['equipe_id'])"
                        [equipeNome]="display(row[column.key])"
                        [inscricaoId]="module() === 'inscricoes' ? number(row['id']) : undefined"
                      />
                    } @else {
                      {{ display(row[column.key]) }}
                    }
                  </td>
                }
                <td>
                  <div class="flex flex-wrap gap-2">
                    @if (
                      module() === 'edicoes' &&
                      nextStatus(row['status']) &&
                      store.podeFazer('edicao.status')
                    ) {
                      <button class="btn btn-outline btn-xs" (click)="advance(row)">
                        Avançar status
                      </button>
                    }
                    @if (
                      module() === 'inscricoes' &&
                      store.podeFazer('inscricao.avaliar') &&
                      ['submetida', 'em_analise'].includes(display(row['status']))
                    ) {
                      <button
                        class="btn btn-success btn-xs"
                        (click)="report(store.avaliarInscricao(number(row['id']), 'aprovada'))"
                      >
                        Aprovar
                      </button>
                      <button
                        class="btn btn-outline btn-xs"
                        (click)="requestReason('reject', number(row['id']))"
                      >
                        Rejeitar
                      </button>
                    }
                    @if (module() === 'disputas') {
                      <a class="btn btn-outline btn-xs" [routerLink]="['/app/pontuar', row['id']]"
                        >Pontuação</a
                      >
                      @if (
                        store.podeFazer('disputa.editar') &&
                        !['concluida', 'cancelada', 'wo'].includes(display(row['status']))
                      ) {
                        <button
                          class="btn btn-primary btn-xs"
                          (click)="
                            report(store.atualizarStatusDisputa(number(row['id']), 'concluida'))
                          "
                        >
                          Concluir
                        </button>
                      }
                    }
                    @if (module() === 'publicacao') {
                      @if (
                        store.podeFazer('homologar') &&
                        !['homologada', 'publicada', 'cancelada'].includes(display(row['status']))
                      ) {
                        <button
                          class="btn btn-outline btn-xs"
                          (click)="report(store.homologarEtapa(number(row['id'])))"
                        >
                          Homologar
                        </button>
                      }
                      @if (store.podeFazer('publicar') && row['status'] === 'homologada') {
                        <button
                          class="btn btn-primary btn-xs"
                          (click)="report(store.publicarEtapa(number(row['id'])))"
                        >
                          Publicar
                        </button>
                      }
                      @if (store.podeFazer('retificar') && row['status'] === 'publicada') {
                        <button
                          class="btn btn-outline btn-xs"
                          (click)="requestReason('rectify', number(row['id']))"
                        >
                          Retificar
                        </button>
                      }
                    }
                    @if (module() === 'interop') {
                      <button class="btn btn-outline btn-xs" (click)="download(number(row['id']))">
                        Baixar JSON
                      </button>
                    }
                    @if (
                      ![
                        'edicoes',
                        'inscricoes',
                        'etapas',
                        'disputas',
                        'publicacao',
                        'interop',
                      ].includes(module())
                    ) {
                      <span class="text-base-content/40">—</span>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td
                  [attr.colspan]="config().columns.length + 1"
                  class="p-10 text-center text-base-content/60"
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
      <p class="mt-3 text-xs text-base-content/50">
        {{ filteredRows().length }} registro(s) · Dados de demonstração neste navegador.
      </p>
      @if (registroSelecionado(); as registro) {
        <div class="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="titulo-detalhes-registro">
          <div class="modal-box max-h-[90vh] max-w-3xl overflow-y-auto">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-xs font-semibold uppercase tracking-wide text-primary">{{ config().title }}</p>
                <h2 id="titulo-detalhes-registro" class="mt-1 break-words text-2xl font-semibold">{{ rotuloRegistro(registro) }}</h2>
              </div>
              <button class="btn btn-ghost btn-sm shrink-0" type="button" (click)="fecharDetalhesRegistro()">Fechar</button>
            </div>
            @if (editandoRegistro()) {
              <app-record-form [module]="module()" [record]="registro" (saved)="finalizarEdicaoRegistro()" />
            } @else {
              <dl class="mt-5 grid gap-3 sm:grid-cols-2">
                @for (column of config().columns; track column.key) {
                  <div class="min-w-0 rounded-lg bg-base-200 p-4">
                    <dt class="text-xs uppercase tracking-wide text-base-content/55">{{ column.label }}</dt>
                    <dd class="mt-1 break-words font-medium">
                      @if (column.key === 'status') {
                        <app-status-badge [status]="display(registro[column.key])" />
                      } @else {
                        {{ display(registro[column.key]) }}
                      }
                    </dd>
                  </div>
                }
              </dl>
              <div class="mt-5 flex flex-col-reverse gap-2 border-t border-base-300 pt-4 sm:flex-row sm:justify-end">
                @if (podeEditarRegistro()) {
                  <button class="btn btn-primary min-h-11" type="button" (click)="editandoRegistro.set(true)">Editar dados</button>
                } @else {
                  <p class="text-sm text-base-content/60">As alterações deste registro seguem as ações disponíveis na lista.</p>
                }
              </div>
            }
          </div>
          <button class="modal-backdrop" type="button" aria-label="Fechar detalhes do registro" (click)="fecharDetalhesRegistro()"></button>
        </div>
      }
    }
    @if (reasonAction()) {
      <form
        class="mt-5 rounded-xl border border-base-300 bg-base-100 p-5"
        (ngSubmit)="confirmReason()"
      >
        <label class="block font-medium" for="reason">{{
          reasonAction() === 'reject' ? 'Motivo da rejeição' : 'Justificativa da retificação'
        }}</label>
        <textarea
          id="reason"
          class="textarea w-full mt-2"
          name="reason"
          placeholder="Ex.: Os pontos foram corrigidos após a revisão da súmula."
          [(ngModel)]="reason"
          required
        ></textarea>
        <div class="mt-3 flex gap-2">
          <button class="btn btn-primary" type="submit">Confirmar</button
          ><button class="btn btn-ghost" type="button" (click)="reasonAction.set(null)">
            Cancelar
          </button>
        </div>
      </form>
    }
  `,
})
export class RecordsComponent {
  readonly store = inject(StoreService);
  private readonly routeData = toSignal(inject(ActivatedRoute).data);
  readonly module = computed(() => this.routeData()?.['modulo'] as ModuleKey);
  readonly config = computed(() => moduleConfig(this.module()));
  readonly search = signal('');
  readonly registroSelecionadoId = signal<number | null>(null);
  readonly editandoRegistro = signal(false);
  readonly registroSelecionado = computed(() => {
    const id = this.registroSelecionadoId();
    return id === null ? null : this.rows().find((row) => Number(row['id']) === id) ?? null;
  });
  readonly formOpen = signal(false);
  readonly message = signal<Resultado | null>(null);
  readonly stageId = signal(this.store.db().etapas[0]?.id ?? 0);
  readonly reasonAction = signal<'reject' | 'rectify' | null>(null);
  private reasonId = 0;
  reason = '';
  readonly allowed = computed(
    () => !this.config().permission || this.store.podeFazer(this.config().permission!),
  );
  readonly rows = computed<Record<string, unknown>[]>(() => {
    if (!this.allowed()) return [];
    const db = this.store.db();
    if (this.module() === 'classificacao')
      return calcularClassificacao(db, this.stageId()).map((r) => ({ ...r, id: r.equipe_id }));
    const source = this.config().source;
    const items = source ? db[source] : [];
    return items
      .filter(
        (item) => this.module() !== 'interop' || ('status' in item && item.status === 'publicada'),
      )
      .map((item) => {
        const row = { ...item } as Record<string, unknown>;
        if ('equipe_id' in row) row['equipe'] = this.equipe(Number(row['equipe_id']));
        if ('escola_id' in row)
          row['escola'] = db.escolas.find((e) => e.id === row['escola_id'])?.nome;
        if ('modalidade_id' in row)
          row['modalidade'] = this.modalidade(Number(row['modalidade_id']));
        if ('etapa_id' in row) row['etapa'] = db.etapas.find((e) => e.id === row['etapa_id'])?.nome;
        if ('disputa_id' in row)
          row['disputa'] = db.disputas.find((d) => d.id === row['disputa_id'])?.codigo;
        if ('equipe_a_id' in row)
          row['confronto'] =
            `${this.equipe(Number(row['equipe_a_id']))} × ${this.equipe(Number(row['equipe_b_id']))}`;
        return row;
      });
  });
  readonly filteredRows = computed(() => {
    const query = this.search().toLocaleLowerCase('pt-BR');
    return this.rows().filter((row) =>
      this.config().columns.some((c) =>
        this.display(row[c.key]).toLocaleLowerCase('pt-BR').includes(query),
      ),
    );
  });
  constructor() {
    effect(() => {
      this.module();
      this.formOpen.set(false);
      this.search.set('');
      this.message.set(null);
      this.reasonAction.set(null);
      this.registroSelecionadoId.set(null);
      this.editandoRegistro.set(false);
    });
  }
  display(value: unknown): string {
    return value === null || value === undefined
      ? '—'
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  }
  number(value: unknown): number {
    return Number(value);
  }
  rotuloRegistro(row: Record<string, unknown>): string {
    const titulo = row['nome'] ?? row['titulo'] ?? row['equipe'] ?? row['codigo'] ?? row['identificador_publico'] ?? row['id'];
    return this.display(titulo);
  }
  abrirDetalhesDaLinha(event: Event, row: Record<string, unknown>): void {
    if (event instanceof KeyboardEvent) event.preventDefault();
    const elemento = event.target;
    if (!(elemento instanceof HTMLElement) || elemento.closest('button, a, input, select, textarea')) return;
    if (this.module() === 'equipes') {
      const linha = event.currentTarget;
      if (linha instanceof HTMLElement) linha.querySelector<HTMLButtonElement>('app-team-details button')?.click();
      return;
    }
    this.registroSelecionadoId.set(Number(row['id']));
    this.editandoRegistro.set(false);
  }
  fecharDetalhesRegistro(): void {
    this.registroSelecionadoId.set(null);
    this.editandoRegistro.set(false);
  }
  finalizarEdicaoRegistro(): void {
    this.fecharDetalhesRegistro();
    this.message.set({ ok: true, erro: 'Registro atualizado.' });
  }
  podeEditarRegistro(): boolean {
    const permissao: Partial<Record<ModuleKey, string>> = {
      edicoes: 'edicao.editar',
      modalidades: 'modalidade.editar',
      criterios: 'criterio.editar',
      desempates: 'criterio.editar',
      escolas: 'escola.editar',
      equipes: 'equipe.editar',
      participantes: 'equipe.editar',
      etapas: 'etapa.editar',
    };
    const chave = permissao[this.module()];
    return !!chave && this.store.podeFazer(chave);
  }
  equipe(id: number): string {
    return this.store.db().equipes.find((e) => e.id === id)?.nome ?? '—';
  }
  abrirEquipeDaLinha(event: Event): void {
    if (this.module() !== 'equipes') return;
    if (event instanceof KeyboardEvent) event.preventDefault();
    const elemento = event.target;
    if (!(elemento instanceof HTMLElement) || elemento.closest('button, a, input, select, textarea')) return;
    const linha = event.currentTarget;
    if (linha instanceof HTMLElement) linha.querySelector<HTMLButtonElement>('app-team-details button')?.click();
  }
  modalidade(id: number): string {
    return this.store.db().modalidades.find((m) => m.id === id)?.nome ?? '—';
  }
  report(result: Resultado): void {
    this.message.set(result);
  }
  nextStatus(value: unknown): StatusEdicao | undefined {
    const flow: StatusEdicao[] = ['planejada', 'inscricoes', 'em_andamento', 'encerrada'];
    const index = flow.indexOf(value as StatusEdicao);
    return index >= 0 ? flow[index + 1] : undefined;
  }
  advance(row: Record<string, unknown>): void {
    const status = this.nextStatus(row['status']);
    if (status) this.report(this.store.mudarStatusEdicao(Number(row['id']), status));
  }
  requestReason(action: 'reject' | 'rectify', id: number): void {
    this.reasonId = id;
    this.reason = '';
    this.reasonAction.set(action);
  }
  confirmReason(): void {
    if (!this.reason.trim()) return;
    if (this.reasonAction() === 'reject')
      this.report(this.store.avaliarInscricao(this.reasonId, 'rejeitada', this.reason));
    else {
      const pub = this.store
        .db()
        .publicacoes.filter((p) => p.etapa_id === this.reasonId && p.status === 'publicada')
        .sort((a, b) => b.versao - a.versao)[0];
      if (pub) {
        const result = this.store.reabrirEtapa(pub.id, this.reason);
        this.report(
          result.ok
            ? {
                ok: true,
                erro: 'Etapa reaberta. Corrija os pontos, conclua as disputas e homologue novamente para publicar a próxima versão.',
              }
            : result,
        );
      }
    }
    this.reasonAction.set(null);
  }
  download(id: number): void {
    const snapshot = this.store
      .db()
      .publicacoes.find((p) => p.id === id && p.status === 'publicada')?.snapshot;
    if (!snapshot) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `resultado-v${snapshot.versao}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
