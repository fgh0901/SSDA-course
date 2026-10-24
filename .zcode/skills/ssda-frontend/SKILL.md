---
name: ssda-frontend
description: SSDA 项目前端开发规范(Vue 3 + TypeScript + Vite + Element Plus + Pinia + Vue Router)。凡是在前端目录编写或修改任何代码——新建页面/组件/Pinia store、封装 axios、配置路由守卫、对接后端接口、写 Vitest 组件测试——必须先使用本 skill,确保组合式 API、响应包解包与命名约定一次做对。
---

# ssda-frontend:前端开发规范

目标读者:从未参与本项目的开发者/子 Agent。读完本文件,你应能直接写出符合项目结构、命名与联调约定的前端代码。

## 1. 技术栈与环境(冻结,不得更换)

- Vue 3(组合式 API)+ TypeScript + Vite + Element Plus + Vue Router + Pinia + Axios
- 开发端口 **5173**;`vite.config.ts` 中 proxy:`'/api' → 'http://localhost:3000'`,前端代码一律写相对路径 `/api/...`,不写后端 host
- 测试:Vitest + @vue/test-utils
- 响应包结构、字段命名、分页参数见 `ssda-api-contract`;前端只消费,不自定义字段

## 2. 目录结构

```text
frontend/src/
├── api/            # 按模块拆分的接口函数 + axios 实例(http.ts)
├── views/          # 页面级组件
│   ├── student/    # HomeView、KnowledgeListView、KnowledgeDetailView、
│   │               # ServiceListView、ServiceDetailView、ActivityListView、
│   │               # ActivityDetailView、LocationView、
│   │               # CourseTeacherView、SearchResultView、AiChatView
│   └── admin/      # LoginView、KnowledgeManageView、CategoryManageView、
│                   # ServiceManageView、ActivityManageView、LocationManageView、
│                   # CourseTeacherManageView、ExpiredWorkbenchView、AiLogView
├── components/     # 可复用组件(至少两个单词,如 KnowledgeCard.vue)
├── stores/         # Pinia:auth.ts、category.ts 等
├── router/index.ts # 路由表 + 全局守卫
├── composables/    # 组合式函数(usePagination 等)
├── types/          # 与契约字段一致的 TS 类型
└── __tests__/      # *.spec.ts(Vitest)
```

## 3. 组件与命名约定

- 一律使用 `<script setup lang="ts">`;**禁止** Options API 写法。
- 组件名 PascalCase 且**至少两个单词**:`KnowledgeCard.vue`、`StatusTag.vue`;单单词如 `List.vue`、`Card.vue` 禁止。
- 页面放 `views/` 且以 `View` 结尾;可复用组件放 `components/`。
- store 文件小写(`stores/auth.ts`),导出函数 `useAuthStore`;组合式函数 `useXxx`。
- TS 类型与契约字段一致(camelCase:`categoryId`、`effectiveUntil`),放在 `types/`。

## 4. axios 封装与响应包解包(核心约定)

- 组件**不直接 import axios**,一律调用 `src/api/` 里的函数。
- 响应拦截器统一解包:成功(`success: true`)直接返回 `data`,调用方拿到的是业务数据;失败 reject 并弹出 `error.message`。

```ts
// src/api/http.ts
import axios from 'axios';
import { ElMessage } from 'element-plus';

const http = axios.create({ baseURL: '/api', timeout: 10000 });

http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('ssda_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

http.interceptors.response.use(
  (resp) => {
    const body = resp.data;
    if (body.success) return body.data;               // 解包:调用方只拿 data
    ElMessage.error(body.error?.message ?? '请求失败');
    return Promise.reject(body.error);
  },
  (err) => {
    const message = err.response?.data?.error?.message ?? '系统繁忙,请稍后重试';
    ElMessage.error(message);                          // 500 展示后端统一话术,不显示堆栈
    return Promise.reject(err.response?.data?.error ?? err);
  }
);

export default http;
```

```ts
// src/api/knowledge.ts
import http from './http';
import type { Paged<KnowledgeItem> } from '@/types/knowledge';

export function getKnowledgeList(params: { page: number; pageSize: number; keyword?: string; categoryId?: number }) {
  return http.get<unknown, Paged<KnowledgeItem>>('/knowledge', { params });
}

export function getKnowledgeDetail(id: number) {
  return http.get<unknown, KnowledgeItem>(`/knowledge/${id}`);
}
```

## 5. Pinia store 规范

- 一个业务域一个 store;state 用 `ref`,异步请求放 `actions`,派生数据用 `computed`。
- store 只编排 api 调用与状态,不写 DOM 逻辑;组件里 `const auth = useAuthStore()`。

