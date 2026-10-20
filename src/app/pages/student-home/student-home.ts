import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket.service';
import { StudentService } from '../../services/student.service';

@Component({
  selector: 'app-student-home',
  imports: [FormsModule, RouterLink],
  templateUrl: './student-home.html',
  styleUrl: './student-home.css',
})
export class StudentHomeComponent implements OnInit, OnDestroy {
  socket = inject(SocketService);
  studentService = inject(StudentService);
  private router = inject(Router);

  aliasInput = signal(this.studentService.alias());
  aliasError = signal('');
  joining = signal<string | null>(null);
  joinError = signal('');

  activeExercises = this.studentService.activeExercises;

  async ngOnInit() {
    this.socket.connect();
    this.socket.on('exercise:list-updated', this.onListUpdated);

    if (this.studentService.hasIdentity()) {
      try {
        await this.studentService.identify(this.studentService.alias());
        if (this.studentService.recoveredExerciseId()) {
          this.router.navigate(['/ejercicio', this.studentService.recoveredExerciseId()]);
        }
      } catch {
        this.studentService.clearIdentity();
        this.aliasInput.set('');
      }
    }
  }

  ngOnDestroy() {
    this.socket.off('exercise:list-updated', this.onListUpdated);
  }

  async submitAlias() {
    const alias = this.aliasInput().trim();
    if (!alias) {
      this.aliasError.set('Escribe un alias para identificarte');
      return;
    }
    if (alias.length > 30) {
      this.aliasError.set('El alias no puede superar 30 caracteres');
      return;
    }
    this.aliasError.set('');
    try {
      await this.studentService.identify(alias);
      if (this.studentService.recoveredExerciseId()) {
        this.router.navigate(['/ejercicio', this.studentService.recoveredExerciseId()]);
      }
    } catch (err: any) {
      this.aliasError.set(err?.message ?? 'Error al identificarse');
    }
  }

  async joinExercise(exerciseId: string) {
    this.joining.set(exerciseId);
    this.joinError.set('');
    try {
      await this.studentService.joinExercise(exerciseId);
      this.router.navigate(['/ejercicio', exerciseId]);
    } catch (err: any) {
      this.joinError.set(err?.message ?? 'No se pudo unir al ejercicio');
    } finally {
      this.joining.set(null);
    }
  }

  changeAlias() {
    this.studentService.clearIdentity();
    this.aliasInput.set('');
  }

  private onListUpdated = (data: { exercises: any[] }) => {
    this.activeExercises.set(data.exercises);
  };
}
