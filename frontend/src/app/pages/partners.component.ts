import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import type { Parceria, Resultado } from '../core/models';

@Component({
  selector: 'app-partners',
  imports: [FormsModule, RouterLink, CurrencyPipe],
  template: `
    <header>
      <p class="text-sm font-semibold text-primary">PARCERIAS DO CAMPEONATO</p>
      <h1 class="mt-2 text-3xl font-semibold">Área da empresa apoiadora</h1>
      <p class="mt-2 text-base-content/60">
        Bem-vinda, {{ store.usuario()?.organizacao || store.usuario()?.nome }}.
      </p>
    </header>

    @if (mensagem()) {
      <p class="alert mt-5 max-w-5xl" [class.alert-error]="!resultado()?.ok" [class.alert-success]="resultado()?.ok" role="status">
        {{ mensagem() }}
      </p>
    }

    <div class="mt-6 grid min-w-0 gap-5 xl:grid-cols-2">
      <section class="rounded-2xl border border-base-300 bg-base-100 p-5 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">Novo apoio</p>
            <h2 class="mt-1 text-xl font-semibold">O que sua empresa vai doar?</h2>
          </div>
          <span class="badge badge-outline">{{ propostas().length }} proposta(s)</span>
        </div>
        <p class="mt-2 text-sm leading-6 text-base-content/65">
          Apoio financeiro pode ser registrado diretamente na demonstração. Materiais, serviços e outros apoios seguem para análise da organização.
        </p>

        <form class="mt-5 grid gap-4" (submit)="enviar($event)">
          <label class="form-control w-full">
            <span class="label-text mb-1 font-medium">Tipo de doação</span>
              <select class="select select-bordered w-full" required [value]="tipoApoio()" (change)="selecionarTipoApoio($event)">
              <option value="financeiro">Apoio financeiro</option>
              <option value="materiais">Materiais ou equipamentos</option>
              <option value="servicos">Serviços ou infraestrutura</option>
              <option value="outro">Outro tipo de apoio</option>
            </select>
          </label>

          @if (tipoApoio() === 'financeiro') {
            <label class="form-control w-full">
              <span class="label-text mb-1 font-medium">Valor que pretende doar (R$)</span>
              <input class="input input-bordered w-full" type="number" min="1" step="0.01" required placeholder="Ex.: 2500" [value]="valor()" (input)="valor.set(valorDo($event))" />
            </label>
          }

          <label class="form-control w-full">
            <span class="label-text mb-1 font-medium">Descreva a doação</span>
            <textarea class="textarea textarea-bordered w-full" rows="5" required placeholder="Ex.: Descreva o item ou serviço, a quantidade e as condições da doação." [value]="descricao()" (input)="descricao.set(valorDo($event))"></textarea>
          </label>
          @if (tipoApoio() === 'financeiro') {
            <button class="btn btn-primary min-h-11 w-full" type="button" (click)="abrirCheckoutDemo()">Contribuir agora</button>
          } @else {
            <button class="btn btn-primary min-h-11 w-full" type="submit">Enviar proposta à organização</button>
          }

          @if (checkoutAberto()) {
            <div class="rounded-xl border border-primary/30 bg-primary/5 p-4" aria-labelledby="checkout-titulo">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-primary">Prévia de checkout</p>
                  <h3 id="checkout-titulo" class="mt-1 font-semibold">Contribuição financeira</h3>
                </div>
                <span class="badge badge-outline">Demonstração</span>
              </div>
              <p class="mt-3 text-2xl font-bold">{{ valorNumerico() | currency: 'BRL' }}</p>
              <p class="mt-2 text-sm leading-5 text-base-content/70">{{ descricao() }}</p>
              <p class="mt-3 rounded-lg bg-base-100 p-3 text-xs leading-5 text-base-content/65">
                Este protótipo não se conecta à Stripe e não processa pagamentos nem dados de cartão. A confirmação abaixo registra apenas uma simulação local.
              </p>
              <div class="mt-3 grid gap-2 sm:grid-cols-2">
                <button class="btn btn-primary min-h-11" type="button" (click)="confirmarContribuicaoDemo()">Confirmar simulação</button>
                <button class="btn btn-ghost min-h-11" type="button" (click)="checkoutAberto.set(false)">Voltar e editar</button>
              </div>
            </div>
          }
        </form>
      </section>

      <section aria-labelledby="titulo-previa">
        <h2 id="titulo-previa" class="text-xl font-semibold">Prévia da proposta</h2>
        <article class="mt-4 rounded-2xl border border-primary/30 bg-base-100 p-5 shadow-sm sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-primary">Apoio ao campeonato</p>
              <h3 class="mt-1 break-words text-lg font-semibold">{{ store.usuario()?.organizacao || 'Sua empresa' }}</h3>
            </div>
            @if (tipoApoio() === 'financeiro') {
              <span class="badge badge-info badge-outline">Contribuição direta · demonstração</span>
            } @else {
              <span class="badge badge-warning badge-outline">Aguardando análise</span>
            }
          </div>
          <div class="mt-5 rounded-lg bg-base-200 p-4">
            <p class="text-xs uppercase tracking-wide text-base-content/55">Tipo de apoio</p>
            <p class="mt-1 font-semibold">{{ rotuloTipo(tipoApoio()) }}</p>
          </div>
          @if (tipoApoio() === 'financeiro' && valor()) {
            <div class="mt-3 rounded-lg bg-base-200 p-4">
            <p class="text-xs uppercase tracking-wide text-base-content/55">Valor da contribuição</p>
              <p class="mt-1 text-xl font-semibold">{{ valorNumerico() | currency: 'BRL' }}</p>
            </div>
          }
          <div class="mt-3 rounded-lg border border-base-300 p-4">
            <p class="text-xs uppercase tracking-wide text-base-content/55">O que será doado</p>
            <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
              {{ descricao() || 'A descrição da sua doação aparecerá aqui.' }}
            </p>
          </div>
          <p class="mt-4 text-xs leading-5 text-base-content/60">
            @if (tipoApoio() === 'financeiro') {
              A contribuição de demonstração será registrada diretamente, sem análise. Nenhuma cobrança real será feita.
            } @else {
              Após o envio, a proposta aparecerá abaixo como “Em análise” até a organização avaliá-la.
            }
          </p>
        </article>
      </section>
    </div>

    <section class="mt-8 max-w-5xl" aria-labelledby="titulo-propostas">
      <h2 id="titulo-propostas" class="text-xl font-semibold">Apoios e propostas</h2>
      <div class="mt-4 grid gap-3">
        @for (proposta of propostas(); track proposta.id) {
          <article class="rounded-xl border border-base-300 bg-base-100 p-4 sm:p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="font-semibold">{{ rotuloTipo(proposta.tipo_apoio ?? 'financeiro') }}</h3>
                <p class="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-base-content/70">
                  {{ proposta.descricao_doacao || proposta.mensagem }}
                </p>
                @if ((proposta.valor_proposto ?? 0) > 0) {
                  <p class="mt-2 font-semibold">{{ proposta.valor_proposto | currency: 'BRL' }}</p>
                }
              </div>
              <span class="badge badge-outline">{{ rotuloStatus(proposta.status) }}</span>
            </div>
          </article>
        } @empty {
          <p class="rounded-xl border border-dashed border-base-300 bg-base-100 p-5 text-sm text-base-content/65">
            Suas propostas enviadas aparecerão aqui.
          </p>
        }
      </div>
    </section>

    <a class="btn btn-outline mt-6" routerLink="/publico">Consultar resultados públicos</a>
  `,
})
export class PartnersComponent {
  readonly store = inject(StoreService);
  readonly tipoApoio = signal<NonNullable<Parceria['tipo_apoio']>>('financeiro');
  readonly valor = signal('');
  readonly valorNumerico = computed(() => Number(this.valor()));
  readonly descricao = signal('');
  readonly checkoutAberto = signal(false);
  readonly mensagem = signal('');
  readonly resultado = signal<Resultado | null>(null);
  readonly propostas = computed(() => {
    const usuarioId = this.store.usuario()?.id;
    return this.store.db().parcerias.filter((item) => item.usuario_id === usuarioId);
  });

