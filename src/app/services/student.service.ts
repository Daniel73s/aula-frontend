import { Injectable, inject, signal } from '@angular/core';
import { SocketService } from './socket.service';
import type { Exercise, StudentInfo, StudentStatus } from '../models';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private socket = inject(SocketService);

  alias = signal<string>(sessionStorage.getItem('studentAlias') ?? '');
  token = signal<string>(sessionStorage.getItem('studentToken') ?? '');
  studentId = signal<string>('');
  activeExercises = signal<Exercise[]>([]);
  currentExercise = signal<Exercise | null>(null);
  currentStatus = signal<StudentStatus | null>(null);
  recoveredExerciseId = signal<string | null>(null);

  async identify(alias: string): Promise<void> {
    this.socket.connect();
    const result = await this.socket.emit<{
      success: boolean;
      studentId: string;
      studentToken: string;
      alias: string;
      exerciseId: string | null;
      exercise: Exercise | null;
      status: StudentStatus | null;
      activeExercises: Exercise[];
      recovered: boolean;
    }>('student:identify', {
      alias,
      token: this.token() || undefined,
    });

    this.alias.set(result.alias);
    this.studentId.set(result.studentId);
    this.token.set(result.studentToken);
    sessionStorage.setItem('studentAlias', result.alias);
    sessionStorage.setItem('studentToken', result.studentToken);

    if (result.activeExercises) {
      this.activeExercises.set(result.activeExercises);
    }

    if (result.recovered && result.exerciseId && result.exercise) {
      this.currentExercise.set(result.exercise);
      this.currentStatus.set(result.status);
      this.recoveredExerciseId.set(result.exerciseId);
    }
  }

  async joinExercise(exerciseId: string): Promise<Exercise> {
    const result = await this.socket.emit<{
      exercise: Exercise;
      student: StudentInfo;
    }>('student:join-exercise', { exerciseId });

    this.currentExercise.set(result.exercise);
    this.currentStatus.set(result.student.status);
    this.recoveredExerciseId.set(null);
    return result.exercise;
  }

  async updateStatus(status: StudentStatus): Promise<void> {
    await this.socket.emit('student:update-status', { status });
    this.currentStatus.set(status);
  }

  async leaveExercise(): Promise<void> {
    await this.socket.emit('student:leave-exercise');
    this.currentExercise.set(null);
    this.currentStatus.set(null);
  }

  clearIdentity(): void {
    this.alias.set('');
    this.token.set('');
    this.studentId.set('');
    this.currentExercise.set(null);
    this.currentStatus.set(null);
    this.recoveredExerciseId.set(null);
    sessionStorage.removeItem('studentAlias');
    sessionStorage.removeItem('studentToken');
  }

  hasIdentity(): boolean {
    return !!this.alias() && !!this.token();
  }
}
