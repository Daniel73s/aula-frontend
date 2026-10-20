import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { environment } from '../../../environments/environment';
import type { ExerciseWithStudents, PanelStats, ExerciseInput, StudentInfo, StudentStatus } from '../../models';

@Component({
  selector: 'app-teacher-panel',
  imports: [FormsModule],
  templateUrl: './teacher-panel.html',
  styleUrl: './teacher-panel.css',
})
export class TeacherPanelComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private socket = inject(SocketService);
  private http = inject(HttpClient);
  private router = inject(Router);

  exercises = signal<ExerciseWithStudents[]>([]);
  stats = signal<PanelStats>({ totalStudents: 0, working: 0, finished: 0, needHelp: 0 });
  showForm = signal(false);
  editingId = signal<string | null>(null);
  deleteConfirmId = signal<string | null>(null);
  formData = signal<ExerciseInput>({ title: '', description: '', instructions: '' });
  saving = signal(false);
  formError = signal('');
  filterHelp = signal(false);

  totalStudents = computed(() => this.stats().totalStudents);
  helpCount = computed(() => this.stats().needHelp);

  filteredExercises = computed(() => {
    if (!this.filterHelp()) return this.exercises();
    return this.exercises()
      .map((e) => ({ ...e, students: e.students.filter((s) => s.status === 'need_help') }))
      .filter((e) => e.students.length > 0);
  });

  async ngOnInit() {
    this.socket.connect();
    this.socket.on('panel:sync', this.onSync);
    this.socket.on('panel:exercise-created', this.onExerciseCreated);
    this.socket.on('panel:exercise-updated', this.onExerciseUpdated);
    this.socket.on('panel:exercise-deleted', this.onExerciseDeleted);
    this.socket.on('panel:exercise-toggled', this.onExerciseToggled);
    this.socket.on('panel:student-joined', this.onStudentJoined);
    this.socket.on('panel:student-left', this.onStudentLeft);
    this.socket.on('panel:student-status', this.onStudentStatus);

    try {
      await this.socket.emit('teacher:auth', { token: this.auth.token() });
    } catch {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy() {
    this.socket.off('panel:sync', this.onSync);
    this.socket.off('panel:exercise-created', this.onExerciseCreated);
    this.socket.off('panel:exercise-updated', this.onExerciseUpdated);
    this.socket.off('panel:exercise-deleted', this.onExerciseDeleted);
    this.socket.off('panel:exercise-toggled', this.onExerciseToggled);
    this.socket.off('panel:student-joined', this.onStudentJoined);
    this.socket.off('panel:student-left', this.onStudentLeft);
    this.socket.off('panel:student-status', this.onStudentStatus);
  }

  logout() {
    this.auth.logout();
    this.socket.disconnect();
    this.router.navigate(['/login']);
  }

  // ===== Formulario =====
  openCreate() {
    this.editingId.set(null);
    this.formData.set({ title: '', description: '', instructions: '' });
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(ex: ExerciseWithStudents) {
    this.editingId.set(ex.id);
    this.formData.set({ title: ex.title, description: ex.description, instructions: ex.instructions });
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  async saveExercise() {
    const data = this.formData();
    if (!data.title.trim()) {
      this.formError.set('El título es obligatorio');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    try {
      const headers = this.auth.authHeaders();
      if (this.editingId()) {
        await firstValueFrom(
          this.http.put(`${environment.apiUrl}/exercises/${this.editingId()}`, data, { headers }),
        );
      } else {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/exercises`, data, { headers }),
        );
      }
      this.showForm.set(false);
    } catch (err: any) {
      this.formError.set(err?.error?.error ?? 'Error al guardar');
    } finally {
      this.saving.set(false);
    }
  }

  // ===== Toggle =====
  async toggleExercise(ex: ExerciseWithStudents) {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/exercises/${ex.id}/toggle`, {}, {
          headers: this.auth.authHeaders(),
        }),
      );
    } catch {
      // handled by socket events
    }
  }

  // ===== Eliminar =====
  confirmDelete(ex: ExerciseWithStudents) {
    this.deleteConfirmId.set(ex.id);
  }

  cancelDelete() {
    this.deleteConfirmId.set(null);
  }

  async deleteExercise() {
    const id = this.deleteConfirmId();
    if (!id) return;
    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/exercises/${id}`, {
          headers: this.auth.authHeaders(),
        }),
      );
    } catch {
      // handled by socket events
    }
    this.deleteConfirmId.set(null);
  }

  // ===== Helpers de UI =====
  statusLabel(status: StudentStatus | null): string {
    switch (status) {
      case 'working': return 'Trabajando';
      case 'finished': return 'Terminado';
      case 'need_help': return 'Necesita ayuda';
      default: return 'Sin estado';
    }
  }

  statusClass(status: StudentStatus | null): string {
    switch (status) {
      case 'working': return 'bg-blue-100 text-blue-700';
      case 'finished': return 'bg-green-100 text-green-700';
      case 'need_help': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  statusIcon(status: StudentStatus | null): string {
    switch (status) {
      case 'working': return '🔨';
      case 'finished': return '✅';
      case 'need_help': return '🆘';
      default: return '—';
    }
  }

  timeOf(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  // ===== Socket handlers =====
  private onSync = (data: { exercises: ExerciseWithStudents[]; stats: PanelStats }) => {
    this.exercises.set(data.exercises);
    this.stats.set(data.stats);
  };

  private onExerciseCreated = (data: { exercise: ExerciseWithStudents }) => {
    this.exercises.update((list) => [...list, data.exercise]);
  };

  private onExerciseUpdated = (data: { exercise: ExerciseWithStudents }) => {
    this.exercises.update((list) =>
      list.map((e) => (e.id === data.exercise.id ? data.exercise : e)),
    );
  };

  private onExerciseDeleted = (data: { exerciseId: string }) => {
    this.exercises.update((list) => list.filter((e) => e.id !== data.exerciseId));
  };

  private onExerciseToggled = (data: { exercise: ExerciseWithStudents }) => {
    this.exercises.update((list) =>
      list.map((e) => (e.id === data.exercise.id ? data.exercise : e)),
    );
  };

  private onStudentJoined = (data: { exerciseId: string; student: StudentInfo }) => {
    this.exercises.update((list) =>
      list.map((e) => {
        if (e.id !== data.exerciseId) return e;
        const exists = e.students.some((s) => s.id === data.student.id);
        const students = exists
          ? e.students.map((s) => (s.id === data.student.id ? data.student : s))
          : [...e.students, data.student];
        return { ...e, students };
      }),
    );
    this.recalcStats();
  };

  private onStudentLeft = (data: { exerciseId: string; studentId: string }) => {
    this.exercises.update((list) =>
      list.map((e) => {
        if (e.id !== data.exerciseId) return e;
        return { ...e, students: e.students.filter((s) => s.id !== data.studentId) };
      }),
    );
    this.recalcStats();
  };

  private onStudentStatus = (data: { exerciseId: string; student: StudentInfo }) => {
    this.exercises.update((list) =>
      list.map((e) => {
        if (e.id !== data.exerciseId) return e;
        return {
          ...e,
          students: e.students.map((s) => (s.id === data.student.id ? data.student : s)),
        };
      }),
    );
    this.recalcStats();
  };

  private recalcStats() {
    const all = this.exercises().flatMap((e) => e.students);
    const connected = all.filter((s) => s.connected);
    this.stats.set({
      totalStudents: connected.length,
      working: connected.filter((s) => s.status === 'working').length,
      finished: connected.filter((s) => s.status === 'finished').length,
      needHelp: connected.filter((s) => s.status === 'need_help').length,
    });
  }
}
