import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { StoreService } from '../core/store.service';
import { PERFIS, PERMISSOES } from '../core/permissions';
import type { TipoConta, Usuario } from '../core/models';

type Aba = 'voluntarios' | 'parcerias' | 'participantes' | 'cargos';

const PERMISSOES_VOLUNTARIO = [
  { chave: 'disputa.ver', rotulo: 'Consultar disputas' },
  { chave: 'resultado.lancar', rotulo: 'Lançar pontuações' },
  { chave: 'inscricao.ver', rotulo: 'Consultar inscrições' },
  { chave: 'inscricao.avaliar', rotulo: 'Avaliar inscrições' },
  { chave: 'etapa.ver', rotulo: 'Consultar etapas' },
  { chave: 'etapa.editar', rotulo: 'Gerenciar etapas' },
  { chave: 'homologar', rotulo: 'Homologar resultados' },
  { chave: 'publicar', rotulo: 'Publicar resultados' },
] as const;

@Component({
  selector: 'app-users',
  imports: [CurrencyPipe],
  template: `
    <header>
      <p class="text-sm font-semibold text-primary">ADMINISTRAÇÃO</p>
      <h1 class="mt-2 text-3xl font-semibold">Usuários e acessos</h1>
      <p class="mt-2 text-base-content/60">Gerencie voluntários, inscrições, parcerias, participantes e vagas.</p>
    </header>

    <div class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Grupos de cadastro">
      <button class="btn btn-sm min-h-11 sm:min-h-8" [class.btn-primary]="aba() === 'voluntarios'" [class.btn-ghost]="aba() !== 'voluntarios'" [attr.aria-pressed]="aba() === 'voluntarios'" (click)="aba.set('voluntarios')">Voluntários</button>
      <button class="btn btn-sm min-h-11 sm:min-h-8" [class.btn-primary]="aba() === 'parcerias'" [class.btn-ghost]="aba() !== 'parcerias'" [attr.aria-pressed]="aba() === 'parcerias'" (click)="aba.set('parcerias')">Parcerias</button>
      <button class="btn btn-sm min-h-11 sm:min-h-8" [class.btn-primary]="aba() === 'participantes'" [class.btn-ghost]="aba() !== 'participantes'" [attr.aria-pressed]="aba() === 'participantes'" (click)="aba.set('participantes')">Participantes</button>
      <button class="btn btn-sm min-h-11 sm:min-h-8" [class.btn-primary]="aba() === 'cargos'" [class.btn-ghost]="aba() !== 'cargos'" [attr.aria-pressed]="aba() === 'cargos'" (click)="aba.set('cargos')">Cargos e vagas</button>
    </div>

    @if (mensagem()) {
      <p class="mt-4 rounded-lg bg-info/10 p-3 text-sm" role="status">{{ mensagem() }}</p>
    }

    @if (aba() === 'voluntarios') {
      <section class="mt-5 grid gap-4">
        @for (item of voluntarios(); track item.usuario.id) {
          <article class="rounded-xl border border-base-300 bg-base-100 p-4 sm:p-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <h2 class="font-semibold">{{ item.usuario.nome }}</h2>
                <p class="break-all text-sm text-base-content/60">{{ item.usuario.email }}</p>
                <p class="mt-1 text-sm">Perfil: {{ perfis[item.usuario.perfil].rotulo }}</p>
                @if (item.inscricao) {
                  <p class="mt-1 text-sm text-base-content/65">Cargo: {{ item.cargo?.nome }} · {{ rotuloStatusVoluntario(item.inscricao.status) }}</p>
                  <p class="mt-1 text-sm text-base-content/65">Telefone: {{ item.inscricao.telefone }} · Disponibilidade: {{ item.inscricao.disponibilidade }}</p>
                }
              </div>
              @if (item.inscricao?.status === 'pendente') {
                <div class="flex shrink-0 gap-2">
                  <button class="btn btn-primary btn-sm min-h-11 sm:min-h-8" (click)="avaliarVoluntario(item.inscricao!.id, 'aprovada')">Aprovar</button>
                  <button class="btn btn-ghost btn-sm min-h-11 sm:min-h-8 text-error" (click)="avaliarVoluntario(item.inscricao!.id, 'rejeitada')">Recusar</button>
                </div>
              }
            </div>
            <details class="mt-4 border-t border-base-300 pt-3">
              <summary class="flex min-h-11 cursor-pointer items-center text-sm font-medium">Permissões individuais</summary>
              <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                @for (permissao of permissoesVoluntario; track permissao.chave) {
                  <label class="flex min-h-10 items-center gap-2 rounded-lg bg-base-200 px-3 py-2 text-sm">
                    <input class="checkbox checkbox-sm" type="checkbox" [checked]="temPermissao(item.usuario, permissao.chave)" (change)="alternarPermissao(item.usuario, permissao.chave, $event)" />
                    <span>{{ permissao.rotulo }}</span>
                  </label>
                }
              </div>
            </details>
          </article>
        } @empty {
          <p class="rounded-lg bg-base-100 p-5 text-sm text-base-content/60">Nenhum voluntário cadastrado.</p>
        }
      </section>
    }

    @if (aba() === 'parcerias') {
      <section class="mt-5 grid gap-3">
        @for (item of parcerias(); track item.parceria.id) {
          <article class="rounded-xl border border-base-300 bg-base-100 p-4 sm:p-5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <h2 class="font-semibold">{{ item.usuario?.organizacao || item.usuario?.nome }}</h2>
                <p class="break-all text-sm text-base-content/60">{{ item.usuario?.email }} · CNPJ {{ item.parceria.cnpj }}</p>
                <p class="mt-2 text-sm">Proposta: {{ item.parceria.valor_proposto | currency: 'BRL' }} · {{ rotuloStatusParceria(item.parceria.status) }}</p>
                <p class="mt-1 text-sm text-base-content/60">{{ item.parceria.mensagem }}</p>
              </div>
              @if (item.parceria.status === 'em_analise') {
                <div class="flex shrink-0 gap-2">
                  <button class="btn btn-primary btn-sm min-h-11 sm:min-h-8" (click)="avaliarParceria(item.parceria.id, 'aprovada')">Aprovar</button>
                  <button class="btn btn-ghost btn-sm min-h-11 sm:min-h-8 text-error" (click)="avaliarParceria(item.parceria.id, 'recusada')">Recusar</button>
                </div>
              }
            </div>
          </article>
        } @empty {
          <p class="rounded-lg bg-base-100 p-5 text-sm text-base-content/60">Nenhuma parceria cadastrada.</p>
        }
      </section>
    }

    @if (aba() === 'participantes') {
      <section class="mt-5 grid gap-3">
        @for (item of participantes(); track item.cadastro.id) {
          <article class="rounded-xl border border-base-300 bg-base-100 p-4 sm:p-5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <span class="badge badge-outline">{{ item.cadastro.tipo === 'escola' ? 'Escola / CNPJ' : 'Pessoa física' }}</span>
                <h2 class="mt-2 font-semibold">{{ item.usuario?.organizacao || item.usuario?.nome }}</h2>
                <p class="break-all text-sm text-base-content/60">Contato: {{ item.usuario?.nome }} · {{ item.usuario?.email }}</p>
                @if (item.cadastro.tipo === 'escola') {
                  <p class="mt-1 text-sm">Equipe: {{ item.cadastro.nome_equipe }} · {{ item.cadastro.alunos.length }} integrante(s)</p>
                } @else {
                  <p class="mt-1 text-sm">{{ item.cadastro.nome_escola }} · {{ item.cadastro.serie }} · Responsável: {{ item.cadastro.responsavel }}</p>
                }
                <p class="mt-1 text-sm text-base-content/60">{{ modalidadeNome(item.cadastro.modalidade_id) }} · {{ rotuloStatusParticipante(item.cadastro.status) }}</p>
              </div>
              @if (item.cadastro.status === 'pendente') {
                <div class="flex shrink-0 gap-2">
                  <button class="btn btn-primary btn-sm min-h-11 sm:min-h-8" (click)="avaliarParticipante(item.cadastro.id, 'aprovada')">Aprovar</button>
                  <button class="btn btn-ghost btn-sm min-h-11 sm:min-h-8 text-error" (click)="avaliarParticipante(item.cadastro.id, 'rejeitada')">Recusar</button>
                </div>
              }
            </div>
          </article>
        } @empty {
          <p class="rounded-lg bg-base-100 p-5 text-sm text-base-content/60">Nenhum participante cadastrado.</p>
        }
      </section>
    }

    @if (aba() === 'cargos') {
      <section class="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <form class="h-fit rounded-xl border border-base-300 bg-base-100 p-4 sm:p-5" (submit)="criarCargo($event)">
          <h2 class="font-semibold">Criar cargo voluntário</h2>
          <label class="form-control mt-3 w-full">
            <span class="label-text mb-1">Nome do cargo</span>
            <input class="input input-bordered w-full" required [value]="nomeCargo()" (input)="nomeCargo.set(valorDo($event))" />
          </label>
          <label class="form-control mt-3 w-full">
            <span class="label-text mb-1">Descrição</span>
            <textarea class="textarea textarea-bordered w-full" rows="3" [value]="descricaoCargo()" (input)="descricaoCargo.set(valorDo($event))"></textarea>
          </label>
          <label class="form-control mt-3 w-full">
            <span class="label-text mb-1">Vagas</span>
            <input class="input input-bordered w-full" type="number" min="1" step="1" required [value]="vagasCargo()" (input)="vagasCargo.set(+valorDo($event))" />
          </label>
          <button class="btn btn-primary mt-4 w-full" type="submit">Adicionar cargo</button>
        </form>

        <div class="grid gap-3">
          @for (cargo of cargos(); track cargo.id) {
            <article class="rounded-xl border border-base-300 bg-base-100 p-4">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 class="font-semibold">{{ cargo.nome }}</h3>
                  <p class="mt-1 text-sm text-base-content/60">{{ cargo.descricao }}</p>
                </div>
                <span class="badge badge-outline">{{ cargo.vagas_restantes }} de {{ cargo.vagas_total }} livres</span>
              </div>
              <label class="form-control mt-3 max-w-48">
                <span class="label-text mb-1 text-xs">Total de vagas</span>
                <input class="input input-bordered input-sm w-full" type="number" min="1" step="1" [value]="cargo.vagas_total" (change)="atualizarVagas(cargo.id, $event)" />
              </label>
            </article>
          }
        </div>
      </section>
    }
  `,
})
export class UsersComponent {
  readonly store = inject(StoreService);
  readonly perfis = PERFIS;
  readonly permissoesVoluntario = PERMISSOES_VOLUNTARIO;
  readonly aba = signal<Aba>('voluntarios');
  readonly mensagem = signal('');
  readonly nomeCargo = signal('');
  readonly descricaoCargo = signal('');
  readonly vagasCargo = signal(1);

