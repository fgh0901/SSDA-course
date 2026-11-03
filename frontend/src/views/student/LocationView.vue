<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getLocations } from '@/api/locations';
import type { LocationItem } from '@/types/location';

// 地点查询(03-page-spec 3.6):关键词 + 校区/建筑/楼层筛选
const list = ref<LocationItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');
const campus = ref('');
const building = ref('');
const floor = ref('');
const allLocations = ref<LocationItem[]>([]);
const loading = ref(false);

const campusOptions = computed(() => [...new Set(allLocations.value.map((l) => l.campus))]);
const buildingOptions = computed(() => {
  const pool = campus.value ? allLocations.value.filter((l) => l.campus === campus.value) : allLocations.value;
  return [...new Set(pool.map((l) => l.building).filter((b): b is string => !!b))];
});
const floorOptions = computed(() => {
  const pool = building.value ? allLocations.value.filter((l) => l.building === building.value) : allLocations.value;
  return [...new Set(pool.map((l) => l.floor).filter((f): f is string => !!f))];
});

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const data = await getLocations({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      campus: campus.value || undefined,
      building: building.value || undefined,
      floor: floor.value || undefined
    });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function onFilterChange(): void {
  page.value = 1;
  void fetchList();
}

onMounted(async () => {
  void fetchList();
  try {
    // 选项字典:一次拉 100 条做校区/建筑/楼层级联(03-page-spec 3.6)
    const data = await getLocations({ page: 1, pageSize: 100 });
    allLocations.value = data.list;
  } catch {
    allLocations.value = [];
  }
});
</script>

<template>
  <div>
    <div class="page-head">
      <h1>地点查询</h1>
      <p class="page-head__desc">
        按名称搜索,或按校区、建筑、楼层逐级筛选地点
      </p>
    </div>
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="输入地点名称"
        clearable
        class="filter-bar__keyword"
        @keyup.enter="onFilterChange"
        @clear="onFilterChange"
      />
      <el-button
        type="primary"
        @click="onFilterChange"
      >
        查询
      </el-button>
      <el-select
        v-model="campus"
        placeholder="校区"
        clearable
        class="filter-bar__select"
        @change="onFilterChange"
      >
        <el-option
          v-for="c in campusOptions"
          :key="c"
          :label="c"
          :value="c"
        />
      </el-select>
      <el-select
        v-model="building"
        placeholder="建筑"
        clearable
        class="filter-bar__select"
        @change="onFilterChange"
      >
        <el-option
          v-for="b in buildingOptions"
          :key="b"
          :label="b"
          :value="b"
        />
      </el-select>
      <el-select
        v-model="floor"
        placeholder="楼层"
        clearable
        class="filter-bar__select"
        @change="onFilterChange"
      >
        <el-option
          v-for="f in floorOptions"
          :key="f"
          :label="`${f} 层`"
          :value="f"
        />
      </el-select>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
    >
      <el-table-column
        prop="name"
        label="名称"
        min-width="160"
      />
      <el-table-column
        prop="campus"
        label="校区"
        width="120"
      />
      <el-table-column
        prop="building"
        label="建筑"
        min-width="140"
      >
        <template #default="{ row }">
          {{ row.building || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="楼层"
        width="90"
      >
        <template #default="{ row }">
          {{ row.floor ? `${row.floor} 层` : '—' }}
        </template>
      </el-table-column>
      <el-table-column
        label="房间"
        min-width="100"
      >
        <template #default="{ row }">
          {{ row.room || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="description"
        label="说明"
        min-width="200"
      >
        <template #default="{ row }">
          {{ row.description || '—' }}
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="未找到相关地点,换个条件试试" />
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
  width: 240px;
}
.filter-bar__select {
  width: 150px;
}
</style>
