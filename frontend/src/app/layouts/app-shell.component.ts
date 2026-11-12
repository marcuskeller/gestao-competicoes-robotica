import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StoreService } from '../core/store.service';
import { PERFIS } from '../core/permissions';
import { IconComponent } from '../shared/icon.component';

interface ItemNav {
  modulo: string;
  rotulo: string;
  rota: string;
  icone: string;
  acao?: string;
}

interface GrupoNav {
  titulo: string;
  itens: ItemNav[];
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="min-h-dvh bg-base-200/60 text-base-content">
      @if (menuAberto()) {
        <button
          class="fixed inset-0 z-30 bg-neutral/40 backdrop-blur-sm lg:hidden"
          type="button"
          aria-label="Fechar menu"
          (click)="menuAberto.set(false)"
        ></button>
      }

      <aside
        class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-base-300 bg-base-100 transition-transform lg:translate-x-0"
        [class.-translate-x-full]="!menuAberto()"
      >
        <a
          routerLink="/"
          class="flex items-center gap-2.5 border-b border-base-200 px-5 py-5"
          (click)="menuAberto.set(false)"
        >
          <span class="grid size-9 place-items-center rounded-lg bg-primary text-primary-content">
            <app-icon nome="bolt" classe="size-5" />
          </span>
          <span class="min-w-0">
            <span class="block font-display text-sm font-semibold leading-tight"
              >Arena Robótica</span
            >
            <span class="block truncate text-[11px] text-base-content/50"
              >Gestão de competições</span
            >
          </span>
        </a>

        <nav class="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
          @for (grupo of grupos; track grupo.titulo) {
            <p
              class="mb-1 mt-4 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/40 first:mt-0"
            >
              {{ grupo.titulo }}
            </p>
            @for (item of grupo.itens; track item.rota) {
              @if (!item.acao || store.podeFazer(item.acao)) {
                <a
                  [routerLink]="item.rota"
                  routerLinkActive="bg-primary/10 text-primary"
                  [routerLinkActiveOptions]="{ exact: item.rota === '/app/dashboard' }"
                  class="mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
                  (click)="menuAberto.set(false)"
                >
                  <app-icon [nome]="item.icone" classe="size-4 shrink-0" />
                  <span class="truncate">{{ item.rotulo }}</span>
                  <span class="ml-auto font-mono text-[10px] text-base-content/30">{{
                    item.modulo
                  }}</span>
                </a>
              }
            }
          }
        </nav>

        <div class="border-t border-base-200 p-3">
          <a
            routerLink="/publico"
            target="_blank"
            class="btn btn-ghost btn-sm w-full justify-start gap-2 text-base-content/70"
          >
            <app-icon nome="globe" classe="size-4" />
            Portal público
            <app-icon nome="external" classe="ml-auto size-3.5 opacity-50" />
          </a>
        </div>
      </aside>

      <div class="lg:pl-64">
        <header
          class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-base-300 bg-base-100/90 px-4 backdrop-blur sm:px-6"
        >
          <button
            class="btn btn-ghost btn-sm btn-square lg:hidden"
            type="button"
            (click)="menuAberto.set(true)"
            aria-label="Abrir menu"
          >
            <app-icon nome="menu" classe="size-5" />
          </button>

          <div class="hidden min-w-0 items-center gap-2 sm:flex">
            <span class="badge badge-sm border-0 bg-base-200 font-medium text-base-content/70">
              {{ store.edicaoAtiva()?.nome ?? 'Sem edição' }}
            </span>
            <span class="font-mono text-[11px] text-base-content/40">{{
              store.edicaoAtiva()?.local
            }}</span>
          </div>

