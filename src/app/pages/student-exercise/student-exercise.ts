import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { StudentService } from '../../services/student.service';
import type { Exercise, StudentStatus } from '../../models';

@Component({
  selector: 'app-student-exercise',
  templateUrl: './student-exercise.html',
  styleUrl: './student-exercise.css',
})
export class StudentExerciseComponent implements OnInit, OnDestroy {
  socket = inject(SocketService);
  private studentService = inject(StudentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  exercise = signal<Exercise | null>(null);
  status = signal<StudentStatus | null>(null);
  errorMessage = signal('');
  deactivatedMessage = signal('');
  updating = signal(false);
  showFinishConfirm = signal(false);

  exerciseId = this.route.snapshot.paramMap.get('id') ?? '';

  isFinished = () => this.status() === 'finished';

  async ngOnInit() {
    if (!this.studentService.hasIdentity()) {
      this.router.navigate(['/']);
      return;
    }

    this.socket.connect();
    this.socket.on('exercise:deactivated', this.onDeactivated);
    this.socket.on('disconnect', this.onDisconnect);
    this.socket.on('connect', this.onReconnect);

    // If already in this exercise (from recovery), show it
    if (
      this.studentService.currentExercise()?.id === this.exerciseId &&
      this.studentService.currentStatus()
    ) {
      this.exercise.set(this.studentService.currentExercise());
      this.status.set(this.studentService.currentStatus());
      return;
    }

    try {
      const ex = await this.studentService.joinExercise(this.exerciseId);
      this.exercise.set(ex);
      this.status.set(this.studentService.currentStatus());
    } catch (err: any) {
      this.errorMessage.set(err?.message ?? 'No se pudo unir al ejercicio');
      setTimeout(() => this.router.navigate(['/']), 2500);
    }
  }

  ngOnDestroy() {
    this.socket.off('exercise:deactivated', this.onDeactivated);
    this.socket.off('disconnect', this.onDisconnect);
    this.socket.off('connect', this.onReconnect);
  }

  async setStatus(newStatus: StudentStatus) {
    if (this.updating() || this.isFinished()) return;
    if (newStatus === 'finished') {
      this.showFinishConfirm.set(true);
      return;
    }
    await this.applyStatus(newStatus);
  }

  confirmFinish() {
    this.showFinishConfirm.set(false);
    this.applyStatus('finished');
  }

  cancelFinish() {
    this.showFinishConfirm.set(false);
  }

  private async applyStatus(newStatus: StudentStatus) {
    if (this.updating()) return;
    this.updating.set(true);
    try {
      await this.studentService.updateStatus(newStatus);
      this.status.set(newStatus);
      this.errorMessage.set('');
    } catch (err: any) {
      this.errorMessage.set(err?.message ?? 'Error al actualizar estado');
    } finally {
      this.updating.set(false);
    }
  }

  async leave() {
    try {
      await this.studentService.leaveExercise();
    } catch {
      // ignore
    }
    this.router.navigate(['/']);
  }

  statusLabel(s: StudentStatus | null): string {
    switch (s) {
      case 'working': return 'Trabajando';
      case 'finished': return 'Terminado';
      case 'need_help': return 'Necesito ayuda';
      default: return 'Sin estado';
    }
  }

  private onDeactivated = (data: { exerciseId: string; message: string }) => {
    if (data.exerciseId === this.exerciseId) {
      this.deactivatedMessage.set(data.message);
      this.studentService.currentExercise.set(null);
      this.studentService.currentStatus.set(null);
    }
  };

  private onDisconnect = () => {
    // Socket disconnected; connection indicator handled by socket.connected()
  };

  private onReconnect = async () => {
    // Re-identify and rejoin after reconnect
    try {
      await this.studentService.identify(this.studentService.alias());
      if (!this.deactivatedMessage()) {
        const ex = await this.studentService.joinExercise(this.exerciseId);
        this.exercise.set(ex);
        this.status.set(this.studentService.currentStatus());
      }
    } catch {
      // Could not recover
    }
  };
}
