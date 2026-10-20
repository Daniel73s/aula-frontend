import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  token = signal<string>(localStorage.getItem('teacherToken') ?? '');
  username = signal<string>(localStorage.getItem('teacherUsername') ?? '');

  isAuthenticated(): boolean {
    return !!this.token();
  }

  async login(username: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<{ token: string; username: string }>(`${environment.apiUrl}/auth/login`, {
        username,
        password,
      }),
    );
    this.token.set(res.token);
    this.username.set(res.username);
    localStorage.setItem('teacherToken', res.token);
    localStorage.setItem('teacherUsername', res.username);
  }

  logout(): void {
    this.token.set('');
    this.username.set('');
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('teacherUsername');
  }

  authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.token()}` };
  }
}
