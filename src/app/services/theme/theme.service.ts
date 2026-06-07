import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'wf-theme';
  isDark = signal<boolean>(this.loadTheme());

  private loadTheme(): boolean {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved !== null ? saved === 'dark' : false; // light por defecto
  }

  toggle(): void {
    this.isDark.update(v => !v);
    localStorage.setItem(this.STORAGE_KEY, this.isDark() ? 'dark' : 'light');
    this.applyTheme();
  }

  applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.isDark() ? 'dark' : 'light');
  }

  init(): void {
    this.applyTheme();
  }
}

