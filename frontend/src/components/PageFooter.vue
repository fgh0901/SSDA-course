<script setup lang="ts">
// 页脚数据来源声明(03-page-spec 第 2 节语义:数据来源 + AI 免责,不删减)
// 第二轮:数据已换为西南交通大学真实公开信息,来源表述同步具名
</script>

<template>
  <footer class="page-footer">
    <p class="page-footer__line">
      数据来源:西南交通大学各官方部门公开通知(采集底稿可溯);更新时间以各条目标注为准
    </p>
    <p class="page-footer__line">
      AI 回答仅供参考,请核实
    </p>
  </footer>
</template>

<style scoped>
.page-footer {
  margin-top: 40px;
  padding: 24px 16px 28px;
  text-align: center;
  color: #909399;
  font-size: 12px;
  line-height: 1.8;
  border-top: 1px solid #eef1f6;
  background: #fff;
}
.page-footer__line {
  margin: 0;
}
.page-footer__line + .page-footer__line {
  margin-top: 4px;
}
</style>
