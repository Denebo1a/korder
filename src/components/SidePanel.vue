<template>
  <div class="harmony-panel">
    <div class="panel-header">
      <h3 class="panel-title">编辑和声片段</h3>
      <div v-if="harmony" class="header-actions">
        <el-color-picker
          v-model="editingHarmony.color"
          @change="updateHarmony"
          :predefine="predefineColors"
          show-alpha
          size="small"
        />
        <el-button
          type="danger"
          @click="deleteHarmony"
          :icon="Delete"
          size="small"
          circle
        >
        </el-button>
      </div>
      <el-button
        @click="handleClose"
        :icon="Close"
        size="small"
        circle
        class="close-btn"
      />
    </div>

    <div v-if="harmony" class="edit-form">
      <el-form
        :model="editingHarmony"
        label-width="80px"
        label-position="top"
        :rules="formRules"
        ref="formRef"
      >
        <!-- 基本信息 -->
        <div class="form-section">
          <h4 class="section-title">基本信息</h4>

          <el-form-item label="根音级数" prop="rootDegree">
            <div class="inline-controls">
              <el-select
                v-model="editingHarmony.rootDegree"
                @change="updateHarmony"
                placeholder="选择根音级数"
                size="small"
                class="degree-select"
              >
                <el-option label="I" value="I" />
                <el-option label="II" value="II" />
                <el-option label="III" value="III" />
                <el-option label="IV" value="IV" />
                <el-option label="V" value="V" />
                <el-option label="VI" value="VI" />
                <el-option label="VII" value="VII" />
              </el-select>
              <el-radio-group
                v-model="editingHarmony.accidental"
                @change="updateHarmony"
                size="small"
                class="accidental-group"
              >
                <el-radio value="">无变化</el-radio>
                <el-radio value="b">♭</el-radio>
                <el-radio value="#">♯</el-radio>
              </el-radio-group>
            </div>
          </el-form-item>

          <el-form-item label="升降号" prop="accidental" style="display: none">
          </el-form-item>

          <el-form-item label="和弦类型" prop="chordType">
            <el-select
              v-model="editingHarmony.chordType"
              @change="updateHarmony"
              style="width: 100%"
              placeholder="选择和弦类型"
              size="small"
            >
              <el-option label="大三和弦 (Maj)" value="major" />
              <el-option label="小三和弦 (m)" value="minor" />
              <el-option label="增三和弦 (aug)" value="augmented" />
              <el-option label="属七和弦 (7)" value="dominant7" />
              <el-option label="大七和弦 (Maj7)" value="major7" />
              <el-option label="小七和弦 (m7)" value="minor7" />
              <el-option label="半减七和弦 (m7♭5)" value="half_diminished7" />
              <el-option label="减七和弦 (dim7)" value="diminished7" />
            </el-select>
          </el-form-item>

          <el-form-item label="挂留类型" prop="suspensionType">
            <el-radio-group
              v-model="editingHarmony.suspensionType"
              @change="updateHarmony"
              size="small"
            >
              <el-radio value="">无</el-radio>
              <el-radio value="sus2">sus2</el-radio>
              <el-radio value="sus4">sus4</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>

        <!-- 高级设置 -->
        <div class="form-section">
          <h4 class="section-title">高级设置</h4>

          <el-form-item label="低音级数" prop="bassDegree">
            <div class="inline-controls">
              <el-select
                v-model="editingHarmony.bassDegree"
                @change="updateHarmony"
                placeholder="选择低音级数"
                clearable
                size="small"
                class="degree-select"
              >
                <el-option label="I" value="I" />
                <el-option label="II" value="II" />
                <el-option label="III" value="III" />
                <el-option label="IV" value="IV" />
                <el-option label="V" value="V" />
                <el-option label="VI" value="VI" />
                <el-option label="VII" value="VII" />
              </el-select>
              <el-radio-group
                v-model="editingHarmony.bassAccidental"
                @change="updateHarmony"
                size="small"
                class="accidental-group"
              >
                <el-radio value="">无变化</el-radio>
                <el-radio value="b">♭</el-radio>
                <el-radio value="#">♯</el-radio>
              </el-radio-group>
            </div>
          </el-form-item>

          <el-form-item
            label="低音升降号"
            prop="bassAccidental"
            style="display: none"
          >
          </el-form-item>

          <el-form-item label="扩展音" prop="extensions">
            <el-select
              v-model="editingHarmony.extensions"
              multiple
              placeholder="选择扩展音"
              style="width: 100%"
              collapse-tags
              collapse-tags-tooltip
              size="small"
            >
              <el-option value="9" label="9" />
              <el-option value="b9" label="♭9" />
              <el-option value="#9" label="♯9" />
              <el-option value="11" label="11" />
              <el-option value="#11" label="♯11" />
              <el-option value="13" label="13" />
              <el-option value="b13" label="♭13" />
            </el-select>
          </el-form-item>

          <el-form-item label="省略音" prop="omissions">
            <el-select
              v-model="editingHarmony.omissions"
              multiple
              placeholder="选择省略音"
              style="width: 100%"
              collapse-tags
              collapse-tags-tooltip
              size="small"
            >
              <el-option value="Root" label="Root" />
              <el-option value="3" label="3" />
              <el-option value="5" label="5" />
              <el-option value="7" label="7" />
              <el-option value="9" label="9" />
              <el-option value="11" label="11" />
            </el-select>
          </el-form-item>
        </div>

        <!-- 时间设置 -->
        <!-- 时间设置已移除，现在通过拖拽直接调整 -->
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive, computed } from "vue";
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSelect,
  ElOption,
  ElButton,
  ElColorPicker,
  ElMessage,
  ElMessageBox,
} from "element-plus";
import { Delete, Close } from "@element-plus/icons-vue";
import { usePlayerStore } from "../stores/player";
import type { HarmonySegment } from "../types/progression";
import { generateChordName } from "../utils/chordUtils";

