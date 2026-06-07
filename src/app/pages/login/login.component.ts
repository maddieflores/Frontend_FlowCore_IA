import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-container">

        <!-- Logo / Icon -->
        <div class="logo-box">
          <svg class="logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 22 7 22 17 12 22 2 17 2 7" />
            <line x1="12" y1="2" x2="12" y2="12" />
            <line x1="2" y1="17" x2="12" y2="12" />
            <line x1="22" y1="17" x2="12" y2="12" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </div>

        <!-- Flowcore badge -->
        <div class="badge-flowcore">
          <span class="orange-dot"></span>
          <span class="badge-text">FLOWCORE IA · 2026</span>
        </div>

        <!-- Heading -->
        <h1 class="welcome-title">Bienvenido de vuelta</h1>
        <p class="welcome-subtitle">
          Ingresa a tu espacio de<br>gestión inteligente.
        </p>

        <!-- Card -->
        <div class="login-card">
          <!-- Email Input -->
          <div class="form-group">
            <label class="form-label">CORREO ELECTRÓNICO</label>
            <input
              type="email"
              [(ngModel)]="email"
              placeholder="tu@empresa.com"
              class="form-input"
              name="email"
            />
          </div>

          <!-- Password Input -->
          <div class="form-group">
            <div class="label-row">
              <label class="form-label">CONTRASEÑA</label>
              <span class="forgot-link">¿La olvidaste?</span>
            </div>
            <input
              type="password"
              [(ngModel)]="password"
              placeholder="••••••••"
              class="form-input"
              name="password"
            />
          </div>

          <!-- Checkbox -->
          <div class="checkbox-row">
            <label class="checkbox-container">
              <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" />
              <span class="checkmark"></span>
              <span class="checkbox-label">Recordar este dispositivo</span>
            </label>
          </div>

          <!-- Submit Button -->
          <button class="btn-submit" (click)="login()" [disabled]="loading">
            @if (loading) {
              <span class="btn-spinner"></span> Iniciando...
            } @else {
              Ingresar <span class="arrow">→</span>
            }
          </button>

          <!-- Error Alert -->
          @if (error) {
            <div class="error-container">
              <p class="error-msg">{{ error }}</p>
            </div>
          }
        </div>

        <!-- Footer -->
        <p class="footer-text">
          ¿No tienes cuenta? <span class="footer-link">Solicita acceso</span>
        </p>

      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      padding: 40px 20px;
      position: relative;
      overflow-x: hidden;
      background-color: #FAF8F5;
      background-image:
        radial-gradient(circle at 50% -10%, hsla(26, 80%, 92%, 0.8), transparent 50%),
        radial-gradient(circle at 0% 40%, hsla(330, 60%, 94%, 0.6), transparent 45%),
        radial-gradient(circle at 90% 90%, hsla(46, 80%, 92%, 0.8), transparent 50%),
        linear-gradient(to right, rgba(139, 115, 85, 0.045) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(139, 115, 85, 0.045) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 100% 100%, 56px 56px, 56px 56px;
      background-position: center;
    }

    .login-container {
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: fadeIn 0.6s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ── Logo Box ──────────────────────────────────────── */
    .logo-box {
      width: 48px;
      height: 48px;
      background-color: #111318;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(17, 19, 24, 0.15);
    }

    .logo-svg {
      width: 24px;
      height: 24px;
    }

    /* ── Flowcore Badge ────────────────────────────────── */
    .badge-flowcore {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 20px;
      padding: 6px 14px;
      margin-bottom: 24px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    .orange-dot {
      width: 6px;
      height: 6px;
      background-color: #ff5722;
      border-radius: 50%;
      display: inline-block;
    }

    .badge-text {
      font-size: 10px;
      font-weight: 700;
      color: #5c6370;
      letter-spacing: 0.06em;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    /* ── Welcome Typography ────────────────────────────── */
    .welcome-title {
      font-family: 'Playfair Display', serif;
      font-style: italic;
      font-weight: 400;
      font-size: 42px;
      color: #0d1117;
      margin: 0 0 12px 0;
      letter-spacing: -0.01em;
      text-align: center;
    }

    .welcome-subtitle {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 400;
      font-size: 14.5px;
      color: #4b5563;
      text-align: center;
      line-height: 1.5;
      margin: 0 0 36px 0;
    }

    /* ── Login Card ────────────────────────────────────── */
    .login-card {
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01);
      border: 1px solid rgba(0, 0, 0, 0.02);
      width: 100%;
      max-width: 440px;
      padding: 36px 36px;
      box-sizing: border-box;
      margin-bottom: 24px;
    }

    /* ── Form Groups ───────────────────────────────────── */
    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: #6b7280;
      letter-spacing: 0.05em;
      display: block;
      margin-bottom: 8px;
    }

    .form-input {
      width: 100%;
      padding: 14px 16px;
      font-size: 14px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      border: 1.5px solid #e5e7eb;
      border-radius: 12px;
      color: #1f2937;
      outline: none;
      background-color: transparent;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }

    .form-input::placeholder {
      color: #9ca3af;
      font-weight: 400;
    }

    .form-input:focus {
      border-color: #9ca3af;
      box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.1);
    }

    /* ── Password Labels & Forgot Link ──────────────────── */
    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .label-row .form-label {
      margin-bottom: 0;
    }

    .forgot-link {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: #6b7280;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .forgot-link:hover {
      color: #111318;
    }

    /* ── Checkbox Styles ───────────────────────────────── */
    .checkbox-row {
      margin-top: 16px;
      margin-bottom: 24px;
    }

    .checkbox-container {
      display: flex;
      align-items: center;
      position: relative;
      padding-left: 28px;
      cursor: pointer;
      font-size: 13px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #4b5563;
      user-select: none;
    }

    .checkbox-container input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }

    .checkmark {
      position: absolute;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      height: 18px;
      width: 18px;
      background-color: #fff;
      border: 1.5px solid #d1d5db;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .checkbox-container:hover input ~ .checkmark {
      border-color: #9ca3af;
    }

    .checkbox-container input:checked ~ .checkmark {
      background-color: #111318;
      border-color: #111318;
    }

    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }

    .checkbox-container input:checked ~ .checkmark:after {
      display: block;
    }

    .checkbox-container .checkmark:after {
      left: 5px;
      top: 2px;
      width: 5px;
      height: 9px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .checkbox-label {
      font-weight: 500;
      color: #374151;
    }

    /* ── Submit Button ─────────────────────────────────── */
    .btn-submit {
      width: 100%;
      padding: 15px;
      background-color: #111318;
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-size: 14.5px;
      font-weight: 600;
      font-family: 'Plus Jakarta Sans', sans-serif;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .btn-submit:hover:not(:disabled) {
      background-color: #1f232b;
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-submit .arrow {
      transition: transform 0.2s ease;
    }

    .btn-submit:hover:not(:disabled) .arrow {
      transform: translateX(4px);
    }

    /* ── Loading Spinner ───────────────────────────────── */
    .btn-spinner {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* ── Error Container ───────────────────────────────── */
    .error-container {
      margin-top: 16px;
    }

    .error-msg {
      color: #b91c1c;
      font-size: 12.5px;
      text-align: center;
      margin: 0;
      background: #fef2f2;
      border: 1px solid #fca5a5;
      border-radius: 10px;
      padding: 10px 14px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 500;
    }

    /* ── Footer ────────────────────────────────────────── */
    .footer-text {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13.5px;
      color: #6b7280;
      text-align: center;
      margin-top: 12px;
    }

    .footer-link {
      font-weight: 700;
      color: #111318;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .footer-link:hover {
      opacity: 0.8;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  rememberMe = false;
  loading = false;
  error = '';

  constructor(private authService: AuthService, private router: Router) { }

  login() {
    this.loading = true;
    this.error = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        // Redirect based on role
        if (res.rol === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else if (res.rol === 'FUNCIONARIO') {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/cliente']);
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Email o contraseña incorrectos';
        this.loading = false;
      }
    });
  }
}
