import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';

@Component({
  selector: 'app-participants',
  imports: [RouterLink],
  template: `
    <header>
      <p class="text-sm font-semibold text-primary">ÁREA DE PARTICIPANTES</p>
      <h1 class="mt-2 text-3xl font-semibold">Minha inscrição</h1>
      <p class="mt-2 text-base-content/60">
        {{ store.usuario()?.organizacao || store.usuario()?.nome }}
      </p>
    </header>

    <section class="mt-7 max-w-3xl rounded-2xl border border-base-300 bg-base-100 p-5 sm:p-7">
      @if (cadastro(); as inscricao) {
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">
              {{ inscricao.tipo === 'escola' ? 'Inscrição da escola' : 'Inscrição individual' }}
            </p>
            <h2 class="mt-1 text-xl font-semibold">
              {{ inscricao.tipo === 'escola' ? inscricao.nome_equipe : inscricao.equipe_nome || 'Participante' }}
            </h2>
          </div>
          <span class="badge badge-outline">{{ rotuloStatus(inscricao.status) }}</span>
        </div>

        <dl class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg bg-base-200 p-4">
            <dt class="text-xs uppercase tracking-wide text-base-content/60">Escola</dt>
            <dd class="mt-1 font-medium">{{ inscricao.nome_escola }}</dd>
          </div>
          <div class="rounded-lg bg-base-200 p-4">
            <dt class="text-xs uppercase tracking-wide text-base-content/60">Modalidade</dt>
            <dd class="mt-1 font-medium">{{ modalidadeNome(inscricao.modalidade_id) }}</dd>
          </div>
        </dl>

        @if (inscricao.tipo === 'escola') {
          <h3 class="mt-6 font-semibold">Equipe cadastrada</h3>
          <ul class="mt-2 grid gap-2 sm:grid-cols-2">
            @for (aluno of inscricao.alunos; track $index) {
              <li class="rounded-lg border border-base-300 p-3 text-sm">
                {{ aluno.nome }} <span class="text-base-content/60">· {{ aluno.serie }}</span>
              </li>
            }
          </ul>
        } @else {
          <p class="mt-4 text-sm text-base-content/70">
            Responsável: {{ inscricao.responsavel }} · {{ inscricao.telefone_responsavel }}
          </p>
        }
      } @else {
        <p class="rounded-lg bg-info/10 p-4 text-sm leading-6">
          Seu perfil está criado, mas ainda não há uma inscrição vinculada. Entre em contato com a
          escola responsável para concluir a inscrição na modalidade.
        </p>
      }

      <p class="mt-5 rounded-lg bg-base-200 p-4 text-xs leading-5 text-base-content/65">
        As informações de estudantes são privadas e não aparecem no portal público de resultados.
      </p>
      <a class="btn btn-primary mt-5 w-full sm:w-auto" routerLink="/publico">Consultar resultados públicos</a>
    </section>
  `,
})
export class ParticipantsComponent {
  readonly store = inject(StoreService);

  readonly cadastro = computed(() => {
    const usuarioId = this.store.usuario()?.id;
    return this.store.db().cadastrosParticipantes.find((item) => item.usuario_id === usuarioId);
  });

  modalidadeNome(id: number): string {
    return this.store.db().modalidades.find((item) => item.id === id)?.nome ?? 'Modalidade indisponível';
  }

  rotuloStatus(status: string): string {
    return ({ pendente: 'Em análise', aprovada: 'Aprovada', rejeitada: 'Não aprovada' } as Record<string, string>)[status] ?? status;
  }
}
