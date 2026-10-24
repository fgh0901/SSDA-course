<script setup lang="ts">
// 过期横幅(TC-09):"该信息已过有效期(YYYY-MM-DD),仅供参考,请以官方通知核实"
defineProps<{ effectiveUntil: string }>();
</script>

<template>
  <el-alert
    type="warning"
    :closable="false"
    show-icon
    :title="`该信息已过有效期(${effectiveUntil}),仅供参考,请以官方通知核实`"
    data-testid="expired-banner"
    class="expired-banner"
  />
</template>

<style scoped>
.expired-banner {
  border-radius: 8px;
}
</style>
