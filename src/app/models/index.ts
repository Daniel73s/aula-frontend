export type StudentStatus = 'working' | 'finished' | 'need_help';

export interface Exercise {
  id: string;
  title: string;
  description: string;
  instructions: string;
  active: boolean;
  createdAt: string;
}

export interface StudentInfo {
  id: string;
  alias: string;
  status: StudentStatus | null;
  connected: boolean;
  joinedAt: string | null;
  lastStatusChange: string | null;
  exerciseId?: string | null;
}

export interface ExerciseWithStudents extends Exercise {
  students: StudentInfo[];
}

export interface PanelStats {
  totalStudents: number;
  working: number;
  finished: number;
  needHelp: number;
}

export interface PanelSync {
  exercises: ExerciseWithStudents[];
  stats: PanelStats;
}

export interface ExerciseInput {
  title: string;
  description: string;
  instructions: string;
}
