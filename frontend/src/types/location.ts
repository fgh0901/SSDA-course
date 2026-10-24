// 地点(契约 2.9/3.15)
export interface LocationItem {
  id: number;
  name: string;
  campus: string;
  building?: string;
  floor?: string;
  room?: string;
  description?: string;
}

// 地点表单(契约 3.15)
export interface LocationPayload {
  name: string;
  campus: string;
  building?: string;
  floor?: string;
  room?: string;
  description?: string;
}
