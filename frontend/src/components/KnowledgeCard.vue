<script setup lang="ts">
import { computed } from 'vue';
import type { KnowledgeItem } from '@/types/knowledge';
import { isExpiredOn } from '@/utils/datetime';

const props = defineProps<{ item: KnowledgeItem }>();

// 列表接口不返回 isExpired,按 effectiveUntil 客户端计算仅作展示;详情页以服务端字段为准(TC-09)
const expired = computed(() => isExpiredOn(props.item.effectiveUntil));
</script>

<template>
  <el-card
    shadow="hover"
    class="knowledge-card"
  >
    <div class="knowledge-card__header">
      <router-link
        :to="`/knowledge/${item.id}`"
        class="knowledge-card__title"
      >
        {{ item.title }}
      </router-link>
      <el-tag
        v-if="item.isVerified === 0"
        type="warning"
        size="small"
        effect="plain"
      >
        待核实
      </el-tag>
      <el-tag
        v-if="expired"
        type="info"
        size="small"
        effect="plain"
      >
        已过期
      </el-tag>
    </div>
    <p class="knowledge-card__summary">
      {{ item.summary }}
    </p>
    <div class="knowledge-card__meta">
      <el-tag
        v-if="item.categoryName"
        size="small"
        type="primary"
        effect="plain"
      >
        {{ item.categoryName }}
      </el-tag>
      <span class="knowledge-card__source">来源:{{ item.source }}</span>
      <span class="knowledge-card__time">更新于 {{ item.updatedAt }}</span>
    </div>
  </el-card>
</template>

<style scoped>
/* 过渡与 hover 上浮由全局 .el-card 统一接管(第二轮精修) */
.knowledge-card :deep(.el-card__body) {
  padding: 20px;
}
.knowledge-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.knowledge-card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-decoration: none;
}
.knowledge-card__title:hover {
  color: var(--el-color-primary);
}
.knowledge-card__summary {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin: 8px 0 12px;
  color: #606266;
  font-size: 14px;
  line-height: 1.7;
}
.knowledge-card__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  color: #909399;
  font-size: 12px;
}
</style>
