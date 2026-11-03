<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getActivityDetail } from '@/api/activities';
import type { ActivityDetail as ActivityDetailModel } from '@/types/activity';

// 活动详情(03-page-spec 3.5):时间/地点/报名方式/适用对象/正文
const route = useRoute();
const detail = ref<ActivityDetailModel | null>(null);
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
    detail.value = await getActivityDetail(id);
  } catch {
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
      <h1>{{ detail.title }}</h1>
      <el-descriptions
        :column="1"
        border
        class="detail__desc"
      >
        <el-descriptions-item label="活动时间">
          {{ detail.startTime }} 至 {{ detail.endTime }}
        </el-descriptions-item>
        <el-descriptions-item label="活动地点">
          {{ detail.location?.name || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="报名方式">
          {{ detail.signupMethod || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="适用对象">
          {{ detail.targetAudience || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="活动介绍">
          <span style="white-space: pre-wrap">{{ detail.description || '—' }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <div class="detail__back">
        <router-link to="/activities">
          ← 返回活动列表
        </router-link>
      </div>
    </template>

    <el-empty
      v-else-if="!loading && notFound"
      description="活动不存在或已停用"
    >
      <router-link to="/activities">
        <el-button type="primary">
          返回列表
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
.detail__desc {
  margin-top: 8px;
}
.detail__desc :deep(.el-descriptions__label) {
  width: 96px;
}
.detail__desc :deep(.el-descriptions__cell) {
  line-height: 1.8;
}
.detail__back {
  margin-top: 24px;
}
</style>
