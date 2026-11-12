import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { TeamDetailsComponent } from '../shared/team-details.component';
import type { Inscricao, Modalidade, Resultado, Rede } from '../core/models';

@Component({
  selector: 'app-participants',
  imports: [FormsModule, RouterLink, TeamDetailsComponent],
  template: `
    <header>
      <p class="text-sm font-semibold text-primary">ÁREA DE PARTICIPANTES</p>
      <h1 class="mt-2 text-3xl font-semibold">Minhas equipes</h1>
      <p class="mt-2 text-base-content/60">
        {{ store.usuario()?.organizacao || store.usuario()?.nome }}
      </p>
    </header>

    @if (mensagem()) {
      <p class="alert mt-5" [class.alert-error]="!resultado()?.ok" [class.alert-success]="resultado()?.ok" role="status">
        {{ mensagem() }}
      </p>
    }

    <div class="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      @if (abaEquipes() === 'cadastro') {
      <section class="mx-auto h-fit w-full max-w-3xl rounded-2xl border border-base-300 bg-base-100 p-5 sm:p-6" style="grid-column: 1 / -1">
        <h2 class="text-xl font-semibold">Cadastrar equipe e alunos</h2>
        <p class="mt-2 text-sm leading-6 text-base-content/65">
          Cadastre uma equipe por vez. Você poderá voltar e incluir outras equipes depois.
        </p>

        <form class="mt-5 grid gap-4" (submit)="cadastrarEquipe($event)">
          @if (tipoEscola()) {
            <div class="rounded-lg bg-base-200 p-3 text-sm">
              <p class="font-medium">{{ store.usuario()?.organizacao }}</p>
              <p class="mt-1 text-base-content/60">CNPJ {{ store.usuario()?.cnpj }}</p>
            </div>
          } @else {
            <label class="form-control w-full">
              <span class="label-text mb-1 font-medium">Escola da equipe</span>
              <input class="input input-bordered w-full" required placeholder="Ex.: Nome da escola" [value]="nomeEscola()" (input)="nomeEscola.set(valorDo($event))" />
            </label>
          }

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="form-control w-full">
              <span class="label-text mb-1 font-medium">Rede de ensino</span>
              <select class="select select-bordered w-full" required [value]="rede()" (change)="selecionarRede($event)">
                <option value="" disabled>Selecione a rede</option>
                <option value="municipal">Municipal</option>
                <option value="estadual">Estadual</option>
                <option value="federal">Federal</option>
                <option value="privada">Privada</option>
              </select>
            </label>
            <label class="form-control w-full">
              <span class="label-text mb-1 font-medium">UF</span>
              <input class="input input-bordered w-full uppercase" required maxlength="2" placeholder="Ex.: SC" [value]="uf()" (input)="uf.set(valorDo($event).toUpperCase())" />
            </label>
          </div>

          <label class="form-control w-full">
            <span class="label-text mb-1 font-medium">Município</span>
            <input class="input input-bordered w-full" required placeholder="Ex.: Nome do município" [value]="municipio()" (input)="municipio.set(valorDo($event))" />
          </label>

          <label class="form-control w-full">
            <span class="label-text mb-1 font-medium">Nome da equipe</span>
            <input class="input input-bordered w-full" required placeholder="Ex.: Nome da equipe" [value]="nomeEquipe()" (input)="nomeEquipe.set(valorDo($event))" />
          </label>

          <label class="form-control w-full">
            <span class="label-text mb-1 font-medium">Modalidade</span>
            <select class="select select-bordered w-full" required [value]="modalidadeId()" (change)="modalidadeId.set(+valorDo($event))">
              @for (modalidade of modalidades(); track modalidade.id) {
                <option [value]="modalidade.id">{{ modalidade.nome }} · {{ modalidade.min_integrantes }}–{{ modalidade.max_integrantes }} integrantes</option>
              }
            </select>
          </label>

          <label class="form-control w-full">
            <span class="label-text mb-1 font-medium">Integrantes</span>
            <textarea class="textarea textarea-bordered w-full" rows="5" required placeholder="Um por linha: Nome do estudante | Série&#10;Ex.: Nome do estudante | 8º ano" [value]="alunosTexto()" (input)="alunosTexto.set(valorDo($event))"></textarea>
            <span class="label-text-alt mt-1">Informe de {{ modalidadeSelecionada()?.min_integrantes ?? 0 }} a {{ modalidadeSelecionada()?.max_integrantes ?? 0 }} estudantes. O primeiro será o capitão.</span>
          </label>

          @if (!periodoAberto()) {
            <p class="rounded-lg bg-info/10 p-3 text-sm leading-5">
              O cadastro da equipe pode ser preparado agora. A inscrição competitiva será enviada quando abrir o período de inscrições.
            </p>
          }

          <button class="btn btn-primary min-h-11 w-full" type="submit">Salvar equipe e alunos</button>
        </form>
      </section>
      }

      @if (abaEquipes() === 'equipes') {
      <section class="mx-auto w-full max-w-5xl" style="grid-column: 1 / -1">
        <h2 class="text-xl font-semibold">Equipes cadastradas</h2>
        <p class="mt-1 text-sm text-base-content/60">{{ equipes().length }} equipe(s) nesta conta</p>
        <div class="mt-4 grid gap-3 md:grid-cols-2">
          @for (item of equipes(); track item.equipe.id) {
            <article
              class="cursor-pointer rounded-xl border border-base-300 bg-base-100 p-4 transition-colors hover:bg-base-100/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-5"
              tabindex="0"
              [attr.aria-label]="'Ver detalhes da equipe ' + item.equipe.nome"
              (click)="abrirDetalhesEquipe($event)"
              (keydown.enter)="abrirDetalhesEquipe($event)"
              (keydown.space)="abrirDetalhesEquipe($event)"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <h3><app-team-details [equipeId]="item.equipe.id" [equipeNome]="item.equipe.nome" classe="text-left font-semibold text-base-content transition-colors hover:text-primary focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" /></h3>
                  <p class="mt-1 text-sm text-base-content/65">{{ item.escola }} · {{ item.modalidade?.nome ?? 'Modalidade não definida' }}</p>
                </div>
                <span class="badge badge-outline">{{ statusInscricao(item.inscricao) }}</span>
              </div>
              <ul class="mt-3 grid gap-2 sm:grid-cols-2">
                @for (aluno of item.alunos; track aluno.id) {
                  <li class="rounded-lg bg-base-200 p-3 text-sm">
                    <span class="font-medium">{{ aluno.nome }}</span>
                    <span class="block text-base-content/60">{{ aluno.serie }} · {{ aluno.papel === 'capitao' ? 'Capitão' : 'Integrante' }}</span>
                  </li>
                }
              </ul>
              @if (item.equipe.status !== 'confirmada') {
                @if (equipeEditando() === item.equipe.id) {
                  <div class="mt-4 rounded-xl border border-primary/30 bg-base-100 p-4" (click)="$event.stopPropagation()">
                    <h4 class="font-semibold">Editar equipe</h4>
                    <label class="form-control mt-3 w-full">
                      <span class="label-text mb-1">Nome da equipe</span>
                      <input class="input input-bordered w-full" [value]="nomeEdicao()" (input)="nomeEdicao.set(valorDo($event))" />
                    </label>
                    <label class="form-control mt-3 w-full">
                      <span class="label-text mb-1">Modalidade</span>
                      <select class="select select-bordered w-full" [value]="modalidadeEdicao()" (change)="modalidadeEdicao.set(+valorDo($event))">
                        @for (modalidade of modalidades(); track modalidade.id) {
                          <option [value]="modalidade.id">{{ modalidade.nome }}</option>
                        }
                      </select>
                    </label>
                    <label class="form-control mt-3 w-full">
                      <span class="label-text mb-1">Integrantes (um por linha: Nome | Série)</span>
                      <textarea class="textarea textarea-bordered w-full" rows="4" [value]="alunosEdicao()" (input)="alunosEdicao.set(valorDo($event))"></textarea>
                    </label>
                    @if (erroEdicao()) { <p class="mt-2 text-sm text-error" role="alert">{{ erroEdicao() }}</p> }
                    <div class="mt-3 flex justify-end gap-2">
                      <button class="btn btn-ghost btn-sm" type="button" (click)="equipeEditando.set(null)">Cancelar</button>
                      <button class="btn btn-primary btn-sm" type="button" (click)="salvarEquipe(item.equipe.id)">Salvar</button>
                    </div>
                  </div>
                } @else {
                  <button class="btn btn-outline btn-sm mt-4 min-h-11" type="button" (click)="iniciarEdicaoEquipe(item); $event.stopPropagation()">Editar dados</button>
                }
              } @else {
                <p class="mt-3 text-xs text-base-content/55">Equipe confirmada: edição bloqueada.</p>
              }
              @if (!item.inscricao && periodoAberto() && item.equipe.modalidade_id) {
                <button class="btn btn-primary btn-sm mt-4 min-h-11" type="button" (click)="inscrever(item.equipe.id, item.equipe.modalidade_id!)">Enviar inscrição</button>
              }
            </article>
          } @empty {
            <p class="rounded-xl border border-dashed border-base-300 bg-base-100 p-5 text-sm leading-6 text-base-content/65">
              Ainda não há equipes nesta conta. Preencha o formulário para começar.
            </p>
          }
        </div>
      </section>
      }
    </div>

    <p class="mt-6 max-w-3xl rounded-lg bg-base-200 p-4 text-xs leading-5 text-base-content/65">
      Os dados dos estudantes ficam na área da organização e não aparecem no portal público de resultados.
    </p>
    <a class="btn btn-outline mt-4" routerLink="/publico">Consultar resultados públicos</a>
  `,
})
export class ParticipantsComponent {
  readonly store = inject(StoreService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly modalidadeId = signal(1);
  readonly nomeEscola = signal('');
  readonly rede = signal<Rede | ''>('');
  readonly municipio = signal('');
  readonly uf = signal('');
  readonly nomeEquipe = signal('');
  readonly alunosTexto = signal('');
  readonly mensagem = signal('');
  readonly resultado = signal<Resultado | null>(null);
  readonly abaEquipes = signal<'cadastro' | 'equipes'>('cadastro');
  readonly equipeEditando = signal<number | null>(null);
  readonly nomeEdicao = signal('');
  readonly modalidadeEdicao = signal(1);
  readonly alunosEdicao = signal('');
  readonly erroEdicao = signal('');

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.abaEquipes.set(params.get('aba') === 'equipes' ? 'equipes' : 'cadastro');
    });
  }

  readonly tipoEscola = computed(() => this.store.usuario()?.tipo_participante === 'escola');
  readonly modalidades = computed(() => this.store.db().modalidades.filter((item) => item.ativo));
  readonly modalidadeSelecionada = computed(() =>
    this.modalidades().find((item) => item.id === Number(this.modalidadeId())),
  );
  readonly periodoAberto = computed(() => {
    const edicaoId = this.modalidadeSelecionada()?.edicao_id;
    return this.store.db().edicoes.some((edicao) => edicao.id === edicaoId && edicao.status === 'inscricoes');
  });
  readonly equipes = computed(() => {
    const usuario = this.store.usuario();
    const db = this.store.db();
    const usuarioId = usuario?.id;
    const escolaId = usuario?.tipo_participante === 'escola'
      ? db.escolas.find((escola) => escola.cnpj === usuario.cnpj || escola.responsavel_usuario_id === usuario.id)?.id
      : undefined;
    return db.equipes
      .filter((equipe) => equipe.responsavel_usuario_id === usuarioId || (escolaId !== undefined && equipe.escola_id === escolaId))
      .map((equipe) => ({
        equipe,
        escola: db.escolas.find((item) => item.id === equipe.escola_id)?.nome ?? 'Escola',
        modalidade: db.modalidades.find((item) => item.id === equipe.modalidade_id),
        alunos: db.participantes.filter((item) => item.equipe_id === equipe.id),
        inscricao: db.inscricoes.find((item) => item.equipe_id === equipe.id),
      }));
  });

  valorDo(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  abrirDetalhesEquipe(event: Event): void {
    if (event instanceof KeyboardEvent) event.preventDefault();
    const elemento = event.target;
    if (!(elemento instanceof HTMLElement) || elemento.closest('button, a, input, select, textarea')) return;
    const card = event.currentTarget;
    if (card instanceof HTMLElement) card.querySelector<HTMLButtonElement>('app-team-details button')?.click();
  }

  selecionarRede(event: Event): void {
    this.rede.set(this.valorDo(event) as Rede | '');
  }

  cadastrarEquipe(event: Event): void {
    event.preventDefault();
    const alunos = this.alunosTexto().split(/\r?\n/).map((linha) => {
      const [nome, serie] = linha.split('|');
      return { nome: nome?.trim() ?? '', serie: serie?.trim() ?? '' };
    }).filter((aluno) => aluno.nome && aluno.serie);
    const rede = this.rede();
    if (!rede) {
      this.exibir({ ok: false, erro: 'Selecione a rede de ensino.' });
      return;
    }
    const result = this.store.criarEquipeParticipante({
      nome: this.nomeEquipe(),
      modalidade_id: this.modalidadeId(),
      nome_escola: this.nomeEscola(),
      rede,
      municipio: this.municipio(),
      uf: this.uf(),
      alunos,
    });
    this.exibir(result, result.ok && this.periodoAberto()
      ? 'Equipe e alunos cadastrados. Inscrição enviada para análise.'
      : 'Equipe e alunos salvos como pré-cadastro. Você poderá enviar a inscrição quando o período abrir.');
    if (result.ok) {
      this.nomeEquipe.set('');
      this.alunosTexto.set('');
      this.router.navigate([], { relativeTo: this.route, queryParams: { aba: 'equipes' }, queryParamsHandling: 'merge' });
    }
  }

  inscrever(equipeId: number, modalidadeId: number): void {
    const result = this.store.submeterInscricao(equipeId, modalidadeId);
    this.exibir(result, 'Inscrição enviada para análise.');
  }

  iniciarEdicaoEquipe(item: { equipe: { id: number; nome: string; modalidade_id?: number }; alunos: { nome: string; serie: string }[] }): void {
    this.equipeEditando.set(item.equipe.id);
    this.nomeEdicao.set(item.equipe.nome);
    this.modalidadeEdicao.set(item.equipe.modalidade_id ?? this.modalidades()[0]?.id ?? 1);
    this.alunosEdicao.set(item.alunos.map((aluno) => `${aluno.nome} | ${aluno.serie}`).join('\n'));
    this.erroEdicao.set('');
  }

  salvarEquipe(equipeId: number): void {
    const alunos = this.alunosEdicao().split(/\r?\n/).map((linha) => {
      const [nome, serie] = linha.split('|');
      return { nome: nome?.trim() ?? '', serie: serie?.trim() ?? '' };
    }).filter((aluno) => aluno.nome && aluno.serie);
    const result = this.store.atualizarEquipeParticipante(equipeId, {
      nome: this.nomeEdicao(), modalidade_id: this.modalidadeEdicao(), alunos,
    });
    if (!result.ok) {
      this.erroEdicao.set(result.erro ?? 'Não foi possível atualizar a equipe.');
      return;
    }
    this.equipeEditando.set(null);
    this.exibir(result, 'Dados da equipe atualizados.');
  }

  statusInscricao(inscricao?: Inscricao): string {
    if (!inscricao) return 'Pré-cadastro';
    return ({
      submetida: 'Em análise',
      em_analise: 'Em análise',
      aprovada: 'Aprovada',
      rejeitada: 'Não aprovada',
      cancelada: 'Cancelada',
    } as Record<string, string>)[inscricao.status] ?? inscricao.status;
  }

  private exibir(resultado: Resultado, sucesso = 'Operação realizada com sucesso.'): void {
    this.resultado.set(resultado);
    this.mensagem.set(resultado.ok ? sucesso : resultado.erro ?? 'Não foi possível concluir a operação.');
  }
}
