<template>
  <div class="segment-editor">
    <el-card class="segment-card" :class="{ 'is-collapsed': !segment.isExpanded }">
      <!-- 片段头部 -->
      <template #header>
        <div class="segment-header">
          <div class="segment-info">
            <el-icon 
              class="collapse-icon" 
              :class="{ 'is-expanded': segment.isExpanded }"
              @click="toggleExpanded"
            >
              <ArrowRight />
            </el-icon>
            <span class="segment-name">{{ segment.name }}</span>
            <el-tag size="small" type="info">{{ segment.measures }}小节</el-tag>
            <el-tag size="small" type="warning">
              {{ segment.key }}{{ segment.mode === 'major' ? '大调' : '小调' }}
            </el-tag>
          </div>
          <div class="segment-actions">
            <el-button-group size="small">
              <el-button @click="editSegmentInfo" :icon="Edit" title="编辑片段" />
              <el-button @click="duplicateSegment" :icon="CopyDocument" title="复制片段" />
              <el-button @click="deleteSegment" :icon="Delete" type="danger" title="删除片段" />
            </el-button-group>
          </div>
        </div>
      </template>

      <!-- 片段内容 -->
      <div v-show="segment.isExpanded" class="segment-content">
        <HarmonyEditor 
          :segment="segment"
          @update-segment="handleUpdateSegment"
          @edit-harmony="handleEditHarmony"
        />
      </div>
    </el-card>

    <!-- 编辑片段信息对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑片段信息" width="400px">
      <el-form :model="editForm" label-width="80px" :rules="formRules">
        <el-form-item label="片段名称" prop="name">
          <el-input 
            v-model="editForm.name" 
            placeholder="请输入片段名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="小节数" prop="measures">
          <el-input-number 
            v-model="editForm.measures" 
            :min="1" 
            :max="64" 
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        
        <!-- 调性设置 -->
        <el-form-item label="主音" prop="key">
          <el-select 
            v-model="editForm.key" 
            placeholder="选择主音"
            style="width: 100%"
          >
            <el-option v-for="key in keys" :key="key" :value="key" :label="key" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="调式" prop="mode">
          <el-select 
            v-model="editForm.mode" 
            placeholder="选择调式"
            style="width: 100%"
          >
            <el-option label="自然大调" value="major" />
          </el-select>
        </el-form-item>
        
        <!-- 拍号设置 -->
        <el-form-item label="拍号">
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-input-number 
              v-model="editForm.timeSignature.numerator" 
              :min="1" 
              :max="16" 
              controls-position="right"
              style="width: 80px"
            />
            <span>/</span>
            <el-select 
              v-model="editForm.timeSignature.denominator" 
              style="width: 80px"
            >
              <el-option label="2" :value="2" />
              <el-option label="4" :value="4" />
              <el-option label="8" :value="8" />
              <el-option label="16" :value="16" />
            </el-select>
            <el-button 
              size="small" 
              type="info" 
              text 
              @click="clearTimeSignature"
              title="使用全局拍号"
            >
              重置
            </el-button>
          </div>
          <div style="font-size: 12px; color: #909399; margin-top: 4px;">
            留空则使用全局拍号 ({{ store.timeSignature.numerator }}/{{ store.timeSignature.denominator }})
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelEdit">取消</el-button>
        <el-button type="primary" @click="saveSegmentInfo" :loading="saving">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElCard, ElIcon, ElTag, ElButton, ElButtonGroup, ElDialog, ElForm, ElFormItem, ElInput, ElInputNumber, ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Edit, CopyDocument, Delete } from '@element-plus/icons-vue'
import type { ProjectSegment, HarmonySegment } from '../types/progression'
import { usePlayerStore } from '../stores/player'
import HarmonyEditor from './HarmonyEditor.vue'

interface Props {
  segment: ProjectSegment
  index: number
}

interface Emits {
  (e: 'update-segment', segment: ProjectSegment): void
  (e: 'duplicate-segment', index: number): void
  (e: 'delete-segment', index: number): void
  (e: 'edit-harmony', harmony: HarmonySegment): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const store = usePlayerStore()

// 编辑对话框状态
const showEditDialog = ref(false)
const saving = ref(false)
const editForm = ref({
  name: '',
  measures: 4,
  key: 'C',
  mode: 'major',
  timeSignature: {
    numerator: 4,
    denominator: 4
  }
})

// 音调选项
const keys = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入片段名称', trigger: 'blur' },
    { min: 1, max: 50, message: '名称长度应在1-50个字符之间', trigger: 'blur' }
  ],
  measures: [
    { required: true, message: '请输入小节数', trigger: 'blur' },
    { type: 'number' as const, min: 1, max: 64, message: '小节数应在1-64之间', trigger: 'blur' }
  ],
  key: [
    { required: true, message: '请选择主音', trigger: 'change' }
  ],
  mode: [
    { required: true, message: '请选择调式', trigger: 'change' }
  ]
}

