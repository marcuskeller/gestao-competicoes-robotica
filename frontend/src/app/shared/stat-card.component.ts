import { Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-stat-card',
  imports: [IconComponent],
  template: `
    <div class="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-base-content/50">{{ rotulo() }}</p>
          <p class="mt-2 font-display text-3xl font-semibold leading-none">{{ valor() }}</p>
          @if (detalhe()) {
            <p class="mt-2 text-xs text-base-content/55">{{ detalhe() }}</p>
          }
        </div>
        @if (icone()) {
          <span class="grid size-10 place-items-center rounded-lg" [class]="cor()">
            <app-icon [nome]="icone()" classe="size-5" />
          </span>
        }
      </div>
    </div>
  `,
})
export class StatCardComponent {
  readonly rotulo = input.required<string>();
  readonly valor = input.required<string | number>();
  readonly detalhe = input('');
  readonly icone = input('');
  readonly cor = input('bg-primary/10 text-primary');
}
