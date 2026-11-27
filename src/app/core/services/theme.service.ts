import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'pos_theme';
export const DARK_THEME_CLASS = 'dark-theme';

/**
 * Modo claro / oscuro. Se guarda por dispositivo; si nunca se eligió, sigue la preferencia del sistema.
 * index.html aplica la clase antes de que arranque Angular para evitar el parpadeo.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.initialMode());

  constructor() {
    this.apply(this.mode());
  }

  toggle(): void {
    this.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Sin almacenamiento disponible: el modo vale solo para esta sesión.
    }
    this.apply(mode);
  }

  private initialMode(): ThemeMode {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignorar
    }
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private apply(mode: ThemeMode): void {
    const root = document.documentElement;
    root.classList.toggle(DARK_THEME_CLASS, mode === 'dark');
    root.style.colorScheme = mode;
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', mode === 'dark' ? '#0f1117' : '#4f46e5');
  }
}