  valorDo(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  selecionarTipoApoio(event: Event): void {
    this.tipoApoio.set(this.valorDo(event) as TipoApoio);
    this.checkoutAberto.set(false);
  }

  abrirCheckoutDemo(): void {
    if (!Number.isFinite(this.valorNumerico()) || this.valorNumerico() <= 0 || !this.descricao().trim()) {
      this.resultado.set({ ok: false });
      this.mensagem.set('Informe o valor e a finalidade da contribuição para continuar.');
      return;
    }
    this.resultado.set(null);
    this.mensagem.set('');
    this.checkoutAberto.set(true);
  }

  confirmarContribuicaoDemo(): void {
    const result = this.store.registrarContribuicaoDemo({
      descricao_doacao: this.descricao(),
      valor_proposto: this.valorNumerico(),
    });
    this.resultado.set(result);
    this.mensagem.set(result.ok
      ? 'Contribuição de demonstração registrada. Nenhuma cobrança foi feita.'
      : result.erro ?? 'Não foi possível registrar a contribuição de demonstração.');
    this.checkoutAberto.set(false);
    if (result.ok) {
      this.descricao.set('');
      this.valor.set('');
    }
  }

  rotuloTipo(tipo: NonNullable<Parceria['tipo_apoio']>): string {
    return ({
      financeiro: 'Apoio financeiro',
      materiais: 'Materiais ou equipamentos',
      servicos: 'Serviços ou infraestrutura',
      outro: 'Outro tipo de apoio',
    } as Record<string, string>)[tipo] ?? tipo;
  }

  rotuloStatus(status: string): string {
    return ({ em_analise: 'Em análise', aprovada: 'Aprovada', recusada: 'Não aprovada', contribuicao_demo: 'Contribuição simulada' } as Record<string, string>)[status] ?? status;
  }

  enviar(event: Event): void {
    event.preventDefault();
    if (this.tipoApoio() === 'financeiro') {
      this.abrirCheckoutDemo();
      return;
    }
    const result = this.store.criarPropostaApoio({
      tipo_apoio: this.tipoApoio(),
      descricao_doacao: this.descricao(),
      valor_proposto: Number(this.valor()),
    });
    this.resultado.set(result);
    this.mensagem.set(result.ok ? 'Proposta enviada para análise da organização.' : result.erro ?? 'Não foi possível enviar a proposta.');
    if (result.ok) {
      this.descricao.set('');
      this.valor.set('');
    }
  }
}

type TipoApoio = NonNullable<Parceria['tipo_apoio']>;
