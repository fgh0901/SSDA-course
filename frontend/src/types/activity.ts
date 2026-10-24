// 校园活动(契约 2.7/2.8/3.14)
export interface ActivityLocationRef {
  id: number;
  name: string;
}

// 列表项(契约 2.7)
export interface ActivityItem {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  location?: ActivityLocationRef;
  signupMethod?: string;
  targetAudience?: string;
  updatedAt: string;
}

// 详情(契约 2.8):列表项结构 + description;管理端详情额外含 isEnabled(契约 3.14 同 3.13 模式)
export interface ActivityDetail extends ActivityItem {
  description?: string;
  /** 管理端详情返回;学生端详情可能缺省 */
  isEnabled?: 0 | 1;
}

// 活动表单(契约 3.14)
export interface ActivityPayload {
  title: string;
  startTime: string;
  endTime: string;
  locationId?: number;
  signupMethod?: string;
  targetAudience?: string;
  description?: string;
  isEnabled?: 0 | 1;
}
