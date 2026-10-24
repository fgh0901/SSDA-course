<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getServices } from '@/api/services';
import { getLocations } from '@/api/locations';
import type { ServiceItem } from '@/types/service';

// 办事指南列表(03-page-spec 3.4):关键词 + 地点筛选 + 分页
const list = ref<ServiceItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');
const locationId = ref<number | undefined>(undefined);
const locationOptions = ref<Array<{ id: number; name: string }>>([]);
const loading = ref(false);
const emptyKeywordTip = ref(false);

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const data = await getServices({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      locationId: locationId.value
    });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  if (!keyword.value.trim()) {
    emptyKeywordTip.value = true; // 空关键词提示,展示默认列表(TC-02)
  } else {
    emptyKeywordTip.value = false;
  }
  page.value = 1;
  void fetchList();
}

onMounted(async () => {
  void fetchList();
  try {
    // 地点下拉筛选项(03-page-spec 3.4:pageSize=100)
    const data = await getLocations({ page: 1, pageSize: 100 });
    locationOptions.value = data.list.map((l) => ({ id: l.id, name: `${l.campus} · ${l.name}` }));
  } catch {
    locationOptions.value = [];
  }
});
</script>

<template>
  <div>
    <div class="page-head">
      <h1>办事指南</h1>
      <p class="page-head__desc">
        校园卡、报修、网络等高频事务的办理部门、地点、时间与材料
      </p>
    </div>
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="输入关键词,如:水卡、报修"
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
      <el-select
        v-model="locationId"
        placeholder="全部地点"
        clearable
        class="filter-bar__location"
        @change="onSearch"
      >
        <el-option
          v-for="l in locationOptions"
          :key="l.id"
          :label="l.name"
          :value="l.id"
        />
      </el-select>
    </div>

    <el-alert
      v-if="emptyKeywordTip"
      type="info"
      :closable="false"
      title="请输入关键词"
      description="未输入关键词,已为你展示默认列表。"
      class="filter-bar__tip"
    />

    <el-table
      v-loading="loading"
      :data="list"
    >
      <el-table-column
        label="标题"
        min-width="180"
      >
        <template #default="{ row }">
          <router-link :to="`/services/${row.id}`">
            {{ row.title }}
          </router-link>
        </template>
      </el-table-column>
      <el-table-column
        prop="department"
        label="办理部门"
        min-width="140"
      />
      <el-table-column
        label="办理地点"
        min-width="180"
      >
        <template #default="{ row }">
          <span v-if="row.location">{{ row.location.building }} {{ row.location.room || '' }}（{{ row.location.name }}）</span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="serviceTime"
        label="办理时间"
        min-width="140"
      >
        <template #default="{ row }">
          {{ row.serviceTime || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="updatedAt"
        label="更新时间"
        width="180"
      />
      <template #empty>
        <el-empty description="未找到相关结果,换个关键词试试" />
      </template>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      class="pager"
      @current-change="fetchList"
    />
  </div>
</template>

<style scoped>
.filter-bar__keyword {
  width: 260px;
}
.filter-bar__location {
  width: 220px;
}
.filter-bar__tip {
  margin-bottom: 16px;
}
</style>
