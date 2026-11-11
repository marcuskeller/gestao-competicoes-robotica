import { Component, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  template: `
    @if (aberto()) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-neutral/50 p-4 backdrop-blur-sm" (click)="fechar.emit()">
        <div
          class="w-full max-w-lg rounded-2xl border border-base-300 bg-base-100 shadow-xl"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="titulo()"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4 border-b border-base-200 p-5">
            <div>
              <h2 class="font-display text-lg font-semibold">{{ titulo() }}</h2>
              @if (descricao()) {
                <p class="mt-1 text-sm text-base-content/60">{{ descricao() }}</p>
              }
            </div>
            <button class="btn btn-ghost btn-sm btn-circle" type="button" (click)="fechar.emit()" aria-label="Fechar">
              <app-icon nome="close" classe="size-4" />
            </button>
          </div>
          <div class="max-h-[70vh] overflow-y-auto p-5">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  readonly aberto = input(false);
  readonly titulo = input.required<string>();
  readonly descricao = input('');
  readonly fechar = output<void>();
}
