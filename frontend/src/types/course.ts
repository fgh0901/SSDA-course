// 课程与教师(契约 2.10~2.12、3.16~3.18)
export interface SimpleTeacher {
  id: number;
  name: string;
}

export interface SimpleCourse {
  id: number;
  name: string;
}

// 课程列表项(契约 2.10)
export interface CourseItem {
  id: number;
  name: string;
  code: string;
  semester?: string;
  teachers: SimpleTeacher[];
}

// 课程详情中的任教关系(契约 2.11)
export interface CourseTeacherRel {
  relationId: number;
  teacherId: number;
  name: string;
  title?: string;
  schedule?: string;
  location?: { id: number; name: string };
  office?: { id: number; name: string };
  officeHours?: string;
}

// 课程详情(契约 2.11):未录入的任教关系返回空数组,不做推断(P03)
export interface CourseDetail {
  id: number;
  name: string;
  code: string;
  semester?: string;
  description?: string;
  teachers: CourseTeacherRel[];
}

// 教师列表项(契约 2.12):仅公开字段,不存不返回电话/工号等隐私字段
export interface TeacherItem {
  id: number;
  name: string;
  title?: string;
  office?: { id: number; name: string };
  officeHours?: string;
  courses: SimpleCourse[];
}

// 教师详情(契约 2.13):courses[] 额外含 schedule/location
export interface TeacherDetail {
  id: number;
  name: string;
  title?: string;
  office?: { id: number; name: string };
  officeHours?: string;
  courses: Array<SimpleCourse & { schedule?: string; location?: { id: number; name: string } }>;
}

// 课程表单(契约 3.16)
export interface CoursePayload {
  name: string;
  code: string;
  semester?: string;
  description?: string;
}

// 教师表单(契约 3.17):仅允许公开字段,多余字段后端 strict() 拒绝
export interface TeacherPayload {
  name: string;
  title?: string;
  officeLocationId?: number;
  officeHours?: string;
}

// 任教关系(契约 3.18)
export interface AdminCourseTeacherRel {
  relationId: number;
  teacherId: number;
  teacherName: string;
  schedule?: string;
  location?: { id: number; name: string };
}

export interface CourseTeacherPayload {
  teacherId: number;
  locationId?: number;
  schedule?: string;
}
