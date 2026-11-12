import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../core/store.service';
import { DatePickerComponent } from '../shared/date-picker.component';
import type { ModuleKey } from './records.config';
import type { CampoDesempate, Escola, Participante, Resultado } from '../core/models';

interface Field {
  key: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
}
const EXEMPLOS: Record<string, string> = {
  nome: 'Ex.: Nome do cadastro',
  ano: 'Ex.: 2026',
  numero: 'Ex.: 7',
  tema: 'Ex.: Tema do campeonato',
  local: 'Ex.: Local do evento',
  data_inicio: 'Ex.: 09/11/2026',
  data_fim: 'Ex.: 13/11/2026',
  slug: 'Ex.: seguidor-de-linha',
  descricao: 'Ex.: Descreva a modalidade ou critério.',
  min_integrantes: 'Ex.: 2',
  max_integrantes: 'Ex.: 4',
  peso: 'Ex.: 3',
  titulo: 'Ex.: Título do regulamento',
  conteudo: 'Ex.: Descreva as regras e orientações.',
  municipio: 'Ex.: Joinville',
  uf: 'Ex.: SC',
  serie: 'Ex.: 8º ano',
};
const field = (key: string, label: string, type = 'text'): Field => ({
  key,
  label,
  type,
  placeholder: EXEMPLOS[key],
});
const options = (key: string, label: string, values: string[]): Field => ({
  key,
  label,
  options: values.map((value) => ({ value, label: value.replaceAll('_', ' ') })),
});

