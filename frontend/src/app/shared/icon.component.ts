import { Component, computed, input } from '@angular/core';
import {
  LucideArrowRight,
  LucideAward,
  LucideBarcode,
  LucideBookOpen,
  LucideChartNoAxesColumnIncreasing,
  LucideCheck,
  LucideClipboardCheck,
  LucideClock,
  LucideCodeXml,
  LucideCreditCard,
  LucideDynamicIcon,
  LucideExternalLink,
  LucideFileClock,
  LucideFlag,
  LucideGitBranch,
  LucideGlobe,
  LucideIcon,
  LucideLayers,
  LucideLayoutDashboard,
  LucideLockKeyhole,
  LucideLogOut,
  LucideMenu,
  LucidePlus,
  LucideQrCode,
  LucideRefreshCw,
  LucideSchool,
  LucideSearch,
  LucideShieldCheck,
  LucideSparkles,
  LucideTarget,
  LucideTrophy,
  LucideTrash,
  LucideTriangleExclamationPoint,
  LucideUsersRound,
  LucideX,
  LucideZap,
} from '@lucide/angular';

const ICONS: Record<string, LucideIcon> = {
  dashboard: LucideLayoutDashboard,
  trophy: LucideTrophy,
  layers: LucideLayers,
  book: LucideBookOpen,
  school: LucideSchool,
  users: LucideUsersRound,
  clipboard: LucideClipboardCheck,
  barcode: LucideBarcode,
  creditcard: LucideCreditCard,
  bracket: LucideGitBranch,
  target: LucideTarget,
  chart: LucideChartNoAxesColumnIncreasing,
  badge: LucideAward,
  shield: LucideShieldCheck,
  history: LucideFileClock,
  code: LucideCodeXml,
  globe: LucideGlobe,
  logout: LucideLogOut,
  menu: LucideMenu,
  close: LucideX,
  plus: LucidePlus,
  qrcode: LucideQrCode,
  check: LucideCheck,
  trash: LucideTrash,
  arrow: LucideArrowRight,
  alert: LucideTriangleExclamationPoint,
  refresh: LucideRefreshCw,
  search: LucideSearch,
  external: LucideExternalLink,
  lock: LucideLockKeyhole,
  spark: LucideSparkles,
  clock: LucideClock,
  flag: LucideFlag,
  bolt: LucideZap,
};

@Component({
  selector: 'app-icon',
  imports: [LucideDynamicIcon],
  template: `
    <svg
      [lucideIcon]="icone()"
      [strokeWidth]="espessura()"
      [class]="classe()"
      aria-hidden="true"
    ></svg>
  `,
})
export class IconComponent {
  readonly nome = input.required<string>();
  readonly classe = input('size-5');
  readonly espessura = input(1.8);
  readonly icone = computed(() => ICONS[this.nome()] ?? ICONS['spark']);
}
