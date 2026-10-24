// 知识分类(契约 2.2)
export interface Category {
  id: number;
  name: string;
  description?: string;
  sortOrder: number;
  /** 1=启用 0=停用 */
  isEnabled: 0 | 1;
}

// 管理端分类(契约 3.12):列表项额外含关联知识数
export interface AdminCategory extends Category {
  knowledgeCount: number;
}
