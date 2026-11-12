import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { PERFIS } from '../core/permissions';
import type { TipoConta, Usuario } from '../core/models';

const TIPOS_CONTA: { valor: TipoConta; rotulo: string }[] = [
  { valor: 'administrador', rotulo: 'Administrador' },
  { valor: 'voluntario', rotulo: 'Voluntário' },
  { valor: 'participante', rotulo: 'Participante ou escola' },
  { valor: 'empresa', rotulo: 'Empresa apoiadora' },
];

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <main class="grid min-h-dvh place-items-center bg-base-200 p-4 grid-pattern sm:p-6">
      <section class="w-full max-w-xl rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm sm:p-8">
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
            Entrar
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
            <h2 id="titulo-entrar" class="text-sm font-semibold">Entrar na demonstração</h2>
            <p class="mt-1 text-sm text-base-content/60">
              Primeiro selecione que tipo de pessoa você é; depois escolha sua conta.
            </p>
            <label class="form-control mt-4 w-full">
              <span class="label-text mb-1 font-medium">Sou</span>
              <select
                class="select select-bordered w-full"
                aria-label="Tipo de pessoa"
                [value]="tipoLogin()"
                (change)="atualizarTipoLogin($event)"
              >
                @for (tipo of tiposConta; track tipo.valor) {
                  <option [value]="tipo.valor">{{ tipo.rotulo }}</option>
                }
              </select>
            </label>

            <div class="mt-4 grid gap-2">
              @for (usuario of contasFiltradas(); track usuario.id) {
                @if (usuario.ativo) {
                  <button
                    type="button"
                    class="btn btn-outline h-auto min-h-12 justify-between gap-3 py-3 text-left"
                    (click)="entrar(usuario.email)"
                  >
                    <span class="min-w-0">
                      <span class="block truncate font-semibold">
                        {{ usuario.organizacao || usuario.nome }}
                      </span>
                      <span class="block truncate text-xs font-normal opacity-65">
                        {{ usuario.email }}
                      </span>
                    </span>
                    <span class="shrink-0 text-right text-xs opacity-65">
                      {{ rotuloAtuacao(usuario) }}
                    </span>
                  </button>
                }
              } @empty {
                <p class="rounded-lg bg-base-200 p-4 text-sm text-base-content/65">
                  Ainda não há conta deste tipo neste navegador. Use “Cadastrar” para criar um perfil
                  de demonstração.
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

            <form class="mt-4 grid gap-3" (submit)="cadastrar($event)">
              <label class="form-control w-full">
                <span class="label-text mb-1 font-medium">Nome completo</span>
                <input
                  class="input input-bordered w-full"
                  name="nome"
                  autocomplete="name"
                  required
                  [value]="nome()"
                  (input)="nome.set(valorDo($event))"
                />
              </label>

              <label class="form-control w-full">
                <span class="label-text mb-1 font-medium">E-mail</span>
                <input
                  class="input input-bordered w-full"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  [value]="email()"
                  (input)="email.set(valorDo($event))"
                />
              </label>

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

              @if (tipoCadastro() === 'voluntario') {
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">Cargo voluntário</span>
                  <select
                    class="select select-bordered w-full"
                    aria-label="Cargo voluntário"
                    [value]="cargoVoluntarioId()"
                    (change)="cargoVoluntarioId.set(+valorDo($event))"
                  >
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
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">Telefone</span>
                  <input class="input input-bordered w-full" type="tel" required autocomplete="tel" [value]="telefone()" (input)="telefone.set(valorDo($event))" />
                </label>
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">Disponibilidade</span>
                  <textarea class="textarea textarea-bordered w-full" rows="2" required placeholder="Dias e turnos em que pode ajudar" [value]="disponibilidade()" (input)="disponibilidade.set(valorDo($event))"></textarea>
                </label>
                <p class="text-xs text-base-content/60">A vaga fica pendente de confirmação da organização. Não informe dados sensíveis nesta demonstração.</p>
              }

              @if (tipoCadastro() === 'participante') {
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">Tipo de inscrição</span>
                  <select class="select select-bordered w-full" aria-label="Tipo de inscrição" [value]="tipoParticipante()" (change)="atualizarTipoParticipante($event)">
                    <option value="pessoa_fisica">Pessoa física</option>
                    <option value="escola">Escola com CNPJ</option>
                  </select>
                </label>

                @if (tipoParticipante() === 'pessoa_fisica') {
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Escola</span>
                    <input class="input input-bordered w-full" required [value]="nomeEscola()" (input)="nomeEscola.set(valorDo($event))" />
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Ano escolar</span>
                    <input class="input input-bordered w-full" required placeholder="Ex.: 8º ano" [value]="serie()" (input)="serie.set(valorDo($event))" />
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Responsável</span>
                    <input class="input input-bordered w-full" required autocomplete="name" [value]="responsavel()" (input)="responsavel.set(valorDo($event))" />
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Telefone do responsável</span>
                    <input class="input input-bordered w-full" type="tel" required autocomplete="tel" [value]="telefoneResponsavel()" (input)="telefoneResponsavel.set(valorDo($event))" />
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Modalidade</span>
                    <select class="select select-bordered w-full" aria-label="Modalidade" [value]="modalidadeId()" (change)="modalidadeId.set(+valorDo($event))">
                      @for (modalidade of modalidades(); track modalidade.id) {
                        <option [value]="modalidade.id">{{ modalidade.nome }}</option>
                      }
                    </select>
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Equipe (se já tiver)</span>
                    <input class="input input-bordered w-full" [value]="equipeNome()" (input)="equipeNome.set(valorDo($event))" />
                  </label>
                  <p class="text-xs text-base-content/60">Para menores de idade, o cadastro deve ser feito com ciência do responsável. Use somente dados fictícios na demonstração.</p>
                } @else {
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Nome da escola</span>
                    <input class="input input-bordered w-full" required autocomplete="organization" [value]="organizacao()" (input)="organizacao.set(valorDo($event))" />
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">CNPJ da escola</span>
                    <input class="input input-bordered w-full" inputmode="numeric" required minlength="14" maxlength="18" placeholder="00.000.000/0000-00" [value]="cnpj()" (input)="cnpj.set(valorDo($event))" />
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Telefone da escola</span>
                    <input class="input input-bordered w-full" type="tel" required [value]="telefone()" (input)="telefone.set(valorDo($event))" />
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Nome da equipe</span>
                    <input class="input input-bordered w-full" required [value]="nomeEquipe()" (input)="nomeEquipe.set(valorDo($event))" />
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Modalidade</span>
                    <select class="select select-bordered w-full" aria-label="Modalidade" [value]="modalidadeId()" (change)="modalidadeId.set(+valorDo($event))">
                      @for (modalidade of modalidades(); track modalidade.id) {
                        <option [value]="modalidade.id">{{ modalidade.nome }} ({{ modalidade.min_integrantes }}–{{ modalidade.max_integrantes }} integrantes)</option>
                      }
                    </select>
                  </label>
                  <label class="form-control w-full">
                    <span class="label-text mb-1 font-medium">Integrantes</span>
                    <textarea class="textarea textarea-bordered w-full" rows="4" required placeholder="Um por linha: Nome do estudante | Ano escolar" [value]="alunosTexto()" (input)="alunosTexto.set(valorDo($event))"></textarea>
                    <span class="label-text-alt mt-1">A quantidade deve respeitar os limites da modalidade.</span>
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
                    required
                    [value]="organizacao()"
                    (input)="organizacao.set(valorDo($event))"
                  />
                </label>
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">CNPJ</span>
                  <input class="input input-bordered w-full" inputmode="numeric" required minlength="14" maxlength="18" placeholder="00.000.000/0000-00" [value]="cnpj()" (input)="cnpj.set(valorDo($event))" />
                </label>
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">Telefone de contato</span>
                  <input class="input input-bordered w-full" type="tel" required autocomplete="tel" [value]="telefone()" (input)="telefone.set(valorDo($event))" />
                </label>
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">Valor de apoio proposto (R$)</span>
                  <input class="input input-bordered w-full" type="number" min="1" step="0.01" required [value]="valorProposto()" (input)="atualizarValorProposto($event)" />
                </label>
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-medium">Mensagem sobre o apoio</span>
                  <textarea class="textarea textarea-bordered w-full" rows="3" placeholder="Ex.: apoio para kits ou materiais da arena" [value]="mensagem()" (input)="mensagem.set(valorDo($event))"></textarea>
                </label>
                <p class="text-xs text-base-content/60">O valor é uma proposta de apoio para demonstração; não há cobrança nem pagamento online.</p>
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
            <p class="mt-3 text-xs leading-5 text-base-content/55">
              Os perfis e dados são salvos somente neste navegador. Não informe dados reais ou
              sensíveis; esta demonstração não usa senha nem autenticação de servidor.
            </p>
          </section>
        }

        <a class="btn btn-ghost mt-5 w-full" routerLink="/publico">
          Consultar resultados públicos →
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
  readonly modo = signal<'entrar' | 'cadastrar'>('entrar');
  readonly tipoLogin = signal<TipoConta>('administrador');
  readonly tipoCadastro = signal<TipoConta>('voluntario');
  readonly tipoParticipante = signal<'pessoa_fisica' | 'escola'>('pessoa_fisica');
  readonly cargoVoluntarioId = signal(1);
  readonly nome = signal('');
  readonly email = signal('');
  readonly organizacao = signal('');
  readonly telefone = signal('');
  readonly disponibilidade = signal('');
  readonly nomeEscola = signal('');
  readonly serie = signal('');
  readonly responsavel = signal('');
  readonly telefoneResponsavel = signal('');
  readonly modalidadeId = signal(1);
  readonly equipeNome = signal('');
  readonly nomeEquipe = signal('');
  readonly alunosTexto = signal('');
  readonly cnpj = signal('');
  readonly valorProposto = signal(1000);
  readonly mensagem = signal('');
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
    this.cargosAbertos().find((cargo) => cargo.id === this.cargoVoluntarioId()),
  );

  readonly modalidades = computed(() => this.store.db().modalidades.filter((modalidade) => modalidade.ativo));

  readonly contasFiltradas = computed(() =>
    this.store.db().usuarios.filter((usuario) => this.tipoConta(usuario) === this.tipoLogin()),
  );

  atualizarTipoLogin(event: Event): void {
    this.tipoLogin.set(this.valorDo(event) as TipoConta);
  }

  atualizarTipoCadastro(event: Event): void {
    this.tipoCadastro.set(this.valorDo(event) as TipoConta);
    this.erro.set('');
  }

  atualizarTipoParticipante(event: Event): void {
    this.tipoParticipante.set(this.valorDo(event) as 'pessoa_fisica' | 'escola');
  }

  atualizarValorProposto(event: Event): void {
    this.valorProposto.set(Number(this.valorDo(event)));
  }

  valorDo(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  rotuloAtuacao(usuario: Usuario): string {
    if (this.tipoConta(usuario) === 'administrador') return 'Administração';
    if (this.tipoConta(usuario) === 'empresa') return 'Empresa apoiadora';
    if (this.tipoConta(usuario) === 'participante') return 'Participante';
    return this.perfis[usuario.perfil].rotulo;
  }

  entrar(email: string): void {
    const resultado = this.store.entrar(email);
    if (!resultado.ok) {
      this.erro.set(resultado.erro ?? 'Não foi possível entrar.');
      return;
    }
    this.erro.set('');
    void this.router.navigate([this.rotaInicial()]);
  }

  cadastrar(event: Event): void {
    event.preventDefault();
    const resultado = this.store.cadastrarContaDemo({
      nome: this.nome(),
      email: this.email(),
      tipo_conta: this.tipoCadastro(),
      organizacao: this.organizacao(),
      telefone: this.telefone(),
      disponibilidade: this.disponibilidade(),
      cargo_voluntario_id: this.cargoVoluntarioId(),
      tipo_participante: this.tipoParticipante(),
      nome_escola: this.nomeEscola(),
      serie: this.serie(),
      responsavel: this.responsavel(),
      telefone_responsavel: this.telefoneResponsavel(),
      modalidade_id: this.modalidadeId(),
      equipe_nome: this.equipeNome(),
      nome_equipe: this.nomeEquipe(),
      alunos: this.alunosTexto().split(/\r?\n/).map((linha) => {
        const [nome, serie] = linha.split('|');
        return { nome: nome?.trim() ?? '', serie: serie?.trim() ?? '' };
      }).filter((aluno) => aluno.nome && aluno.serie),
      cnpj: this.cnpj(),
      valor_proposto: this.valorProposto(),
      mensagem: this.mensagem(),
    });
    if (!resultado.ok) {
      this.erro.set(resultado.erro ?? 'Não foi possível criar o perfil.');
      return;
    }
    void this.router.navigate([this.rotaInicial()]);
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

  private rotaInicial(): string {
    const usuario = this.store.usuario();
    if (usuario?.tipo_conta === 'empresa' || usuario?.perfil === 'empresa') return '/app/parceiros';
    if (usuario?.tipo_conta === 'participante' || usuario?.perfil === 'participante') return '/app/participante';
    if (usuario?.tipo_conta === 'voluntario') return '/app/voluntario';
    return '/app/dashboard';
  }
}
