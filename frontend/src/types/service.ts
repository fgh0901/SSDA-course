// 办事指南(契约 2.5/2.6)
export interface ServiceLocationRef {
  id: number;
  name: string;
  building?: string;
  room?: string;
}

// 列表项(契约 2.5)
export interface ServiceItem {
  id: number;
  title: string;
  department: string;
  location?: ServiceLocationRef;
  serviceTime?: string;
  updatedAt: string;
}

// 详情(契约 2.6):location 含完整字段
export interface ServiceDetail {
  id: number;
  title: string;
  department: string;
  location?: ServiceLocationRef & { campus?: string; floor?: string };
  serviceTime?: string;
  materials?: string;
  process?: string;
  isEnabled: 0 | 1;
  updatedAt: string;
}

// 办事指南表单(契约 3.13)
export interface ServicePayload {
  title: string;
  department: string;
  locationId?: number;
  serviceTime?: string;
  materials?: string;
  process?: string;
  isEnabled?: 0 | 1;
}
