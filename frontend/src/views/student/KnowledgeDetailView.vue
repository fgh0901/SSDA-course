<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getKnowledgeDetail } from '@/api/knowledge';
import ExpiredBanner from '@/components/ExpiredBanner.vue';
import type { KnowledgeDetail } from '@/types/knowledge';

// 知识详情(03-page-spec 3.3):正文/来源/更新时间/状态标签;过期横幅(TC-09);404 友好页;禁 v-html
const route = useRoute();
const detail = ref<KnowledgeDetail | null>(null);
const notFound = ref(false);
const loading = ref(false);

async function fetchDetail(): Promise<void> {
  const id = Number(route.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    notFound.value = true;
    return;
  }
  loading.value = true;
  notFound.value = false;
  try {
    detail.value = await getKnowledgeDetail(id);
  } catch {
    // 400/404 均渲染友好页(契约 2.4:error.message 已由拦截器提示)
    notFound.value = true;
    detail.value = null;
  } finally {
    loading.value = false;
  }
}

watch(() => route.params.id, fetchDetail);
onMounted(fetchDetail);
</script>

<template>
  <div
    v-loading="loading"
    class="detail"
  >
    <template v-if="detail">
      <ExpiredBanner
        v-if="detail.isExpired"
        :effective-until="detail.effectiveUntil ?? ''"
        class="detail__banner"
      />
      <h1 class="detail__title">
        {{ detail.title }}
        <el-tag
          v-if="detail.isVerified === 0"
          type="warning"
          size="small"
          effect="plain"
        >
          待核实
        </el-tag>
      </h1>
      <div class="detail__meta">
        <el-tag
          size="small"
          effect="plain"
        >
          {{ detail.categoryName }}
        </el-tag>
        <span>来源:{{ detail.source }}</span>
        <span>更新时间:{{ detail.updatedAt }}</span>
        <span v-if="detail.effectiveFrom || detail.effectiveUntil">
          有效期:{{ detail.effectiveFrom || '—' }} 至 {{ detail.effectiveUntil || '—' }}
        </span>
      </div>
      <el-divider />
      <div
        class="detail__content"
        data-testid="knowledge-content"
      >
        {{ detail.content }}
      </div>
      <div class="detail__back">
        <router-link to="/knowledge">
          ← 返回知识列表
        </router-link>
      </div>
    </template>

    <el-empty
      v-else-if="!loading && notFound"
      description="内容不存在或已下架"
    >
      <router-link to="/knowledge">
        <el-button type="primary">
          返回知识列表
        </el-button>
      </router-link>
    </el-empty>
  </div>
</template>

<style scoped>
.detail {
  background: #fff;
  border-radius: var(--ssda-radius-card);
  border: 1px solid #eef1f6;
  box-shadow: var(--ssda-shadow-1);
  padding: 24px 28px;
}
.detail__banner {
  margin-bottom: 16px;
}
.detail__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 0 0 12px;
  line-height: 1.5;
}
.detail__meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  color: #909399;
  font-size: 13px;
}
.detail__content {
  white-space: pre-wrap;
  font-size: 15px;
  line-height: 1.9; /* 长正文阅读行距 */
  letter-spacing: 0.2px;
  text-align: justify;
  overflow-wrap: anywhere;
  color: var(--el-text-color-regular);
}
.detail__back {
  margin-top: 24px;
}
</style>
