import { Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  template: `
    <div class="grid place-items-center rounded-xl border border-dashed border-base-300 bg-base-100/60 px-6 py-14 text-center">
      <span class="grid size-12 place-items-center rounded-full bg-base-200 text-base-content/40">
        <app-icon [nome]="icone()" classe="size-6" />
      </span>
      <h3 class="mt-4 font-display text-base font-semibold">{{ titulo() }}</h3>
      <p class="mt-1 max-w-md text-sm text-base-content/55">{{ descricao() }}</p>
      <div class="mt-4 empty:hidden"><ng-content /></div>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly titulo = input.required<string>();
  readonly descricao = input('');
  readonly icone = input('spark');
}
