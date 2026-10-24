-- ============================================================================
-- SSDA(新生校园知识库与入学事务辅助系统)数据库结构脚本
-- 对应设计文档:docs/design/01-system-design.md 第 3 节 ER 图(11 实体 / 12 张表)
-- 版本:v1.0(2026-10-24,Phase 2 后端工程师按冻结设计产出)
--
-- 使用方式:mysql -u root -p < db/schema.sql && mysql -u root -p < db/seed.sql
-- 幂等性:SET FOREIGN_KEY_CHECKS=0 后 DROP+CREATE,可重复执行
-- 约定:列名 snake_case(仅 DAO 层出现);所有表含 created_at / updated_at;
--       时间统一东八区,日期时间格式 YYYY-MM-DD HH:mm:ss
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS ssda DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE ssda;

-- ---------------------------------------------------------------------------
-- 1. 管理员账号表(M08:管理员登录与权限)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS admin_user;
CREATE TABLE admin_user (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  username      VARCHAR(30)     NOT NULL                COMMENT '登录名,唯一,3~30 字符',
  password_hash VARCHAR(100)    NOT NULL                COMMENT '密码哈希(bcryptjs),禁存明文',
  role          VARCHAR(20)     NOT NULL DEFAULT 'admin' COMMENT '角色,固定 admin(requireRole 预留)',
  last_login_at DATETIME        NULL                    COMMENT '最近登录时间',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_admin_username (username)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '管理员账号表';

-- ---------------------------------------------------------------------------
-- 2. 知识分类表(M01:知识分类浏览)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS knowledge_category;
CREATE TABLE knowledge_category (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  name        VARCHAR(50)     NOT NULL                COMMENT '分类名,唯一,1~50 字符',
  description VARCHAR(200)    NULL                    COMMENT '分类说明,≤200 字符',
  sort_order  INT             NOT NULL DEFAULT 0      COMMENT '排序值,越小越靠前',
  is_enabled  TINYINT         NOT NULL DEFAULT 1      COMMENT '是否启用:1 启用 0 停用',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_category_name (name),
  KEY idx_category_sort (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '知识分类表';

-- ---------------------------------------------------------------------------
-- 3. 知识表(M02 知识查询与详情 / M09 后台维护 / M10 有效期与更新追踪)
--    状态四态:draft / pending_review / published / takedown(先审后发)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS knowledge;
CREATE TABLE knowledge (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  category_id     BIGINT UNSIGNED NOT NULL                COMMENT '所属分类 id → knowledge_category.id',
  title           VARCHAR(100)    NOT NULL                COMMENT '标题,1~100 字符,必填',
  content         TEXT            NOT NULL                COMMENT '正文,必填',
  source          VARCHAR(200)    NOT NULL                COMMENT '信息来源,必填(FR-11)',
  status          ENUM('draft','pending_review','published','takedown') NOT NULL DEFAULT 'draft' COMMENT '状态:草稿/待审核/已发布/已下架',
  is_verified     TINYINT         NOT NULL DEFAULT 0      COMMENT '核实状态:1 已核实 0 待核实(FR-10)',
  effective_from  DATE            NOT NULL                COMMENT '有效期起,必填',
  effective_until DATE            NULL                    COMMENT '有效期止,可空=长期有效',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间(FR-11 最近更新时间)',
  PRIMARY KEY (id),
  KEY idx_knowledge_title (title),
  KEY idx_knowledge_content (content(100)),
  KEY idx_knowledge_cat_status (category_id, status),
  KEY idx_knowledge_status_until (status, effective_until),
  KEY idx_knowledge_updated (updated_at),
  CONSTRAINT fk_knowledge_category FOREIGN KEY (category_id) REFERENCES knowledge_category (id),
  CONSTRAINT chk_knowledge_validity CHECK (effective_until IS NULL OR effective_until >= effective_from)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '校园知识表';

-- ---------------------------------------------------------------------------
-- 4. 知识变更日志表(M10:修改追踪,级联删除)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS knowledge_change_log;
CREATE TABLE knowledge_change_log (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  knowledge_id BIGINT UNSIGNED NOT NULL                COMMENT '知识 id → knowledge.id,ON DELETE CASCADE',
  admin_id     BIGINT UNSIGNED NOT NULL                COMMENT '操作管理员 id → admin_user.id',
  action       VARCHAR(20)     NOT NULL                COMMENT '动作:create/update/delete/submit_review/review_publish/review_reject/takedown',
  detail       TEXT            NULL                    COMMENT '变更摘要或驳回原因',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_change_log_knowledge (knowledge_id, created_at),
  CONSTRAINT fk_change_log_knowledge FOREIGN KEY (knowledge_id) REFERENCES knowledge (id) ON DELETE CASCADE,
  CONSTRAINT fk_change_log_admin FOREIGN KEY (admin_id) REFERENCES admin_user (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '知识变更日志表';

-- ---------------------------------------------------------------------------
-- 5. 地点表(M05:地点查询;被指南/活动/教师/任教关系引用)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS location;
CREATE TABLE location (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  name        VARCHAR(100)    NOT NULL                COMMENT '地点名,1~100 字符,必填',
  campus      VARCHAR(50)     NOT NULL                COMMENT '校区,必填',
  building    VARCHAR(100)    NULL                    COMMENT '建筑名',
  floor       VARCHAR(20)     NULL                    COMMENT '楼层',
  room        VARCHAR(50)     NULL                    COMMENT '房间号',
  description VARCHAR(500)    NULL                    COMMENT '地点说明,≤500 字符',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_location_name (name),
  KEY idx_location_campus_name (campus, name),
  KEY idx_location_building (building)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '校园地点表';

-- ---------------------------------------------------------------------------
-- 6. 办事指南表(M03:校园卡补办/水卡/报修/网络故障等)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS service_guide;
CREATE TABLE service_guide (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  title        VARCHAR(100)    NOT NULL                COMMENT '指南标题,1~100 字符,必填',
  department   VARCHAR(100)    NOT NULL                COMMENT '办理部门,1~100 字符,必填',
  location_id  BIGINT UNSIGNED NULL                    COMMENT '办理地点 id → location.id,可空',
  service_time VARCHAR(100)    NULL                    COMMENT '办理时间,≤100 字符',
  materials    TEXT            NULL                    COMMENT '所需材料清单',
  process      TEXT            NULL                    COMMENT '办理流程说明',
  is_enabled   TINYINT         NOT NULL DEFAULT 1      COMMENT '是否上架:1 上架 0 停用',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_service_title (title),
  KEY idx_service_enabled_updated (is_enabled, updated_at),
  CONSTRAINT fk_service_location FOREIGN KEY (location_id) REFERENCES location (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '办事指南表';

-- ---------------------------------------------------------------------------
-- 7. 校园活动表(M04:校园跑/太极拳/迎新等活动)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS campus_activity;
CREATE TABLE campus_activity (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  title           VARCHAR(100)    NOT NULL                COMMENT '活动标题,1~100 字符,必填',
  start_time      DATETIME        NOT NULL                COMMENT '开始时间,必填',
  end_time        DATETIME        NOT NULL                COMMENT '结束时间,必填且 ≥ start_time',
  location_id     BIGINT UNSIGNED NULL                    COMMENT '活动地点 id → location.id,可空',
  signup_method   VARCHAR(200)    NULL                    COMMENT '报名方式,≤200 字符',
  target_audience VARCHAR(200)    NULL                    COMMENT '适用对象,≤200 字符',
  description     TEXT            NULL                    COMMENT '活动说明正文',
  is_enabled      TINYINT         NOT NULL DEFAULT 1      COMMENT '是否上架:1 上架 0 停用',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_activity_title (title),
  KEY idx_activity_enabled_start (is_enabled, start_time),
  CONSTRAINT fk_activity_location FOREIGN KEY (location_id) REFERENCES location (id),
  CONSTRAINT chk_activity_time CHECK (end_time >= start_time)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '校园活动表';

-- ---------------------------------------------------------------------------
-- 8. 教师表(M06:仅存允许公开字段,不设电话/工号等隐私列)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS teacher;
CREATE TABLE teacher (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  name              VARCHAR(50)     NOT NULL                COMMENT '姓名,1~50 字符,必填',
  title             VARCHAR(50)     NULL                    COMMENT '职称,≤50 字符',
  office_location_id BIGINT UNSIGNED NULL                    COMMENT '办公室地点 id → location.id,可空',
  office_hours      VARCHAR(100)    NULL                    COMMENT '答疑时间,≤100 字符',
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_teacher_name (name),
  CONSTRAINT fk_teacher_office FOREIGN KEY (office_location_id) REFERENCES location (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '教师表(仅公开字段)';

-- ---------------------------------------------------------------------------
-- 9. 课程表(M06:课程查询,课程代码唯一)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS course;
CREATE TABLE course (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  name        VARCHAR(100)    NOT NULL                COMMENT '课程名,1~100 字符,必填',
  code        VARCHAR(20)     NOT NULL                COMMENT '课程代码,唯一,1~20 字符',
  semester    VARCHAR(20)     NULL                    COMMENT '开课学期,如 2026-2027-1',
  description VARCHAR(500)    NULL                    COMMENT '课程简介,≤500 字符',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_course_code (code),
  KEY idx_course_name (name),
  KEY idx_course_semester (semester)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '课程表';

-- ---------------------------------------------------------------------------
-- 10. 任教关系表(M06:课程×教师,含上课教室与时间;未录入不做推断 P03)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS course_teacher;
CREATE TABLE course_teacher (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '关系主键',
  course_id   BIGINT UNSIGNED NOT NULL                COMMENT '课程 id → course.id',
  teacher_id  BIGINT UNSIGNED NOT NULL                COMMENT '教师 id → teacher.id',
  location_id BIGINT UNSIGNED NULL                    COMMENT '上课教室 id → location.id,可空',
  schedule    VARCHAR(100)    NULL                    COMMENT '上课时间,≤100 字符',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_course_teacher (course_id, teacher_id),
  KEY idx_ct_teacher (teacher_id),
  CONSTRAINT fk_ct_course FOREIGN KEY (course_id) REFERENCES course (id),
  CONSTRAINT fk_ct_teacher FOREIGN KEY (teacher_id) REFERENCES teacher (id),
  CONSTRAINT fk_ct_location FOREIGN KEY (location_id) REFERENCES location (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '课程教师任教关系表';

-- ---------------------------------------------------------------------------
-- 11. AI 会话表(轨道①日志:匿名 uuid,不关联任何身份信息)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS ai_chat_session;
CREATE TABLE ai_chat_session (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  session_key VARCHAR(36)     NOT NULL                COMMENT '匿名会话 uuid(36 位),唯一,不关联身份',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_session_key (session_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = 'AI 对话会话表(匿名)';

-- ---------------------------------------------------------------------------
-- 12. AI 消息表(轨道①日志:role=user/assistant;assistant 记录来源/模式/耗时)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS ai_chat_message;
CREATE TABLE ai_chat_message (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  session_id   BIGINT UNSIGNED NOT NULL                COMMENT '会话 id → ai_chat_session.id,ON DELETE CASCADE',
  role         ENUM('user','assistant') NOT NULL       COMMENT '消息角色:用户/助手',
  content      TEXT            NOT NULL                COMMENT '消息正文',
  sources_json JSON            NULL                    COMMENT '引用来源数组(JSON),assistant 专有',
  mode         VARCHAR(10)     NULL                    COMMENT '生成模式:deepseek/fallback,assistant 专有',
  retriever    VARCHAR(20)     NULL                    COMMENT '检索器:local_kb(预留 http_kb)',
  latency_ms   INT             NULL                    COMMENT '检索+生成总耗时(毫秒)',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_message_session (session_id, created_at),
  KEY idx_message_created (created_at),
  CONSTRAINT fk_message_session FOREIGN KEY (session_id) REFERENCES ai_chat_session (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = 'AI 对话消息表';

SET FOREIGN_KEY_CHECKS = 1;
