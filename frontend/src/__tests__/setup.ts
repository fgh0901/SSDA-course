import { vi } from 'vitest';

// jsdom 缺失的浏览器 API stub(Element Plus 表格/弹层依赖 ResizeObserver)
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// AI 聊天列表自动滚动使用
Element.prototype.scrollTo = Element.prototype.scrollTo ?? ((): void => {});
