<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getServiceDetail } from '@/api/services';
import type { ServiceDetail } from '@/types/service';

// 办事指南详情(03-page-spec 3.4):部门/地点/时间/材料/流程
const route = useRoute();
const detail = ref<ServiceDetail | null>(null);
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
    detail.value = await getServiceDetail(id);
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
      <div class="detail__meta">
        <span>办理部门:{{ detail.department }}</span>
        <span>办理时间:{{ detail.serviceTime || '—' }}</span>
        <span>更新时间:{{ detail.updatedAt }}</span>
      </div>
      <el-descriptions
        :column="1"
        border
        class="detail__desc"
      >
        <el-descriptions-item label="办理地点">
          <template v-if="detail.location">
            {{ detail.location.campus || '' }} {{ detail.location.building || '' }} {{ detail.location.floor || '' }}层
            {{ detail.location.room || '' }}（{{ detail.location.name }}）
            <router-link
              to="/locations"
              class="detail__link"
            >
              查看地点
            </router-link>
          </template>
          <span v-else>—</span>
        </el-descriptions-item>
        <el-descriptions-item label="所需材料">
          <span style="white-space: pre-wrap">{{ detail.materials || '—' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="办理流程">
          <span style="white-space: pre-wrap">{{ detail.process || '—' }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <div class="detail__back">
        <router-link to="/services">
          ← 返回办事指南列表
        </router-link>
      </div>
    </template>

    <el-empty
      v-else-if="!loading && notFound"
      description="办事指南不存在或已停用"
    >
      <router-link to="/services">
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
.detail__meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: #909399;
  font-size: 13px;
  margin-bottom: 16px;
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
.detail__link {
  margin-left: 8px;
}
.detail__back {
  margin-top: 24px;
}
</style>
