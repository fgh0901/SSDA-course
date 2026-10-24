<script setup lang="ts">
import { computed } from 'vue';
import type { KnowledgeStatus } from '@/types/api';

const props = defineProps<{ status: KnowledgeStatus }>();

// 状态展示规则(03-page-spec 第 2 节 StatusTag)
const meta = computed(() => {
  switch (props.status) {
    case 'draft':
      return { label: '草稿', type: 'info' as const };
    case 'pending_review':
      return { label: '待审核', type: 'warning' as const };
    case 'published':
      return { label: '已发布', type: 'success' as const };
    case 'takedown':
      return { label: '已下架', type: 'danger' as const };
    default:
      return { label: props.status, type: 'info' as const };
  }
});
</script>

<template>
  <el-tag
    :type="meta.type"
    size="small"
    round
  >
    {{ meta.label }}
  </el-tag>
</template>
