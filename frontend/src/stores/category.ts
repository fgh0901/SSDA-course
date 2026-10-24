import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getCategories } from '@/api/categories';
import type { Category } from '@/types/category';

/** 分类字典缓存:导航/筛选多处复用,只拉一次(契约 2.2) */
export const useCategoryStore = defineStore('category', () => {
  const list = ref<Category[]>([]);
  const loaded = ref(false);
  const loading = ref(false);

  const enabledList = computed(() => list.value.filter((c) => c.isEnabled === 1));

  async function fetchOnce(force = false): Promise<void> {
    if (loading.value || (loaded.value && !force)) return;
    loading.value = true;
    try {
      const data = await getCategories();
      list.value = data.list;
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  function getCategoryName(id: number | undefined | null): string {
    return list.value.find((c) => c.id === id)?.name ?? '';
  }

  return { list, enabledList, loaded, loading, fetchOnce, getCategoryName };
});
