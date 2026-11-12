import { Component, computed, inject, signal } from '@angular/core';
import { StoreService } from '../core/store.service';
import type { Resultado } from '../core/models';

@Component({
  selector: 'app-account',
  template: `
    <header>
      <p class="text-sm font-semibold text-primary">PERFIL</p>
      <h1 class="mt-2 text-3xl font-semibold">Minha conta</h1>
      <p class="mt-2 text-base-content/60">Revise e atualize seus dados pessoais e de contato.</p>
    </header>

    @if (mensagem()) {
      <p class="alert mt-5 max-w-3xl" [class.alert-error]="!resultado()?.ok" [class.alert-success]="resultado()?.ok" role="status">
        {{ mensagem() }}
      </p>
    }

    <form class="mt-6 max-w-3xl rounded-2xl border border-base-300 bg-base-100 p-5 sm:p-6" (submit)="salvar($event)">
      <section aria-labelledby="titulo-dados-pessoais">
        <h2 id="titulo-dados-pessoais" class="text-lg font-semibold">Dados pessoais</h2>
        <div class="mt-4 grid gap-4">
          <label class="form-control w-full">
            <span class="label-text mb-1 font-medium">Nome completo</span>
            <input class="input input-bordered w-full" type="text" autocomplete="name" required placeholder="Ex.: Nome Sobrenome" [value]="nome()" (input)="nome.set(valorDo($event))" />
          </label>
          <label class="form-control w-full">
            <span class="label-text mb-1 font-medium">E-mail</span>
            <input class="input input-bordered w-full" type="email" autocomplete="email" required placeholder="Ex.: nome@exemplo.com" [value]="email()" (input)="email.set(valorDo($event))" />
          </label>
          <label class="form-control w-full">
            <span class="label-text mb-1 font-medium">Telefone de contato</span>
            <input class="input input-bordered w-full" type="tel" autocomplete="tel" placeholder="Ex.: (00) 00000-0000" [value]="telefone()" (input)="telefone.set(valorDo($event))" />
          </label>

          @if (contaVoluntario()) {
            <label class="form-control w-full">
              <span class="label-text mb-1 font-medium">CPF</span>
              <input class="input input-bordered w-full" type="text" inputmode="numeric" autocomplete="off" placeholder="Ex.: 000.000.000-00" [value]="cpf()" (input)="cpf.set(valorDo($event))" />
            </label>
          }
        </div>
      </section>

      @if (contaInstitucional()) {
        <section class="mt-7 border-t border-base-200 pt-6" aria-labelledby="titulo-dados-organizacao">
          <h2 id="titulo-dados-organizacao" class="text-lg font-semibold">Dados da organização</h2>
          <div class="mt-4 grid gap-4">
            <label class="form-control w-full">
              <span class="label-text mb-1 font-medium">{{ store.usuario()?.tipo_conta === 'empresa' ? 'Nome da empresa' : 'Nome da escola' }}</span>
              <input class="input input-bordered w-full" type="text" required placeholder="Ex.: Nome da organização" [value]="organizacao()" (input)="organizacao.set(valorDo($event))" />
            </label>
            <label class="form-control w-full">
              <span class="label-text mb-1 font-medium">CNPJ</span>
              <input class="input input-bordered w-full" type="text" inputmode="numeric" autocomplete="off" required placeholder="Ex.: 00.000.000/0000-00" [value]="cnpj()" (input)="cnpj.set(valorDo($event))" />
            </label>
          </div>
        </section>
      }

      <div class="mt-7 flex flex-col-reverse gap-3 border-t border-base-200 pt-5 sm:flex-row sm:justify-end">
        <button class="btn btn-primary min-h-11 sm:min-w-40" type="submit">Salvar alterações</button>
      </div>
    </form>
  `,
})
export class AccountComponent {
  readonly store = inject(StoreService);
  readonly usuario = computed(() => this.store.usuario());
  readonly contaInstitucional = computed(() => {
    const usuario = this.usuario();
    return usuario?.tipo_conta === 'empresa' ||
      (usuario?.tipo_conta === 'participante' && usuario.tipo_participante === 'escola');
  });
  readonly contaVoluntario = computed(() => this.usuario()?.tipo_conta === 'voluntario');
  readonly nome = signal(this.usuario()?.nome ?? '');
  readonly email = signal(this.usuario()?.email ?? '');
  readonly telefone = signal(this.usuario()?.telefone ?? '');
  readonly organizacao = signal(this.usuario()?.organizacao ?? '');
  readonly cnpj = signal(this.usuario()?.cnpj ?? '');
  readonly cpf = signal(this.store.db().inscricoesVoluntarios.find((item) => item.usuario_id === this.usuario()?.id)?.cpf ?? '');
  readonly mensagem = signal('');
  readonly resultado = signal<Resultado | null>(null);

  valorDo(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  salvar(event: Event): void {
    event.preventDefault();
    const result = this.store.atualizarMinhaConta({
      nome: this.nome(),
      email: this.email(),
      telefone: this.telefone(),
      ...(this.contaInstitucional() ? { organizacao: this.organizacao(), cnpj: this.cnpj() } : {}),
      ...(this.contaVoluntario() ? { cpf: this.cpf() } : {}),
    });
    this.resultado.set(result);
    this.mensagem.set(result.ok ? 'Seus dados foram atualizados.' : result.erro ?? 'Não foi possível salvar seus dados.');
  }
}