          <div class="ml-auto flex items-center gap-2">
            @if (store.usuario(); as usuario) {
              <div
                class="hidden items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1 sm:flex"
              >
                <span class="text-[11px] font-medium uppercase tracking-wide text-base-content/40"
                  >Perfil demo</span
                >
                <select
                  class="select select-ghost select-xs w-40 font-medium"
                  [value]="usuario.email"
                  (change)="trocarPerfil($event)"
                  aria-label="Trocar perfil de demonstração"
                >
                  @for (u of store.db().usuarios; track u.id) {
                    <option [value]="u.email">
                      {{ rotuloPerfil(u.perfil) }} — {{ u.nome.split(' ')[0] }}
                    </option>
                  }
                </select>
              </div>
              <div class="flex items-center gap-2.5">
                <div class="hidden text-right sm:block">
                  <p class="text-xs font-semibold leading-tight">{{ usuario.nome }}</p>
                  <p class="text-[11px] text-base-content/50">{{ rotuloPerfil(usuario.perfil) }}</p>
                </div>
                <div class="avatar avatar-placeholder">
                  <div class="w-9 rounded-full bg-primary/12 text-primary">
                    <span class="text-xs font-semibold">{{ iniciais(usuario.nome) }}</span>
                  </div>
                </div>
                <button
                  class="btn btn-ghost btn-sm btn-square"
                  type="button"
                  (click)="sair()"
                  aria-label="Sair"
                >
                  <app-icon nome="logout" classe="size-4" />
                </button>
              </div>
            }
          </div>
        </header>

        <main class="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AppShellComponent {
  readonly store = inject(StoreService);
  private readonly router = inject(Router);
  readonly menuAberto = signal(false);

  readonly grupos: GrupoNav[] = [
    {
      titulo: 'Operação',
      itens: [{ modulo: 'M0', rotulo: 'Visão geral', rota: '/app/dashboard', icone: 'dashboard' }],
    },
    {
      titulo: 'Configuração',
      itens: [
        { modulo: 'M1', rotulo: 'Edições', rota: '/app/edicoes', icone: 'trophy' },
        {
          modulo: 'M2',
          rotulo: 'Modalidades e critérios',
          rota: '/app/modalidades',
          icone: 'layers',
        },
        { modulo: 'M3', rotulo: 'Regras versionadas', rota: '/app/regras', icone: 'book' },
        { modulo: 'M4', rotulo: 'Escolas e equipes', rota: '/app/escolas', icone: 'school' },
        { modulo: 'M4', rotulo: 'Equipes', rota: '/app/equipes', icone: 'users' },
      ],
    },
    {
      titulo: 'Competição',
      itens: [
        { modulo: 'M5', rotulo: 'Inscrições', rota: '/app/inscricoes', icone: 'clipboard' },
        { modulo: 'M6', rotulo: 'Etapas e chaveamento', rota: '/app/etapas', icone: 'bracket' },
        { modulo: 'M7', rotulo: 'Disputas', rota: '/app/disputas', icone: 'flag' },
      ],
    },
    {
      titulo: 'Resultados',
      itens: [
        { modulo: 'M8', rotulo: 'Lançamento de pontos', rota: '/app/resultados', icone: 'target' },
        { modulo: 'M9', rotulo: 'Classificação', rota: '/app/classificacao', icone: 'chart' },
        {
          modulo: 'M10',
          rotulo: 'Homologação e publicação',
          rota: '/app/publicacao',
          icone: 'badge',
        },
      ],
    },
    {
      titulo: 'Governança',
      itens: [
        {
          modulo: 'M11',
          rotulo: 'Trilha de auditoria',
          rota: '/app/auditoria',
          icone: 'history',
          acao: 'auditoria.ver',
        },
        { modulo: 'M14', rotulo: 'Interoperabilidade', rota: '/app/interop', icone: 'code' },
      ],
    },
  ];

  rotuloPerfil(perfil: keyof typeof PERFIS): string {
    return PERFIS[perfil].rotulo;
  }

  iniciais(nome: string): string {
    return nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  }

  trocarPerfil(evento: Event): void {
    const email = (evento.target as HTMLSelectElement).value;
    this.store.entrar(email);
    this.router.navigate(['/app/dashboard']);
  }

  sair(): void {
    this.store.sair();
    this.router.navigate(['/login']);
  }
}