```ts
// src/stores/auth.ts
import { defineStore } from 'pinia';
import { adminLogin } from '@/api/auth';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('ssda_token') ?? '');
  const username = ref('');

  async function login(user: string, password: string) {
    const data = await adminLogin({ username: user, password }); // data 已解包
    token.value = data.token;
    username.value = data.username;
    localStorage.setItem('ssda_token', data.token);
  }
  function logout() { token.value = ''; localStorage.removeItem('ssda_token'); }

  return { token, username, login, logout };
});
```

## 6. Element Plus 使用约定

- 表单:el-form + `:rules`,必填/格式校验与后端 zod 对齐(标题必填、日期 `YYYY-MM-DD`);提交前 `formRef.validate()`。
- 列表:el-table + el-pagination,分页字段用 `page` / `pageSize`,与契约一致。
- 提示:操作结果用 `ElMessage`,确认用 `ElMessageBox.confirm`;空数据用 `el-empty` 并给引导文案(TC-02/TC-03 的"无结果提示")。
- 状态标签:用 el-tag 展示 `draft/pending_review/published/takedown`,过期知识在详情页顶部展示过期横幅(TC-09)。
- 统一中文文案;按钮防重复提交(loading 态)。

## 7. 路由与守卫

- 学生端挂 `/` 下;管理端统一挂 `/admin`,嵌套路由 + 管理布局。
- 全局前置守卫:未登录访问 `/admin/*` 一律重定向 `/admin/login`;登录后访问 login 页跳转后台首页。
- **前端守卫只是体验优化,权限以服务端为准**(TC-07);收到 401 清 token 跳登录,403 提示无权限。

```ts
// src/router/index.ts(节选)
router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.path.startsWith('/admin') && to.path !== '/admin/login' && !auth.token) {
    return { path: '/admin/login', query: { redirect: to.fullPath } };
  }
});
```

## 8. Vitest 组件测试组织

- 测试文件放 `src/__tests__/`,`<被测组件>.spec.ts`;describe/it 中文并带 TC 编号(见 `ssda-testing`)。
- mount 时 stub 掉 Element Plus 依赖的网络交互;mock `@/api` 模块而非 axios 适配器。
- 重点覆盖:搜索/筛选交互、表单校验(TC-08 前端拦截)、状态与过期横幅渲染(TC-09)、守卫跳转。

```ts
// src/__tests__/KnowledgeListView.spec.ts
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import KnowledgeListView from '@/views/student/KnowledgeListView.vue';

vi.mock('@/api/knowledge', () => ({
  getKnowledgeList: vi.fn().mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 10 }),
}));

describe('知识列表页(TC-02 空关键词)', () => {
  it('TC-02 空关键词搜索:展示默认列表与提示,页面不异常', async () => {
    const wrapper = mount(KnowledgeListView, { global: { stubs: ['el-table', 'el-pagination'] } });
    expect(wrapper.text()).not.toContain('undefined');
  });
});
```

## 9. 最小页面示例(搜索 + 列表 + 分页)

```vue
<!-- src/views/student/KnowledgeListView.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getKnowledgeList } from '@/api/knowledge';
import type { KnowledgeItem } from '@/types/knowledge';

const list = ref<KnowledgeItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');
const loading = ref(false);

async function fetchList() {
  loading.value = true;
  try {
    const data = await getKnowledgeList({ page: page.value, pageSize: pageSize.value, keyword: keyword.value });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function onSearch() { page.value = 1; fetchList(); }
onMounted(fetchList);
</script>

<template>
  <el-input v-model="keyword" placeholder="输入关键词,如:校园卡" @keyup.enter="onSearch" />
  <el-button type="primary" :loading="loading" @click="onSearch">搜索</el-button>
  <el-table v-loading="loading" :data="list">
    <el-table-column prop="title" label="标题" />
    <el-table-column prop="updatedAt" label="更新时间" />
  </el-table>
  <el-empty v-if="!loading && list.length === 0" description="未找到相关结果,换个关键词试试" />
  <el-pagination v-model:current-page="page" v-model:page-size="pageSize"
    :total="total" layout="total, prev, pager, next" @current-change="fetchList" />
</template>
```

## 10. Do / Don't

**Do**

- 新页面先看路由表与页面清单(简报第 6 节),字段对照 api-contract
- 请求走 `src/api/`,状态走 Pinia,类型放 `src/types/`
- 空态/无结果/过期状态都要有明确 UI(TC-02、TC-03、TC-09)
- 表单校验文案与后端 400 message 保持一致口径(TC-08)

**Don't**

- 禁止 Options API、禁止在模板里写复杂业务逻辑
- 禁止组件直连 axios、禁止手写 `http://localhost:3000`
- 禁止用 `v-html` 渲染任何来自后端/用户/AI 的内容(XSS,详见 `ssda-code-audit`)
- 禁止在前端写死权限判断代替后端校验;禁止把 token 打进日志

## 11. 协作约束

完成节点时更新 `docs/worklogs/worklog-<agent>.md`;接口契约有出入时不改契约,记录并在完成报告提请总控。
