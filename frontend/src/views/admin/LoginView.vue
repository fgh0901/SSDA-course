<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import type { ApiError } from '@/types/api';

// 管理端登录(03-page-spec 4.1):表单校验(账号 3~30 字、密码 6~64 字)→ 存 token → 跳 redirect 或 /admin/knowledge
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const formRef = ref<FormInstance | null>(null);
const submitting = ref(false);
const loginError = ref('');
const form = reactive({ username: '', password: '' });

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 30, message: '用户名须为 3~30 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 64, message: '密码须为 6~64 个字符', trigger: 'blur' }
  ]
};

async function onLogin(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  loginError.value = '';
  try {
    await auth.login(form.username, form.password);
    const redirect = route.query.redirect;
    router.push(typeof redirect === 'string' && redirect.startsWith('/admin') ? redirect : '/admin/knowledge');
  } catch (err) {
    // 401(用户名或密码错误)表单级展示(契约 3.1)
    loginError.value = (err as ApiError).message || '用户名或密码错误';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="login">
    <el-card class="login__card">
      <h1 class="login__title">
        SSDA 管理后台
      </h1>
      <el-alert
        v-if="loginError"
        :title="loginError"
        type="error"
        :closable="false"
        show-icon
        class="login__error"
      />
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="72px"
        @submit.prevent
      >
        <el-form-item
          label="用户名"
          prop="username"
        >
          <el-input
            v-model="form.username"
            placeholder="请输入管理员用户名"
            data-testid="login-username"
          />
        </el-form-item>
        <el-form-item
          label="密码"
          prop="password"
        >
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            data-testid="login-password"
            @keyup.enter="onLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="submitting"
            class="login__submit"
            data-testid="login-submit"
            @click="onLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f5f7fa;
}
.login__card {
  width: 380px;
}
.login__title {
  text-align: center;
  margin: 0 0 20px;
  font-size: 20px;
}
.login__error {
  margin-bottom: 16px;
}
.login__submit {
  width: 100%;
}
</style>
