import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { PERFIS } from '../core/permissions';
import { IconComponent } from '../shared/icon.component';
import type { TipoConta, Usuario } from '../core/models';

const TIPOS_CONTA: { valor: TipoConta; rotulo: string }[] = [
  { valor: 'administrador', rotulo: 'Administrador' },
  { valor: 'voluntario', rotulo: 'Voluntário' },
  { valor: 'participante', rotulo: 'Participante ou escola' },
  { valor: 'empresa', rotulo: 'Empresa apoiadora' },
];
const TIPOS_LOGIN: { valor: TipoConta | 'escola'; rotulo: string }[] = [
  { valor: 'administrador', rotulo: 'Administrador' },
  { valor: 'voluntario', rotulo: 'Voluntário' },
  { valor: 'escola', rotulo: 'Escola' },
  { valor: 'participante', rotulo: 'Participante' },
  { valor: 'empresa', rotulo: 'Empresa apoiadora' },
];

const TURNOS_VOLUNTARIO = [
  '9/11 · Manhã',
  '9/11 · Tarde',
  '10/11 · Manhã',
  '10/11 · Tarde',
  '11/11 · Manhã',
  '11/11 · Tarde',
  '12/11 · Manhã',
  '12/11 · Tarde',
  '13/11 · Manhã',
  '13/11 · Tarde',
  '9 a 13/11 · Todos os turnos',
];

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <main class="grid min-h-dvh w-full place-items-start bg-base-200 p-3 grid-pattern sm:place-items-center sm:p-6">
      <section class="w-full min-w-0 max-w-xl rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-8">
        <span
          class="badge badge-primary badge-outline h-auto min-h-6 max-w-full whitespace-normal px-2 py-1 text-center leading-4"
          >Campeonato Joinvilense de Robótica</span
        >
        <h1 class="mt-5 text-3xl font-semibold">Arena Robótica</h1>
        <p class="mt-2 text-base-content/65">
          Acompanhe equipes, disputas e resultados em um só lugar.
        </p>

        <div class="mt-6 grid grid-cols-2 gap-2" aria-label="Acesso à demonstração">
          <button
            class="btn"
            [class.btn-primary]="modo() === 'entrar'"
            [class.btn-ghost]="modo() !== 'entrar'"
            type="button"
            [attr.aria-pressed]="modo() === 'entrar'"
            (click)="modo.set('entrar')"
          >
            Contas de teste
          </button>
          <button
            class="btn"
            [class.btn-primary]="modo() === 'cadastrar'"
            [class.btn-ghost]="modo() !== 'cadastrar'"
            type="button"
            [attr.aria-pressed]="modo() === 'cadastrar'"
            (click)="modo.set('cadastrar')"
          >
            Cadastrar
          </button>
        </div>

        @if (modo() === 'entrar') {
          <section class="mt-6" aria-labelledby="titulo-entrar">
            <h2 id="titulo-entrar" class="text-sm font-semibold">Contas de teste</h2>
            <p class="mt-1 text-sm text-base-content/60">
              Selecione o tipo de perfil e toque em uma conta da lista para acessar.
            </p>
            <label class="form-control mt-4 w-full">
              <span class="label-text mb-1 font-medium">Tipo de perfil</span>
              <select
                class="select select-bordered w-full"
                name="tipoLogin"
                autocomplete="off"
                aria-label="Tipo de perfil"
                [ngModel]="tipoLogin()"
                (ngModelChange)="tipoLogin.set($event)"
              >
                @for (tipo of tiposLogin; track tipo.valor) {
                  <option [value]="tipo.valor">{{ tipo.rotulo }}</option>
                }
              </select>
            </label>

            <div class="mt-4 grid min-w-0 gap-2">
              @for (usuario of contasFiltradas(); track usuario.id) {
                @if (usuario.ativo) {
                  <button
                    type="button"
                    class="btn btn-outline h-auto min-h-12 min-w-0 justify-between gap-2 whitespace-normal py-3 text-left sm:gap-3"
                    (click)="entrar(usuario.id)"
                  >
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-semibold">
                        {{ usuario.tipo_participante === 'escola' ? (usuario.organizacao || usuario.nome) : usuario.nome }}
                      </span>
                      <span class="block truncate text-xs font-normal opacity-65">
                        {{ usuario.email }}
                      </span>
                    </span>
                    <span class="max-w-[42%] shrink text-right text-xs leading-tight opacity-65 sm:max-w-none sm:shrink-0">
                      {{ rotuloAtuacao(usuario) }}
                    </span>
                  </button>
                }
              } @empty {
                <p class="rounded-lg bg-base-200 p-4 text-sm text-base-content/65">
                  Ainda não há conta deste tipo. Use “Cadastrar” para criar um perfil de demonstração.
                </p>
              }
            </div>
          </section>
        } @else {
          <section class="mt-6" aria-labelledby="titulo-cadastro">
            <h2 id="titulo-cadastro" class="text-sm font-semibold">Criar perfil de demonstração</h2>
            <p class="mt-1 text-sm text-base-content/60">
              Escolha como participa: administração, voluntariado, participante individual ou escola,
              ou empresa apoiadora.
            </p>

            <form class="mt-4 grid min-w-0 gap-3" (submit)="cadastrar($event)">
              <label class="form-control w-full">
                <span class="label-text mb-1 font-medium">Tipo de pessoa</span>
                <select
                  class="select select-bordered w-full"
                  aria-label="Tipo de pessoa"
                  [value]="tipoCadastro()"
                  (change)="atualizarTipoCadastro($event)"
                >
                  @for (tipo of tiposConta; track tipo.valor) {
                    <option [value]="tipo.valor" [selected]="tipo.valor === tipoCadastro()">
                      {{ tipo.rotulo }}
                    </option>
                  }
                </select>
              </label>

              @if (tipoCadastro() === 'participante') {
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">Tipo de inscrição</span>
                  <select class="select select-bordered w-full" aria-label="Tipo de inscrição" [value]="tipoParticipante()" (change)="atualizarTipoParticipante($event)">
                    <option value="pessoa_fisica">Pessoa física</option>
                    <option value="escola">Escola com CNPJ</option>
                  </select>
                </label>
              }

              <label class="form-control w-full">
                <span class="label-text mb-1 font-medium">Nome completo</span>
                <input
                  class="input input-bordered w-full"
                  name="nome"
                  autocomplete="name"
                  placeholder="Ex.: Nome Sobrenome"
                  required
                  [value]="nome()"
                  (input)="nome.set(valorDo($event))"
                />
              </label>

              <label class="form-control w-full">
                <span class="label-text mb-1 font-medium">E-mail de contato</span>
                <input
                  class="input input-bordered w-full"
                  name="email"
                  type="email"
                  autocomplete="email"
                  placeholder="Ex.: nome@exemplo.com"
                  required
                  [value]="email()"
                  (input)="email.set(valorDo($event))"
                />
              </label>

              @if (tipoCadastro() !== 'administrador') {
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">Telefone de contato</span>
                  <input class="input input-bordered w-full" type="tel" required autocomplete="tel" placeholder="Ex.: (00) 00000-0000" [value]="telefone()" (input)="telefone.set(valorDo($event))" />
                </label>
              }

              @if (tipoCadastro() === 'voluntario') {
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">CPF</span>
                  <input
                    class="input input-bordered w-full"
                    name="cpf"
                    inputmode="numeric"
                    autocomplete="off"
                    placeholder="Ex.: 000.000.000-00"
                    maxlength="14"
                    required
                    [value]="cpf()"
                    (input)="cpf.set(valorDo($event))"
                  />
                </label>
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">Cargo voluntário</span>
                  <select
                    class="select select-bordered w-full"
                    aria-label="Cargo voluntário"
                    required
                    [value]="cargoVoluntarioId()"
                    (change)="cargoVoluntarioId.set(+valorDo($event))"
                  >
                    <option value="" disabled>Selecione um cargo</option>
                    @for (cargo of cargosAbertos(); track cargo.id) {
                      <option [value]="cargo.id" [disabled]="cargo.vagas_restantes === 0">
                        {{ cargo.nome }} · {{ cargo.vagas_restantes }} vagas
                      </option>
                    }
                  </select>
                  @if (cargoSelecionado(); as cargo) {
                    <span class="label-text-alt mt-1">
                      Vagas ainda abertas para este cargo: {{ cargo.vagas_restantes }}
                    </span>
                  }
                </label>
                <fieldset class="form-control w-full">
                  <legend class="label-text mb-2 font-medium">Disponibilidade</legend>
                  <div class="grid gap-2 sm:grid-cols-2">
                    @for (turno of turnosVoluntario; track turno) {
                      <label class="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-base-300 px-3 py-2 text-sm hover:bg-base-200">
                        <input
                          class="checkbox checkbox-primary checkbox-sm"
                          type="checkbox"
                          [checked]="disponibilidade().includes(turno)"
                          (change)="alternarDisponibilidade(turno, $event)"
                        />
                        <span>{{ turno }}</span>
                      </label>
                    }
                  </div>
                  @if (!disponibilidade().length) {
                    <span class="label-text-alt mt-2">Selecione ao menos um horário disponível.</span>
                  }
                </fieldset>
                <p class="text-xs text-base-content/60">A vaga fica pendente de confirmação da organização.</p>
              }

              @if (tipoCadastro() === 'participante') {
                @if (tipoParticipante() === 'escola') {
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Nome da escola</span>
                    <input class="input input-bordered w-full" required autocomplete="organization" placeholder="Ex.: Nome da escola" [value]="organizacao()" (input)="organizacao.set(valorDo($event))" />
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">CNPJ da escola</span>
                    <input class="input input-bordered w-full" inputmode="numeric" required minlength="14" maxlength="18" placeholder="Ex.: 00.000.000/0000-00" [value]="cnpj()" (input)="cnpj.set(valorDo($event))" />
                  </label>
                }
              }

              @if (tipoCadastro() === 'empresa') {
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">Nome da empresa</span>
                  <input
                    class="input input-bordered w-full"
                    name="organizacao"
                    autocomplete="organization"
                    placeholder="Ex.: Razão social da empresa"
                    required
                    [value]="organizacao()"
                    (input)="organizacao.set(valorDo($event))"
                  />
                </label>
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">CNPJ</span>
                  <input class="input input-bordered w-full" inputmode="numeric" required minlength="14" maxlength="18" placeholder="Ex.: 00.000.000/0000-00" [value]="cnpj()" (input)="cnpj.set(valorDo($event))" />
                </label>
              }

              @if (tipoCadastro() === 'administrador') {
                <p class="rounded-lg bg-warning/15 p-3 text-sm text-base-content/70">
                  Perfil administrativo apenas para demonstração. Em produção, esse acesso precisa
                  ser aprovado pela organização.
                </p>
              }

              @if (erro()) {
                <p role="alert" class="text-sm text-error">{{ erro() }}</p>
              }

              <button class="btn btn-primary mt-1 w-full" type="submit">Criar perfil</button>
            </form>
          </section>
        }

        <a class="btn btn-ghost mt-5 w-full" routerLink="/publico">
          Consultar resultados públicos
          <app-icon nome="arrow" classe="size-4" />
        </a>
      </section>
    </main>
  `,
})
export class LoginComponent {
  readonly store = inject(StoreService);
  private readonly router = inject(Router);
  readonly perfis = PERFIS;
  readonly tiposConta = TIPOS_CONTA;
  readonly tiposLogin = TIPOS_LOGIN;
  readonly turnosVoluntario = TURNOS_VOLUNTARIO;
  readonly modo = signal<'entrar' | 'cadastrar'>('entrar');
  readonly tipoLogin = signal<TipoConta | 'escola'>('administrador');
  readonly tipoCadastro = signal<TipoConta>('voluntario');
  readonly tipoParticipante = signal<'pessoa_fisica' | 'escola'>('pessoa_fisica');
  readonly cargoVoluntarioId = signal<number | ''>('');
  readonly nome = signal('');
  readonly email = signal('');
  readonly cpf = signal('');
  readonly organizacao = signal('');
  readonly telefone = signal('');
  readonly disponibilidade = signal<string[]>([]);
  readonly cnpj = signal('');
  readonly erro = signal('');

  readonly cargosAbertos = computed(() => {
    const db = this.store.db();
    return (db.cargosVoluntarios ?? []).filter((cargo) => cargo.ativo).map((cargo) => {
      const ocupadas = (db.inscricoesVoluntarios ?? []).filter(
        (inscricao) => inscricao.cargo_id === cargo.id && inscricao.status !== 'rejeitada',
      ).length;
      return { ...cargo, vagas_restantes: Math.max(0, cargo.vagas_total - ocupadas) };
    });
  });

  readonly cargoSelecionado = computed(() =>
    this.cargosAbertos().find((cargo) => cargo.id === Number(this.cargoVoluntarioId())),
  );

  readonly contasFiltradas = computed(() =>
    this.store.db().usuarios.filter((usuario) => {
      const tipo = this.tipoLogin();
      if (tipo === 'escola') return this.tipoConta(usuario) === 'participante' && usuario.tipo_participante === 'escola';
      if (tipo === 'participante') return this.tipoConta(usuario) === 'participante' && usuario.tipo_participante !== 'escola';
      return this.tipoConta(usuario) === tipo;
    }),
  );

  atualizarTipoCadastro(event: Event): void {
    this.tipoCadastro.set(this.valorDo(event) as TipoConta);
    this.erro.set('');
  }

  atualizarTipoParticipante(event: Event): void {
    this.tipoParticipante.set(this.valorDo(event) as 'pessoa_fisica' | 'escola');
  }

  alternarDisponibilidade(turno: string, event: Event): void {
    const selecionado = (event.target as HTMLInputElement).checked;
    const atual = this.disponibilidade();
    this.disponibilidade.set(selecionado
      ? [...atual, turno]
      : atual.filter((item) => item !== turno));
  }

  valorDo(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  rotuloAtuacao(usuario: Usuario): string {
    if (this.tipoConta(usuario) === 'administrador') return 'Administração';
    if (this.tipoConta(usuario) === 'empresa') return 'Empresa apoiadora';
    if (this.tipoConta(usuario) === 'participante') return usuario.tipo_participante === 'escola' ? 'Escola' : 'Participante';
    return this.perfis[usuario.perfil].rotulo;
  }

  entrar(usuarioId: number): void {
    const resultado = this.store.entrarComo(usuarioId);
    if (!resultado.ok) {
      this.erro.set(resultado.erro ?? 'Não foi possível entrar.');
      return;
    }
    this.erro.set('');
    void this.router.navigate([this.rotaInicial(usuarioId)]);
  }

  cadastrar(event: Event): void {
    event.preventDefault();
    const resultado = this.store.cadastrarContaDemo({
      nome: this.nome(),
      email: this.email(),
      tipo_conta: this.tipoCadastro(),
      cpf: this.cpf(),
      organizacao: this.organizacao(),
      telefone: this.telefone(),
      disponibilidade: this.disponibilidade().join(', '),
      cargo_voluntario_id: Number(this.cargoVoluntarioId()),
      tipo_participante: this.tipoParticipante(),
      cnpj: this.cnpj(),
    });
    if (!resultado.ok) {
      this.erro.set(resultado.erro ?? 'Não foi possível criar o perfil.');
      return;
    }
    void this.router.navigate([this.rotaInicial(resultado.id!)]);
  }

  private tipoConta(usuario: Usuario): TipoConta {
    return usuario.tipo_conta ??
      (usuario.perfil === 'administrador'
        ? 'administrador'
        : usuario.perfil === 'empresa'
          ? 'empresa'
          : usuario.perfil === 'participante'
            ? 'participante'
            : 'voluntario');
  }

  private rotaInicial(usuarioId: number): string {
    const usuario = this.store.db().usuarios.find((item) => item.id === usuarioId);
    if (usuario?.tipo_conta === 'empresa' || usuario?.perfil === 'empresa') return '/app/parceiros';
    if (usuario?.tipo_conta === 'participante' || usuario?.perfil === 'participante') return '/app/participante';
    if (usuario?.tipo_conta === 'voluntario') return '/app/voluntario';
    return '/app/dashboard';
  }
}
