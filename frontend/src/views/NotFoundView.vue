<script setup lang="ts">
// 404 兜底页:地址输入错误或链接失效时展示
</script>

<template>
  <main class="not-found">
    <el-result
      icon="warning"
      title="页面不存在"
      sub-title="您访问的地址不存在或已被移动"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="$router.push('/')"
        >
          返回首页
        </el-button>
      </template>
    </el-result>
  </main>
</template>

<style scoped>
.not-found {
  padding: 80px 16px;
}
</style>
