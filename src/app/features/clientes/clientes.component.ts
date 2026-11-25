import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '../../core/services/api.service';
import { CustomerListItem } from '../../models';

export interface BirthdayRow {
  customer: CustomerListItem;
  /** Días hasta el próximo cumpleaños (0 = hoy). */
  daysUntil: number;
  /** Edad que cumple. */
  turningAge: number;
  nextBirthday: Date;
}

/** Días que se muestran en "Próximos cumpleaños". */
export const UPCOMING_BIRTHDAY_DAYS = 30;

/** Próximo cumpleaños a partir de hoy (el 29/02 se festeja el 28/02 en años no bisiestos). */
export function birthdayInfo(customer: CustomerListItem, today: Date): BirthdayRow {
  const [y, m, d] = customer.birthDate.split('-').map(Number);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const onYear = (year: number) => {
    const lastDay = new Date(year, m, 0).getDate();
    return new Date(year, m - 1, Math.min(d, lastDay));
  };
  let next = onYear(base.getFullYear());
  if (next < base) next = onYear(base.getFullYear() + 1);
  const daysUntil = Math.round((next.getTime() - base.getTime()) / 86_400_000);
  return { customer, daysUntil, turningAge: next.getFullYear() - y, nextBirthday: next };
}

export function matchesSearch(c: CustomerListItem, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return [c.fullName, c.dni, c.whatsapp, c.email, c.companyName]
    .some(v => (v ?? '').toLowerCase().includes(q));
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTableModule, MatTabsModule],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss'
})
export class ClientesComponent implements OnInit {
  private api = inject(ApiService);

  readonly upcomingDays = UPCOMING_BIRTHDAY_DAYS;
  readonly customers = signal<CustomerListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');

  readonly displayedColumns = ['fullName', 'dni', 'birthDate', 'contact', 'company', 'createdAt'];

  readonly filtered = computed(() => this.customers().filter(c => matchesSearch(c, this.search())));

  private readonly birthdays = computed(() => {
    const today = new Date();
    return this.customers()
      .map(c => birthdayInfo(c, today))
      .sort((a, b) => a.daysUntil - b.daysUntil || a.customer.fullName.localeCompare(b.customer.fullName));
  });

  readonly birthdaysToday = computed(() => this.birthdays().filter(b => b.daysUntil === 0));
  readonly birthdaysUpcoming = computed(() =>
    this.birthdays().filter(b => b.daysUntil > 0 && b.daysUntil <= UPCOMING_BIRTHDAY_DAYS));

  ngOnInit(): void {
    this.api.getCustomers().subscribe({
      next: (list) => {
        this.customers.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'No se pudieron cargar los clientes');
        this.loading.set(false);
      }
    });
  }

  age(c: CustomerListItem): number {
    const info = birthdayInfo(c, new Date());
    return info.daysUntil === 0 ? info.turningAge : info.turningAge - 1;
  }

  daysLabel(days: number): string {
    return days === 1 ? 'Mañana' : `En ${days} días`;
  }
}
