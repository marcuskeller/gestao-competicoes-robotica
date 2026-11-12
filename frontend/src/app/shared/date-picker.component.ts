import { Component, CUSTOM_ELEMENTS_SCHEMA, input, output, signal } from '@angular/core';
import 'cally';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-date-picker',
  imports: [IconComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="relative w-full">
      <button
        class="input input-bordered flex w-full items-center justify-between gap-3 text-left font-normal"
        type="button"
        [id]="id()"
        [attr.aria-label]="label()"
        [attr.aria-expanded]="aberto()"
        aria-haspopup="dialog"
        (click)="aberto.update((value) => !value)"
      >
        <span [class.text-base-content/50]="!value()">{{ textoData() }}</span>
        <app-icon nome="calendar" classe="size-4 shrink-0 text-base-content/60" />
      </button>

      @if (aberto()) {
        <div class="absolute left-0 top-full z-30 mt-1 rounded-box border border-base-300 bg-base-100 p-3 shadow-xl" role="dialog" [attr.aria-label]="'Selecionar ' + label()">
          <calendar-date
            class="cally"
            locale="pt-BR"
            [attr.value]="value() || null"
            (change)="selecionarData($event)"
          >
            <app-icon slot="previous" nome="arrow" classe="size-4 rotate-180" />
            <app-icon slot="next" nome="arrow" classe="size-4" />
            <calendar-month></calendar-month>
          </calendar-date>
        </div>
      }
    </div>
  `,
})
export class DatePickerComponent {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input('');
  readonly valueChange = output<string>();
  readonly aberto = signal(false);

  textoData(): string {
    const value = this.value();
    if (!value) return 'Selecione uma data';
    const data = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(data);
  }

  selecionarData(event: Event): void {
    const data = (event.target as HTMLElement & { value?: string }).value;
    if (!data) return;
    this.valueChange.emit(data);
    this.aberto.set(false);
  }
}
