import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'panel',
    loadComponent: () =>
      import('./pages/teacher-panel/teacher-panel').then((m) => m.TeacherPanelComponent),
    canActivate: [authGuard],
  },
  {
    path: 'ejercicio/:id',
    loadComponent: () =>
      import('./pages/student-exercise/student-exercise').then((m) => m.StudentExerciseComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/student-home/student-home').then((m) => m.StudentHomeComponent),
  },
  { path: '**', redirectTo: '' },
];
