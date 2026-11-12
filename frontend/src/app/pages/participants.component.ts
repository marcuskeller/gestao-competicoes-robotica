import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
      <section class="h-fit rounded-2xl border border-base-300 bg-base-100 p-5 sm:p-6">
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

      <section>
        <h2 class="text-xl font-semibold">Equipes cadastradas</h2>
        <p class="mt-1 text-sm text-base-content/60">{{ equipes().length }} equipe(s) nesta conta</p>
        <div class="mt-4 grid gap-3">
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
                  <h3><app-team-details [equipeId]="item.equipe.id" [equipeNome]="item.equipe.nome" classe="link link-primary text-left font-semibold" /></h3>
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
    </div>

    <p class="mt-6 max-w-3xl rounded-lg bg-base-200 p-4 text-xs leading-5 text-base-content/65">
      Os dados dos estudantes ficam na área da organização e não aparecem no portal público de resultados.
    </p>
    <a class="btn btn-outline mt-4" routerLink="/publico">Consultar resultados públicos</a>
  `,
})
export class ParticipantsComponent {
  readonly store = inject(StoreService);
  readonly modalidadeId = signal(1);
  readonly nomeEscola = signal('');
  readonly rede = signal<Rede | ''>('');
  readonly municipio = signal('');
  readonly uf = signal('');
  readonly nomeEquipe = signal('');
  readonly alunosTexto = signal('');
  readonly mensagem = signal('');
  readonly resultado = signal<Resultado | null>(null);

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
    const usuarioId = this.store.usuario()?.id;
    const db = this.store.db();
    return db.equipes
      .filter((equipe) => equipe.responsavel_usuario_id === usuarioId)
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
    }
  }

  inscrever(equipeId: number, modalidadeId: number): void {
    const result = this.store.submeterInscricao(equipeId, modalidadeId);
    this.exibir(result, 'Inscrição enviada para análise.');
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
