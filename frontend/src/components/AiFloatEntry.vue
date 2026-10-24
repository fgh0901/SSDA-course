<script setup lang="ts">
import { useRouter } from 'vue-router';

// 全局悬浮入口(学生端所有页面),点击进入 AI 助手页;无未读红点(无推送)
const router = useRouter();

function goAiChat(): void {
  router.push('/ai-chat');
}
</script>

<template>
  <el-button
    class="ai-float-entry"
    type="primary"
    circle
    size="large"
    title="AI 助手"
    data-testid="ai-float-entry"
    @click="goAiChat"
  >
    AI
  </el-button>
</template>

<style scoped>
.ai-float-entry {
  position: fixed;
  right: 24px;
  bottom: 32px;
  z-index: 2000;
  width: 56px;
  height: 56px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 8px 24px rgba(43, 127, 255, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.ai-float-entry:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(43, 127, 255, 0.4);
}
</style>