interface Props {
  harmony: HarmonySegment | null;
}

interface Emits {
  (e: "update-harmony", harmony: HarmonySegment): void;
  (e: "delete-harmony", harmonyId: string): void;
  (e: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 使用 store
const store = usePlayerStore();

const saving = ref(false);
const formRef = ref();

// 编辑中的和声数据
const editingHarmony = reactive<HarmonySegment>({
  id: "",
  startBeat: 0,
  duration: 1,
  chord: "C",
  rootDegree: "I",
  accidental: "",
  chordType: "major",
  suspensionType: "",
  bassDegree: undefined,
  bassAccidental: "",
  extensions: [],
  omissions: [],
  color: "#409EFF",
});

// 表单验证规则
const formRules = {
  rootDegree: [
    { required: true, message: "请选择根音级数", trigger: "change" },
  ],
  chordType: [{ required: true, message: "请选择和弦类型", trigger: "change" }],
};

// 预定义颜色
const predefineColors = [
  "#409EFF", // 蓝色
  "#67C23A", // 绿色
  "#E6A23C", // 橙色
  "#F56C6C", // 红色
  "#909399", // 灰色
  "#9C27B0", // 紫色
  "#00BCD4", // 青色
  "#FF9800", // 深橙色
  "#4CAF50", // 深绿色
  "#2196F3", // 深蓝色
  "#FF5722", // 深红色
  "#795548", // 棕色
];

// 使用 utils 中的 generateChordName（通过顶部引入）

// 获取和弦类型标签
const getChordTypeLabel = (chordType: string) => {
  const typeLabels: Record<string, string> = {
    major: "三和弦",
    minor: "小三和弦",
    augmented: "增三和弦",
    dominant7: "属七和弦",
    major7: "大七和弦",
    minor7: "小七和弦",
    half_diminished7: "半减七和弦",
    diminished7: "减七和弦",
  };
  return typeLabels[chordType] || chordType;
};

// 显示的和弦名称（基于编辑中的数据，实时更新）
const displayChord = computed(() => {
  // 获取当前片段的调性信息
  const currentSegment = store.selectedSegment;
  const segmentKey = currentSegment?.key || "C";

  // 基于根音级数、升降号和和弦类型生成基础和弦名称
  let chord = generateChordName(
    editingHarmony.rootDegree,
    editingHarmony.accidental,
    editingHarmony.chordType,
    segmentKey
  );

  // 添加挂留类型
  if (editingHarmony.suspensionType) {
    chord += editingHarmony.suspensionType;
  }

  // 添加扩展音 - 以上标形式显示
  if (editingHarmony.extensions && editingHarmony.extensions.length > 0) {
    const extensionsStr = editingHarmony.extensions.join(",");
    chord += `<sup>${extensionsStr}</sup>`;
  }

  // 添加省略音 - 新格式
  if (editingHarmony.omissions && editingHarmony.omissions.length > 0) {
    chord += `(omit${editingHarmony.omissions.join(",")})`;
  }

  // 添加转位低音
  if (editingHarmony.bassDegree) {
    const bassNote = generateChordName(
      editingHarmony.bassDegree,
      editingHarmony.bassAccidental,
      "major",
      segmentKey
    );
    chord += `/${bassNote}`;
  }

  return chord;
});

// 监听 harmony 变化
watch(
  () => props.harmony,
  (newHarmony) => {
    if (newHarmony) {
      Object.assign(editingHarmony, {
        ...newHarmony,
        rootDegree: newHarmony.rootDegree || "I",
        accidental: newHarmony.accidental || "",
        chordType: newHarmony.chordType || "major",
        suspensionType: newHarmony.suspensionType || "",
        bassDegree: newHarmony.bassDegree || undefined,
        bassAccidental: newHarmony.bassAccidental || "",
        extensions: newHarmony.extensions || [],
        omissions: newHarmony.omissions || [],
        color: newHarmony.color || "#409EFF",
      });
    }
  },
  { immediate: true }
);

// 更新和声数据
const updateHarmony = () => {
  if (props.harmony) {
    // 获取当前片段的调性信息
    const currentSegment = store.selectedSegment;
    const segmentKey = currentSegment?.key || "C";

    // 生成和弦名称
    const chordName = generateChordName(
      editingHarmony.rootDegree,
      editingHarmony.accidental,
      editingHarmony.chordType,
      segmentKey
    );

    // 创建更新的和声数据
    const updatedHarmony = {
      ...editingHarmony,
      chord: chordName,
    };

    // 发出事件更新和声
    emit("update-harmony", updatedHarmony);
  }
};

// 保存和声
const saveHarmony = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    saving.value = true;

    // 获取当前片段的调性信息
    const currentSegment = store.selectedSegment;
    const segmentKey = currentSegment?.key || "C";

    // 清理数据
    const cleanedHarmony = {
      ...editingHarmony,
      chord: generateChordName(
        editingHarmony.rootDegree,
        editingHarmony.accidental,
        editingHarmony.chordType,
        segmentKey
      ),
      rootDegree: editingHarmony.rootDegree || "I",
      accidental: editingHarmony.accidental || "",
      chordType: editingHarmony.chordType || "major",
      suspensionType: editingHarmony.suspensionType || "",
      bassDegree: editingHarmony.bassDegree || undefined,
      bassAccidental: editingHarmony.bassAccidental || "",
      extensions:
        editingHarmony.extensions?.filter((ext) => ext.trim().length > 0) || [],
      omissions:
        editingHarmony.omissions?.filter((omit) => omit.trim().length > 0) ||
        [],
    };

    emit("update-harmony", cleanedHarmony);
    ElMessage.success("和声已保存");

    // 延迟关闭，让用户看到成功消息
    setTimeout(() => {
      handleClose();
    }, 500);
  } catch (error) {
    console.error("保存和声失败:", error);
    ElMessage.error("请检查输入内容");
  } finally {
    saving.value = false;
  }
};

