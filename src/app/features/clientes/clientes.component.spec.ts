import { birthdayInfo, matchesSearch } from './clientes.component';
import { CustomerListItem } from '../../models';

function customer(birthDate: string, extra: Partial<CustomerListItem> = {}): CustomerListItem {
  return { id: '1', fullName: 'Ana Pérez', dni: '30111222', birthDate, createdAt: '2026-01-01T00:00:00Z', ...extra };
}

describe('Clientes - cumpleaños', () => {
  const today = new Date(2026, 10, 25); // 25/11/2026

  it('detecta el cumpleaños de hoy y la edad que cumple', () => {
    const info = birthdayInfo(customer('1990-11-25'), today);
    expect(info.daysUntil).toBe(0);
    expect(info.turningAge).toBe(36);
  });

  it('calcula los días hasta un cumpleaños próximo', () => {
    expect(birthdayInfo(customer('2000-11-26'), today).daysUntil).toBe(1);
    expect(birthdayInfo(customer('2000-12-10'), today).daysUntil).toBe(15);
  });

  it('un cumpleaños ya pasado cae el año siguiente', () => {
    const info = birthdayInfo(customer('1995-11-24'), today);
    expect(info.nextBirthday.getFullYear()).toBe(2027);
    expect(info.turningAge).toBe(32);
  });

  it('el 29/02 se festeja el 28/02 en años no bisiestos', () => {
    const info = birthdayInfo(customer('2004-02-29'), new Date(2027, 1, 28));
    expect(info.daysUntil).toBe(0);
  });

  it('busca por nombre, DNI o sucursal', () => {
    const c = customer('1990-01-01', { companyName: 'Colón' });
    expect(matchesSearch(c, 'ana')).toBeTrue();
    expect(matchesSearch(c, '30111')).toBeTrue();
    expect(matchesSearch(c, 'colón')).toBeTrue();
    expect(matchesSearch(c, 'juan')).toBeFalse();
  });
});
