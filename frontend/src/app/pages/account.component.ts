import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { IconComponent } from '../shared/icon.component';
import type { Resultado } from '../core/models';

@Component({
  selector: 'app-account',
  imports: [RouterLink, IconComponent],
  template: `
    <a class="btn btn-ghost btn-sm mb-3" [routerLink]="rotaVoltar()">
      <app-icon nome="arrow" classe="size-4 rotate-180" />
      Voltar
    </a>
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

    <form class="mx-auto mt-6 max-w-3xl rounded-2xl border border-base-300 bg-base-100 p-5 sm:p-6" (submit)="salvar($event)">
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
              <input class="input input-bordered w-full" type="text" inputmode="numeric" autocomplete="off" required maxlength="18" placeholder="Ex.: 00.000.000/0000-00" [value]="cnpj()" (input)="atualizarCnpj($event)" />
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
  readonly rotaVoltar = computed(() => {
    const usuario = this.usuario();
    if (usuario?.tipo_conta === 'empresa' || usuario?.perfil === 'empresa') return '/app/parceiros';
    if (usuario?.tipo_conta === 'participante' || usuario?.perfil === 'participante') return '/app/participante';
    return '/app/dashboard';
  });
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
  readonly cnpj = signal(this.formatarCnpj(this.usuario()?.cnpj ?? ''));
  readonly cpf = signal(this.store.db().inscricoesVoluntarios.find((item) => item.usuario_id === this.usuario()?.id)?.cpf ?? '');
  readonly mensagem = signal('');
  readonly resultado = signal<Resultado | null>(null);

  valorDo(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  atualizarCnpj(event: Event): void {
    const campo = event.target as HTMLInputElement;
    this.cnpj.set(this.formatarCnpj(campo.value));
    campo.value = this.cnpj();
  }

  private formatarCnpj(valor: string): string {
    const digitos = valor.replace(/\D/g, '').slice(0, 14);
    if (digitos.length <= 2) return digitos;
    if (digitos.length <= 5) return `${digitos.slice(0, 2)}.${digitos.slice(2)}`;
    if (digitos.length <= 8) return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`;
    if (digitos.length <= 12) {
      return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8)}`;
    }
    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
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
