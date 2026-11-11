import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="mb-6 flex flex-col gap-4 border-b border-base-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        @if (modulo()) {
          <div class="mb-2 flex items-center gap-2">
            <span class="badge badge-outline badge-xs font-mono uppercase tracking-widest text-base-content/60">{{ modulo() }}</span>
            @if (contexto()) {
              <span class="text-xs text-base-content/50">{{ contexto() }}</span>
            }
          </div>
        }
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ titulo() }}</h1>
        @if (subtitulo()) {
          <p class="mt-1.5 max-w-3xl text-sm leading-relaxed text-base-content/65">{{ subtitulo() }}</p>
        }
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
  readonly modulo = input('');
  readonly contexto = input('');
}
