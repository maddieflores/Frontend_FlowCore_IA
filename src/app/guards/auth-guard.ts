import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  if (token) return true;
  router.navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  if (!token) { router.navigate(['/login']); return false; }
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.rol === 'ADMIN') return true;
  } catch {}
  router.navigate(['/login']);
  return false;
};

export const funcionarioGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  if (!token) { router.navigate(['/login']); return false; }
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.rol === 'FUNCIONARIO' || user.rol === 'ADMIN') return true;
  } catch {}
  router.navigate(['/login']);
  return false;
};

/** Redirige al dashboard correcto según el rol del usuario */
export const roleRedirectGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  if (!token) { router.navigate(['/login']); return false; }

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.rol === 'ADMIN')        { router.navigate(['/admin']);     return false; }
    if (user.rol === 'FUNCIONARIO')  { router.navigate(['/dashboard']); return false; }
    if (user.rol === 'CLIENTE')      { router.navigate(['/cliente']);   return false; }
  } catch {}

  router.navigate(['/login']);
  return false;
};