  readonly voluntarios = computed(() => {
    const db = this.store.db();
    return db.usuarios.filter((usuario) => this.tipoConta(usuario) === 'voluntario').map((usuario) => {
      const inscricao = db.inscricoesVoluntarios.find((item) => item.usuario_id === usuario.id);
      return { usuario, inscricao, cargo: inscricao && db.cargosVoluntarios.find((cargo) => cargo.id === inscricao.cargo_id) };
    });
  });

  readonly parcerias = computed(() => {
    const db = this.store.db();
    return db.parcerias.map((parceria) => ({ parceria, usuario: db.usuarios.find((user) => user.id === parceria.usuario_id) }));
  });

  readonly participantes = computed(() => {
    const db = this.store.db();
    return db.cadastrosParticipantes.map((cadastro) => ({ cadastro, usuario: db.usuarios.find((user) => user.id === cadastro.usuario_id) }));
  });

  readonly cargos = computed(() => {
    const db = this.store.db();
    return db.cargosVoluntarios.map((cargo) => {
      const ocupadas = db.inscricoesVoluntarios.filter(
        (inscricao) => inscricao.cargo_id === cargo.id && inscricao.status !== 'rejeitada',
      ).length;
      return { ...cargo, vagas_restantes: Math.max(0, cargo.vagas_total - ocupadas) };
    });
  });

