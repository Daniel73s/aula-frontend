import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private router = inject(Router);

  username = signal('');
  password = signal('');
  loading = signal(false);
  error = signal('');

  async submit() {
    if (!this.username() || !this.password()) {
      this.error.set('Completa ambos campos');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.username(), this.password());
      this.socket.connect();
      const res = await this.socket.emit<{ success: boolean }>('teacher:auth', {
        token: this.auth.token(),
      });
      if (res.success) {
        this.router.navigate(['/panel']);
      }
    } catch (err: any) {
      this.error.set(err?.message ?? 'Error al iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }
}