@Component({
  selector: 'app-record-form',
  imports: [FormsModule, DatePickerComponent],
  template: `
    <form class="mt-6 rounded-xl border border-base-300 bg-base-100 p-6" (ngSubmit)="submit()">
      <h2 class="text-lg font-semibold">{{ record() ? 'Editar registro' : 'Adicionar registro' }}</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        @for (f of fields(); track f.key) {
          <label class="block text-sm" [for]="'field-' + f.key"
            >{{ f.label }}
            @if (f.options) {
              <select
                class="select w-full mt-1"
                [id]="'field-' + f.key"
                [name]="f.key"
                [(ngModel)]="values[f.key]"
                required
              >
                <option value="" disabled>Selecione uma opção</option>
                @for (option of f.options; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            } @else if (f.type === 'textarea') {
              <textarea
                class="textarea w-full mt-1"
                [id]="'field-' + f.key"
                [name]="f.key"
                [(ngModel)]="values[f.key]"
                [placeholder]="f.placeholder"
                required
              ></textarea>
            } @else if (f.type === 'date') {
              <app-date-picker
                class="mt-1 block"
                [id]="'field-' + f.key"
                [label]="f.label"
                [value]="values[f.key] ?? ''"
                (valueChange)="values[f.key] = $event"
              />
            } @else {
              <input
                class="input w-full mt-1"
                [id]="'field-' + f.key"
                [name]="f.key"
                [type]="f.type ?? 'text'"
                [(ngModel)]="values[f.key]"
                [placeholder]="f.placeholder"
                [attr.min]="f.type === 'number' ? 0 : null"
                [attr.step]="f.type === 'number' ? 'any' : null"
                required
              />
            }
            @if (f.type === 'date') {
              <span class="label-text-alt mt-1">Formato: dia/mês/ano · {{ f.placeholder }}</span>
            }
          </label>
        }
      </div>
      @if (error()) {
        <p role="alert" class="mt-4 text-error">{{ error() }}</p>
      }
      <button class="btn btn-primary mt-5" type="submit">{{ record() ? 'Salvar alterações' : 'Salvar' }}</button>
    </form>
  `,
})
export class RecordFormComponent {
  readonly store = inject(StoreService);
  readonly module = input.required<ModuleKey>();
  readonly record = input<Record<string, unknown> | null>(null);
  readonly saved = output<void>();
  readonly error = signal('');
  values: Record<string, string> = {};
  constructor() {
    effect(() => {
      const record = this.record();
      if (!record) return;
      this.values = Object.fromEntries(
        this.fields().map((field) => [field.key, String(record[field.key] ?? '')]),
      );
    });
  }
  readonly fields = computed<Field[]>(() => {
    const db = this.store.db();
    const select = (
      key: string,
      label: string,
      entries: { id: number; nome: string }[],
    ): Field => ({
      key,
      label,
      options: entries.map((e) => ({ value: String(e.id), label: e.nome })),
    });
    const edicao = select('edicao_id', 'Edição', db.edicoes);
    const modalidade = select('modalidade_id', 'Modalidade', db.modalidades);
    const nome = field('nome', 'Nome');
    switch (this.module()) {
      case 'edicoes':
        return [
          nome,
          field('ano', 'Ano', 'number'),
          field('numero', 'Número da edição', 'number'),
          field('tema', 'Tema'),
          field('local', 'Local'),
          field('data_inicio', 'Início', 'date'),
          field('data_fim', 'Fim', 'date'),
          ...(this.record() ? [{
            key: 'status',
            label: 'Status',
            options: [
              { value: 'planejada', label: 'Planejada' },
              { value: 'inscricoes', label: 'Inscri\u00e7\u00f5es abertas' },
              { value: 'em_andamento', label: 'Em andamento' },
              { value: 'encerrada', label: 'Encerrada' },
              { value: 'cancelada', label: 'Cancelada' },
            ],
          }] : []),
        ];
      case 'modalidades':
        return [
          edicao,
          nome,
          field('slug', 'Identificador (slug)'),
          field('descricao', 'Descrição', 'textarea'),
          options('tipo', 'Tipo', ['individual', 'dupla', 'equipe']),
          field('min_integrantes', 'Mínimo de integrantes', 'number'),
          field('max_integrantes', 'Máximo de integrantes', 'number'),
        ];
      case 'criterios':
        return [modalidade, nome, field('descricao', 'Descrição'), field('peso', 'Peso', 'number')];
      case 'desempates':
        return [
          modalidade,
          nome,
          options('campo', 'Campo', ['pontos_finais', 'penalidades', 'vitorias', 'saldo', 'tempo']),
          options('direcao', 'Ordenação', ['asc', 'desc']),
        ];
      case 'regras':
        return [
          edicao,
          modalidade,
          field('titulo', 'Título'),
          field('conteudo', 'Conteúdo', 'textarea'),
        ];
      case 'escolas':
        return [
          nome,
          options('rede', 'Rede', ['municipal', 'estadual', 'federal', 'privada']),
          field('municipio', 'Município'),
          field('uf', 'UF'),
        ];
      case 'equipes':
        return [edicao, select('escola_id', 'Escola', db.escolas), nome];
      case 'participantes':
        return [
          select('equipe_id', 'Equipe', db.equipes),
          nome,
          options('papel', 'Papel', ['capitao', 'integrante', 'tecnico']),
          field('serie', 'Série'),
        ];
      case 'inscricoes':
        return [select('equipe_id', 'Equipe', db.equipes), modalidade];
      case 'etapas':
        return [
          modalidade,
          nome,
          options('tipo', 'Tipo', ['grupos']),
          field('data_inicio', 'Início', 'date'),
          field('data_fim', 'Fim', 'date'),
        ];
      default:
        return [];
    }
  });
  submit(): void {
    const v = this.values;
    if (this.fields().some((f) => !String(v[f.key] ?? '').trim())) {
      this.error.set('Preencha todos os campos.');
      return;
    }
    if (v['data_inicio'] && v['data_fim'] < v['data_inicio']) {
      this.error.set('A data final deve ser igual ou posterior à inicial.');
      return;
    }
    const record = this.record();
    if (record) {
      const result = this.store.atualizarRegistroDemo(this.module(), Number(record['id']), v);
      if (result.ok) this.saved.emit();
      else this.error.set(result.erro ?? 'Não foi possível atualizar.');
      return;
    }
    const n = (key: string) => Number(v[key]);
    const nome = v['nome']?.trim();
    const modalidadeId = n('modalidade_id');
    const edicaoId = n('edicao_id');
    const modalidade = this.store.db().modalidades.find((m) => m.id === modalidadeId);
    if (this.module() === 'regras' && modalidade?.edicao_id !== edicaoId) {
      this.error.set('Escolha uma modalidade da edição selecionada.');
      return;
    }
    let result: Resultado;
    switch (this.module()) {
      case 'edicoes':
        result = this.store.criarEdicao({
          nome,
          ano: n('ano'),
          numero: n('numero'),
          tema: v['tema'],
          local: v['local'],
          data_inicio: v['data_inicio'],
          data_fim: v['data_fim'],
        });
        break;
      case 'modalidades':
        result = this.store.criarModalidade({
          nome,
          edicao_id: edicaoId,
          slug: v['slug'],
          descricao: v['descricao'],
          tipo: v['tipo'] as 'individual' | 'dupla' | 'equipe',
          min_integrantes: n('min_integrantes'),
          max_integrantes: n('max_integrantes'),
        });
        break;
      case 'criterios':
        result = this.store.criarCriterioPontuacao({
          nome,
          modalidade_id: modalidadeId,
          descricao: v['descricao'],
          peso: n('peso'),
        });
        break;
      case 'desempates':
        result = this.store.criarCriterioDesempate({
          nome,
          modalidade_id: modalidadeId,
          campo: v['campo'] as CampoDesempate,
          direcao: v['direcao'] as 'asc' | 'desc',
        });
        break;
      case 'regras':
        result = this.store.publicarRegra({
          edicao_id: edicaoId,
          modalidade_id: modalidadeId,
          titulo: v['titulo'],
          conteudo: v['conteudo'],
        });
        break;
      case 'escolas':
        result = this.store.criarEscola({
          nome,
          rede: v['rede'] as Escola['rede'],
          municipio: v['municipio'],
          uf: v['uf'].toUpperCase(),
        });
        break;
      case 'equipes':
        result = this.store.criarEquipe({ nome, edicao_id: edicaoId, escola_id: n('escola_id') });
        break;
      case 'participantes':
        result = this.store.criarParticipante({
          nome,
          equipe_id: n('equipe_id'),
          papel: v['papel'] as Participante['papel'],
          serie: v['serie'],
        });
        break;
      case 'inscricoes':
        result = this.store.submeterInscricao(n('equipe_id'), modalidadeId);
        break;
      case 'etapas':
        result = this.store.criarEtapa({
          nome,
          modalidade_id: modalidadeId,
          edicao_id: modalidade?.edicao_id ?? 0,
          tipo: 'grupos',
          data_inicio: v['data_inicio'],
          data_fim: v['data_fim'],
        });
        break;
      default:
        return;
    }
    if (result.ok) this.saved.emit();
    else this.error.set(result.erro ?? 'Não foi possível salvar.');
  }
}