  valorDo(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  temPermissao(usuario: Usuario, chave: string): boolean {
    return usuario.permissoes?.includes(chave) ?? (PERMISSOES[chave] ?? []).includes(usuario.perfil);
  }

  alternarPermissao(usuario: Usuario, chave: string, event: Event): void {
    const selecionado = (event.target as HTMLInputElement).checked;
    const atuais = usuario.permissoes ?? Object.entries(PERMISSOES)
      .filter(([, perfis]) => perfis.includes(usuario.perfil))
      .map(([permissao]) => permissao);
    const atualizadas = selecionado
      ? [...atuais, chave]
      : atuais.filter((item) => item !== chave);
    const resultado = this.store.atualizarPermissoesUsuario(usuario.id, atualizadas);
    this.mensagem.set(resultado.ok ? 'Permissões atualizadas.' : resultado.erro ?? 'Não foi possível atualizar as permissões.');
  }

  avaliarVoluntario(id: number, status: 'aprovada' | 'rejeitada'): void {
    const resultado = this.store.avaliarInscricaoVoluntario(id, status);
    this.mensagem.set(resultado.ok ? 'Inscrição voluntária atualizada.' : resultado.erro ?? 'Não foi possível atualizar a inscrição.');
  }

  avaliarParceria(id: number, status: 'aprovada' | 'recusada'): void {
    const resultado = this.store.avaliarParceria(id, status);
    this.mensagem.set(resultado.ok ? 'Proposta de parceria atualizada.' : resultado.erro ?? 'Não foi possível atualizar a proposta.');
  }

  avaliarParticipante(id: number, status: 'aprovada' | 'rejeitada'): void {
    const resultado = this.store.avaliarCadastroParticipante(id, status);
    this.mensagem.set(resultado.ok ? 'Inscrição de participante atualizada.' : resultado.erro ?? 'Não foi possível atualizar a inscrição.');
  }

  criarCargo(event: Event): void {
    event.preventDefault();
    const resultado = this.store.criarCargoVoluntario({
      nome: this.nomeCargo(), descricao: this.descricaoCargo(), vagas_total: this.vagasCargo(),
    });
    this.mensagem.set(resultado.ok ? 'Cargo voluntário criado.' : resultado.erro ?? 'Não foi possível criar o cargo.');
    if (resultado.ok) {
      this.nomeCargo.set('');
      this.descricaoCargo.set('');
      this.vagasCargo.set(1);
    }
  }

  atualizarVagas(id: number, event: Event): void {
    const resultado = this.store.atualizarVagasCargoVoluntario(id, Number(this.valorDo(event)));
    this.mensagem.set(resultado.ok ? 'Quantidade de vagas atualizada.' : resultado.erro ?? 'Não foi possível atualizar as vagas.');
  }

  modalidadeNome(id: number): string {
    return this.store.db().modalidades.find((modalidade) => modalidade.id === id)?.nome ?? 'Modalidade indisponível';
  }

  rotuloStatusVoluntario(status: string): string {
    return ({ pendente: 'Aguardando análise', aprovada: 'Aprovada', rejeitada: 'Recusada' } as Record<string, string>)[status] ?? status;
  }

  rotuloStatusParticipante(status: string): string {
    return ({ pendente: 'Em análise', aprovada: 'Aprovada', rejeitada: 'Recusada' } as Record<string, string>)[status] ?? status;
  }

  rotuloStatusParceria(status: string): string {
    return ({ em_analise: 'Em análise', aprovada: 'Aprovada', recusada: 'Recusada' } as Record<string, string>)[status] ?? status;
  }

  private tipoConta(usuario: Usuario): TipoConta {
    return usuario.tipo_conta ??
      (usuario.perfil === 'administrador' ? 'administrador' :
        usuario.perfil === 'empresa' ? 'empresa' :
          usuario.perfil === 'participante' ? 'participante' : 'voluntario');
  }
}
