<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

// 复用搜索框(首页 + 搜索页);空关键词前端拦截提示,不发请求(TC-02)
withDefaults(defineProps<{ placeholder?: string; size?: 'large' | 'default' }>(), {
  placeholder: '输入关键词,如:校园卡、选课、报修',
  size: 'large'
});

const router = useRouter();
const keyword = ref('');

function onSearch(): void {
  const kw = keyword.value.trim();
  if (!kw) {
    ElMessage.warning('请输入关键词');
    return;
  }
  router.push({ path: '/search', query: { keyword: kw } });
}
</script>

<template>
  <div class="search-bar">
    <el-input
      v-model="keyword"
      :size="size"
      :placeholder="placeholder"
      clearable
      data-testid="search-input"
      @keyup.enter="onSearch"
    />
    <el-button
      :size="size"
      type="primary"
      data-testid="search-button"
      @click="onSearch"
    >
      搜索
    </el-button>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  gap: 12px;
  width: 100%;
}
</style>
