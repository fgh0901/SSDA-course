<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getActivities } from '@/api/activities';
import type { ActivityItem } from '@/types/activity';

// 活动列表(03-page-spec 3.5):Tab 切换 upcoming|past|全部 + 关键词
type TimeFilter = '' | 'upcoming' | 'past';

const list = ref<ActivityItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');
const time = ref<TimeFilter>('');
const loading = ref(false);
const emptyKeywordTip = ref(false);

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const data = await getActivities({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      time: time.value || undefined
    });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function onTabChange(): void {
  page.value = 1;
  void fetchList();
}

function onSearch(): void {
  emptyKeywordTip.value = !keyword.value.trim();
  page.value = 1;
  void fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div>
    <div class="page-head">
      <h1>校园活动</h1>
      <p class="page-head__desc">
        进行中与即将开始的校园活动一览,含时间、地点与报名方式
      </p>
    </div>
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="输入活动名称关键词"
        clearable
        class="filter-bar__keyword"
        @keyup.enter="onSearch"
        @clear="onSearch"
      />
      <el-button
        type="primary"
        @click="onSearch"
      >
        搜索
      </el-button>
    </div>

    <el-alert
      v-if="emptyKeywordTip"
      type="info"
      :closable="false"
      title="请输入关键词"
      description="未输入关键词,已为你展示全部活动。"
      class="filter-bar__tip"
    />

    <el-tabs
      :model-value="time"
      @tab-change="onTabChange"
    >
      <el-tab-pane
        label="全部"
        name=""
      />
      <el-tab-pane
        label="进行中 / 即将开始"
        name="upcoming"
      />
      <el-tab-pane
        label="往期活动"
        name="past"
      />
    </el-tabs>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        label="活动名称"
        min-width="180"
      >
        <template #default="{ row }">
          <router-link :to="`/activities/${row.id}`">
            {{ row.title }}
          </router-link>
        </template>
      </el-table-column>
      <el-table-column
        prop="startTime"
        label="开始时间"
        width="180"
      />
      <el-table-column
        prop="endTime"
        label="结束时间"
        width="180"
      />
      <el-table-column
        label="地点"
        min-width="120"
      >
        <template #default="{ row }">
          {{ row.location?.name || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="报名方式"
        min-width="180"
      >
        <template #default="{ row }">
          {{ row.signupMethod || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="适用对象"
        min-width="140"
      >
        <template #default="{ row }">
          {{ row.targetAudience || '—' }}
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="未找到相关结果,换个关键词试试" />
      </template>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      background
      class="pager"
      @current-change="fetchList"
    />
  </div>
</template>

<style scoped>
.filter-bar__keyword {
  width: 260px;
}
.filter-bar__tip {
  margin-bottom: 16px;
}
</style>
