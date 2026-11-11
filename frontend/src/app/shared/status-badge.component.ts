import { Component, computed, input } from '@angular/core';

const MAPA: Record<string, { rotulo: string; classe: string }> = {
  planejada: { rotulo: 'Planejada', classe: 'badge-ghost' },
  inscricoes: { rotulo: 'Inscrições', classe: 'badge-info' },
  em_andamento: { rotulo: 'Em andamento', classe: 'badge-warning' },
  encerrada: { rotulo: 'Encerrada', classe: 'badge-neutral' },
  cancelada: { rotulo: 'Cancelada', classe: 'badge-error' },
  submetida: { rotulo: 'Submetida', classe: 'badge-info' },
  em_analise: { rotulo: 'Em análise', classe: 'badge-warning' },
  aprovada: { rotulo: 'Aprovada', classe: 'badge-success' },
  rejeitada: { rotulo: 'Rejeitada', classe: 'badge-error' },
  concluida: { rotulo: 'Concluída', classe: 'badge-success' },
  homologada: { rotulo: 'Homologada', classe: 'badge-info' },
  publicada: { rotulo: 'Publicada', classe: 'badge-primary' },
  retificada: { rotulo: 'Retificada', classe: 'badge-warning' },
  pendente: { rotulo: 'Pendente', classe: 'badge-ghost' },
  revogada: { rotulo: 'Revogada', classe: 'badge-ghost' },
  rascunho: { rotulo: 'Rascunho', classe: 'badge-ghost' },
  agendada: { rotulo: 'Agendada', classe: 'badge-info' },
  wo: { rotulo: 'W.O.', classe: 'badge-error' },
  confirmada: { rotulo: 'Confirmada', classe: 'badge-success' },
  inscrita: { rotulo: 'Inscrita', classe: 'badge-info' },
  desclassificada: { rotulo: 'Desclassificada', classe: 'badge-error' },
  desistente: { rotulo: 'Desistente', classe: 'badge-ghost' },
};

@Component({
  selector: 'app-status-badge',
  template: `
    <span class="badge badge-sm gap-1 border-0 font-medium" [class]="estilo().classe">
      @if (ponto()) {
        <span class="size-1.5 rounded-full bg-current opacity-70"></span>
      }
      {{ estilo().rotulo }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly ponto = input(false);
  readonly estilo = computed(() => {
    const chave = this.status();
    return MAPA[chave] ?? { rotulo: chave.replaceAll('_', ' '), classe: 'badge-ghost' };
  });
}