// 删除和声
const deleteHarmony = async () => {
  if (!props.harmony) return;

  try {
    await ElMessageBox.confirm(
      "确定要删除这个和声片段吗？此操作不可撤销。",
      "确认删除",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    emit("delete-harmony", props.harmony.id);
    ElMessage.success("和声已删除");
  } catch {
    // 用户取消删除
  }
};

// 关闭面板
const handleClose = () => {
  emit("close");
};
</script>

<style scoped>
.harmony-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid #e4e7ed;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  background: #f8f9fa;
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 200px;
  margin-left: auto;
  margin-right: 12px;
}

.header-actions .el-button {
  margin: 0;
}

.close-btn {
  color: #909399;
}

.close-btn:hover {
  color: #f56c6c;
}

.inline-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.degree-select {
  flex: 1;
  min-width: 120px;
}

.accidental-group {
  flex-shrink: 0;
}

.edit-form {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 3px solid #409eff;
  border: 1px solid #e5e7eb;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.section-title::before {
  content: "";
  width: 4px;
  height: 4px;
  background: #409eff;
  border-radius: 50%;
}

.chord-preview {
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.bass-controls {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.bass-controls .el-form-item {
  flex: 1;
  margin-bottom: 0;
}

/* Element Plus 组件样式覆盖 */
:deep(.el-drawer__header) {
  margin-bottom: 20px;
  padding: 20px 20px 15px 20px;
  border-bottom: 1px solid #e4e7ed;
  background: linear-gradient(135deg, #f8f9fa, #ffffff);
}

:deep(.el-drawer__title) {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

:deep(.el-drawer__body) {
  padding: 20px;
  background: #fafafa;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
}

:deep(.el-input__inner) {
  border-radius: 6px;
}

:deep(.el-select .el-input__inner) {
  border-radius: 6px;
}

:deep(.el-input-number) {
  border-radius: 6px;
}

:deep(.el-input-number .el-input__inner) {
  border-radius: 6px;
}

:deep(.el-color-picker__trigger) {
  border-radius: 6px;
  width: 60px;
  height: 36px;
  display: flex;
  align-items: center;
  height: 100%;
}

:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-form-item__label) {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  line-height: 1.4;
}

:deep(.el-form-item__content) {
  font-size: 13px;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}
</style>
