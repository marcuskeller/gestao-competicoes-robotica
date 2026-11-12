import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { IconComponent } from '../shared/icon.component';
import type { Parceria, Resultado } from '../core/models';

@Component({
  selector: 'app-partners',
  imports: [FormsModule, RouterLink, CurrencyPipe, IconComponent],
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
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">Novo apoio</p>
          <h2 class="mt-1 text-xl font-semibold">O que sua empresa vai doar?</h2>
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
            <span class="label-text mb-1 font-medium">{{ tipoApoio() === 'financeiro' ? 'Mensagem (opcional)' : 'Descreva a doação' }}</span>
            <textarea class="textarea textarea-bordered w-full" rows="5" [required]="tipoApoio() !== 'financeiro'" [placeholder]="tipoApoio() === 'financeiro' ? 'Ex.: Mensagem opcional sobre a contribuição.' : 'Ex.: Descreva o item ou serviço, a quantidade e as condições da doação.'" [value]="descricao()" (input)="descricao.set(valorDo($event))"></textarea>
          </label>
          @if (tipoApoio() === 'financeiro') {
            <button class="btn btn-primary min-h-11 w-full" type="button" (click)="abrirCheckoutDemo()">Contribuir agora</button>
          } @else {
            <button class="btn btn-primary min-h-11 w-full" type="submit">Enviar proposta à organização</button>
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
          @if (descricao().trim()) {
            <div class="mt-3 rounded-lg border border-base-300 p-4">
              <p class="text-xs uppercase tracking-wide text-base-content/55">O que será doado</p>
              <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{{ descricao() }}</p>
            </div>
          }
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

    @if (checkoutAberto()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-base-200" role="dialog" aria-modal="true" aria-labelledby="checkout-titulo">
        <header class="sticky top-0 z-10 border-b border-base-300 bg-base-100/95 backdrop-blur">
          <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
            <button class="btn btn-ghost btn-sm" type="button" (click)="voltarDaTelaPagamento()">
              <app-icon nome="arrow" classe="size-4 rotate-180" />
              Voltar
            </button>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-primary">Checkout de demonstração</p>
              <h2 id="checkout-titulo" class="truncate font-semibold">Contribuição financeira</h2>
            </div>
            <span class="badge badge-outline ml-auto">Sem cobrança real</span>
          </div>
        </header>

        <main class="mx-auto grid max-w-6xl gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:p-8">
          <section class="rounded-2xl border border-base-300 bg-base-100 p-5 sm:p-6">
            <h3 class="text-lg font-semibold">Escolha a forma de pagamento</h3>
            <p class="mt-1 text-sm text-base-content/65">Selecione Pix, boleto ou cartão.</p>

            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              @for (opcao of formasPagamento; track opcao.valor) {
                <button
                  class="flex min-h-28 flex-col items-start justify-between gap-3 rounded-xl border p-4 text-left transition hover:border-primary hover:bg-primary/5"
                  [class.border-primary]="formaPagamento() === opcao.valor"
                  [class.bg-primary/5]="formaPagamento() === opcao.valor"
                  [class.border-base-300]="formaPagamento() !== opcao.valor"
                  [attr.aria-pressed]="formaPagamento() === opcao.valor"
                  type="button"
                  (click)="selecionarFormaPagamento(opcao.valor)"
                >
                  <app-icon [nome]="opcao.icone" classe="size-5 text-primary" />
                  <span>
                    <span class="block font-semibold">{{ opcao.titulo }}</span>
                    <span class="mt-1 block text-xs text-base-content/60">{{ opcao.descricao }}</span>
                  </span>
                </button>
              }
            </div>

            @if (formaPagamento(); as forma) {
              <div class="mt-5 rounded-xl border border-base-300 bg-base-200/60 p-4 sm:p-5">
                @switch (forma) {
                  @case ('pix') {
                    <div class="flex items-start gap-3">
                      <app-icon nome="qrcode" classe="mt-0.5 size-5 text-primary" />
                      <div>
                        <h4 class="font-semibold">Pagamento por Pix</h4>
                        <p class="mt-1 text-sm text-base-content/65">Na versão real, um QR Code e um código Pix serão gerados para esta contribuição.</p>
                      </div>
                    </div>
                    <div class="mt-4 grid min-h-32 place-items-center rounded-lg border border-dashed border-base-300 bg-base-100 p-4 text-center">
                      <div>
                        <app-icon nome="qrcode" classe="mx-auto size-12 text-base-content/40" />
                        <p class="mt-2 text-xs font-medium text-base-content/60">QR Code ilustrativo · não pagável</p>
                      </div>
                    </div>
                  }
                  @case ('boleto') {
                    <div class="flex items-start gap-3">
                      <app-icon nome="barcode" classe="mt-0.5 size-5 text-primary" />
                      <div>
                        <h4 class="font-semibold">Pagamento por boleto</h4>
                        <p class="mt-1 text-sm text-base-content/65">Na versão real, o boleto será emitido com vencimento e linha digitável.</p>
                      </div>
                    </div>
                    <div class="mt-4 rounded-lg border border-base-300 bg-base-100 p-4">
                      <div class="flex items-center justify-between gap-3 text-xs text-base-content/60">
                        <span>Boleto demonstrativo</span><span>Não pagável</span>
                      </div>
                      <app-icon nome="barcode" classe="mt-4 h-10 w-full text-base-content/70" />
                      <p class="mt-2 break-all font-mono text-xs text-base-content/60">00000.00000 00000.000000 00000.000000 0 00000000000000</p>
                    </div>
                  }
                  @case ('cartao') {
                    <div class="flex items-start gap-3">
                      <app-icon nome="creditcard" classe="mt-0.5 size-5 text-primary" />
                      <div>
                        <h4 class="font-semibold">Pagamento por cartão</h4>
                        <p class="mt-1 text-sm text-base-content/65">Escolha crédito ou débito. Nenhum dado de cartão é solicitado nesta demonstração.</p>
                      </div>
                    </div>
                    <div class="mt-4 grid gap-2 sm:grid-cols-2">
                      <button class="btn min-h-11" [class.btn-primary]="tipoCartao() === 'credito'" [class.btn-outline]="tipoCartao() !== 'credito'" type="button" (click)="tipoCartao.set('credito')">Crédito</button>
                      <button class="btn min-h-11" [class.btn-primary]="tipoCartao() === 'debito'" [class.btn-outline]="tipoCartao() !== 'debito'" type="button" (click)="tipoCartao.set('debito')">Débito</button>
                    </div>
                    <div class="mt-4 rounded-lg border border-base-300 bg-base-100 p-4">
                      <div>
                        <h5 class="text-sm font-semibold">Dados do cartão <span class="font-normal text-base-content/55">(opcionais)</span></h5>
                        <p class="mt-1 text-xs leading-5 text-base-content/60">Use apenas dados fictícios. Estes campos não são enviados nem salvos e não são necessários para a simulação.</p>
                      </div>
                      <div class="mt-4 grid gap-3">
                        <label class="form-control w-full">
                          <span class="label-text mb-1 text-sm font-medium">Nome impresso no cartão</span>
                          <input class="input input-bordered w-full" type="text" autocomplete="off" placeholder="Ex.: NOME SOBRENOME" [value]="nomeTitularCartao()" (input)="nomeTitularCartao.set(valorDo($event))" />
                        </label>
                        <label class="form-control w-full">
                          <span class="label-text mb-1 text-sm font-medium">Número do cartão</span>
                          <input class="input input-bordered w-full" type="text" inputmode="numeric" autocomplete="off" maxlength="23" placeholder="Ex.: 0000 0000 0000 0000" [value]="numeroCartao()" (input)="numeroCartao.set(valorDo($event))" />
                        </label>
                        <div class="grid gap-3 sm:grid-cols-2">
                          <label class="form-control w-full">
                            <span class="label-text mb-1 text-sm font-medium">Validade</span>
                            <input class="input input-bordered w-full" type="text" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="Ex.: MM/AA" [value]="validadeCartao()" (input)="validadeCartao.set(valorDo($event))" />
                          </label>
                          <label class="form-control w-full">
                            <span class="label-text mb-1 text-sm font-medium">Código de segurança</span>
                            <input class="input input-bordered w-full" type="text" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="Ex.: 000" [value]="codigoSegurancaCartao()" (input)="codigoSegurancaCartao.set(valorDo($event))" />
                          </label>
                        </div>
                      </div>
                    </div>
                  }
                }

                <button class="btn btn-primary mt-5 min-h-11 w-full" type="button" (click)="confirmarContribuicaoDemo()">
                  Simular contribuição de {{ valorNumerico() | currency: 'BRL' }}
                </button>
              </div>
            }
          </section>

          <aside class="h-fit rounded-2xl border border-base-300 bg-base-100 p-5 sm:p-6">
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">Resumo da contribuição</p>
            <h3 class="mt-2 break-words text-lg font-semibold">{{ store.usuario()?.organizacao || store.usuario()?.nome }}</h3>
            @if (descricao().trim()) {
              <p class="mt-1 text-sm leading-5 text-base-content/65">{{ descricao() }}</p>
            }
            <div class="mt-5 flex items-center justify-between gap-3 border-t border-base-200 pt-4">
              <span class="text-sm text-base-content/65">Total demonstrativo</span>
              <strong class="text-xl">{{ valorNumerico() | currency: 'BRL' }}</strong>
            </div>
          </aside>
        </main>
      </div>
    }

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
                @if (proposta.metodo_pagamento) {
                  <p class="mt-1 text-xs text-base-content/60">Forma: {{ rotuloMetodoPagamento(proposta.metodo_pagamento) }}</p>
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
  readonly formasPagamento = [
    { valor: 'pix', titulo: 'Pix', descricao: 'QR Code ou código Pix', icone: 'qrcode' },
    { valor: 'boleto', titulo: 'Boleto', descricao: 'Boleto bancário', icone: 'barcode' },
    { valor: 'cartao', titulo: 'Cartão', descricao: 'Crédito ou débito', icone: 'creditcard' },
  ] as const;
  readonly tipoApoio = signal<NonNullable<Parceria['tipo_apoio']>>('financeiro');
  readonly valor = signal('');
  readonly valorNumerico = computed(() => Number(this.valor()));
  readonly descricao = signal('');
  readonly checkoutAberto = signal(false);
  readonly formaPagamento = signal<FormaPagamentoTela | null>(null);
  readonly tipoCartao = signal<'credito' | 'debito'>('credito');
  readonly nomeTitularCartao = signal('');
  readonly numeroCartao = signal('');
  readonly validadeCartao = signal('');
  readonly codigoSegurancaCartao = signal('');
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
    this.formaPagamento.set(null);
    this.limparDadosCartao();
  }

  abrirCheckoutDemo(): void {
    if (!Number.isFinite(this.valorNumerico()) || this.valorNumerico() <= 0) {
      this.resultado.set({ ok: false });
      this.mensagem.set('Informe um valor válido para a contribuição.');
      return;
    }
    this.resultado.set(null);
    this.mensagem.set('');
    this.formaPagamento.set(null);
    this.tipoCartao.set('credito');
    this.limparDadosCartao();
    this.checkoutAberto.set(true);
  }

  selecionarFormaPagamento(forma: FormaPagamentoTela): void {
    this.formaPagamento.set(forma);
    if (forma !== 'cartao') this.limparDadosCartao();
  }

  voltarDaTelaPagamento(): void {
    this.checkoutAberto.set(false);
    this.formaPagamento.set(null);
    this.limparDadosCartao();
  }

  confirmarContribuicaoDemo(): void {
    const forma = this.formaPagamento();
    if (!forma) return;
    const metodoPagamento: NonNullable<Parceria['metodo_pagamento']> = forma === 'cartao'
      ? `cartao_${this.tipoCartao()}`
      : forma;
    const result = this.store.registrarContribuicaoDemo({
      descricao_doacao: this.descricao(),
      valor_proposto: this.valorNumerico(),
      metodo_pagamento: metodoPagamento,
    });
    this.resultado.set(result);
    this.mensagem.set(result.ok
      ? 'Contribuição de demonstração registrada. Nenhuma cobrança foi feita.'
      : result.erro ?? 'Não foi possível registrar a contribuição de demonstração.');
    this.checkoutAberto.set(false);
    this.formaPagamento.set(null);
    this.limparDadosCartao();
    if (result.ok) {
      this.descricao.set('');
      this.valor.set('');
    }
  }

  private limparDadosCartao(): void {
    this.nomeTitularCartao.set('');
    this.numeroCartao.set('');
    this.validadeCartao.set('');
    this.codigoSegurancaCartao.set('');
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

  rotuloMetodoPagamento(metodo?: NonNullable<Parceria['metodo_pagamento']>): string {
    return ({
      pix: 'Pix',
      boleto: 'Boleto',
      cartao_credito: 'Cartão de crédito',
      cartao_debito: 'Cartão de débito',
    } as Record<string, string>)[metodo ?? ''] ?? '';
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
type FormaPagamentoTela = 'pix' | 'boleto' | 'cartao';
