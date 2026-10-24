<script setup lang="ts">
import zhCn from 'element-plus/es/locale/lang/zh-cn';
// 根组件:el-config-provider 统一 Element Plus 中文 locale(GUI 验收 D-LOW-2),
// MessageBox 确认弹窗(Cancel/OK → 取消/确定)、DatePicker、Pagination 等组件文案全部中文化
</script>

<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>