// 片段操作方法
const toggleExpanded = () => {
  console.log('切换片段展开状态:', props.segment.id)
  const updatedSegment = {
    ...props.segment,
    isExpanded: !props.segment.isExpanded
  }
  store.updateSegment(updatedSegment)
}

const editSegmentInfo = () => {
  editForm.value = {
    name: props.segment.name,
    measures: props.segment.measures,
    key: props.segment.key,
    mode: props.segment.mode,
    timeSignature: {
      numerator: props.segment.timeSignature?.numerator || store.timeSignature.numerator,
      denominator: props.segment.timeSignature?.denominator || store.timeSignature.denominator
    }
  }
  showEditDialog.value = true
}

const cancelEdit = () => {
  showEditDialog.value = false
  editForm.value = {
    name: '',
    measures: 4,
    key: 'C',
    mode: 'major',
    timeSignature: {
      numerator: 4,
      denominator: 4
    }
  }
}

const saveSegmentInfo = async () => {
  if (!editForm.value.name.trim()) {
    ElMessage.error('请输入片段名称')
    return
  }

  if (editForm.value.measures < 1 || editForm.value.measures > 64) {
    ElMessage.error('小节数应在1-64之间')
    return
  }

  saving.value = true
  
  try {
    // 检查是否需要调整和声片段
    const oldMeasures = props.segment.measures
    const newMeasures = editForm.value.measures
    
    if (newMeasures < oldMeasures) {
      // 小节数减少，需要检查是否有和声片段超出范围
      const maxBeat = newMeasures * store.timeSignature.numerator
      const conflictHarmonies = props.segment.harmonies.filter(h => 
        h.startBeat >= maxBeat
      )
      
      if (conflictHarmonies.length > 0) {
        const confirmed = await ElMessageBox.confirm(
          `缩短片段将删除${conflictHarmonies.length}个超出范围的和声片段，是否继续？`,
          '确认操作',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        if (!confirmed) {
          saving.value = false
          return
        }
        
        // 删除超出范围的和声片段
        conflictHarmonies.forEach(harmony => {
          store.removeHarmony(harmony.id)
        })
      }
    }
    
    // 更新片段信息
    const updatedSegment = {
      ...props.segment,
      name: editForm.value.name.trim(),
      measures: editForm.value.measures,
      key: editForm.value.key,
      mode: editForm.value.mode,
      timeSignature: editForm.value.timeSignature.numerator === store.timeSignature.numerator && 
                     editForm.value.timeSignature.denominator === store.timeSignature.denominator 
                     ? undefined 
                     : editForm.value.timeSignature
    }
    store.updateSegment(updatedSegment)
    
    showEditDialog.value = false
    ElMessage.success('片段信息已更新')
    
  } catch (error) {
    console.error('保存片段信息失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

const duplicateSegment = () => {
  console.log('复制片段:', props.segment.id)
  emit('duplicate-segment', props.index)
}

const deleteSegment = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除片段"${props.segment.name}"吗？此操作不可撤销。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    console.log('删除片段:', props.segment.id)
    emit('delete-segment', props.index)
    
  } catch {
    // 用户取消删除
  }
}

// HarmonyEditor 事件处理
const handleUpdateSegment = (updatedSegment: ProjectSegment) => {
  console.log('片段更新:', updatedSegment.id)
  emit('update-segment', updatedSegment)
}

const handleEditHarmony = (harmony: HarmonySegment) => {
  console.log('编辑和声:', harmony.id)
  emit('edit-harmony', harmony)
}

// 清除拍号设置，使用全局拍号
const clearTimeSignature = () => {
  editForm.value.timeSignature = {
    numerator: store.timeSignature.numerator,
    denominator: store.timeSignature.denominator
  }
}
</script>

<style scoped>
.segment-editor {
  margin-bottom: 16px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.segment-card {
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.segment-card.is-collapsed {
  opacity: 0.8;
}

.segment-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.segment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.segment-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-icon {
  cursor: pointer;
  transition: all 0.3s ease;
  color: #909399;
  padding: 4px;
  border-radius: 4px;
}

.collapse-icon:hover {
  color: #409EFF;
  background: rgba(64, 158, 255, 0.1);
}

.collapse-icon.is-expanded {
  transform: rotate(90deg);
}

.segment-name {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.segment-actions {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.segment-card:hover .segment-actions {
  opacity: 1;
}

.segment-content {
  padding: 16px;
  background: #fafafa;
  margin: 0 -20px -20px -20px;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
}

/* Element Plus 组件样式覆盖 */
:deep(.el-card__header) {
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8f9fa, #ffffff);
  border-bottom: 1px solid #e4e7ed;
}

:deep(.el-card__body) {
  padding: 0;
  overflow: hidden;
}

:deep(.el-tag) {
  border-radius: 12px;
  font-size: 12px;
}

:deep(.el-button-group .el-button) {
  border-radius: 6px;
}

:deep(.el-dialog) {
  border-radius: 12px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-input__inner) {
  border-radius: 8px;
}

:deep(.el-textarea__inner) {
  border-radius: 8px;
}

:deep(.el-input-number) {
  border-radius: 8px;
}
</style>