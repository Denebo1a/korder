<template>
  <el-drawer
    v-model="visible"
    title="编辑和声片段"
    direction="rtl"
    size="450px"
    :before-close="handleClose"
    class="harmony-drawer"
  >
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
            <el-select 
              v-model="editingHarmony.rootDegree"
              @change="updateHarmony"
              style="width: 100%"
              placeholder="选择根音级数"
            >
              <el-option label="I" value="I" />
              <el-option label="II" value="II" />
              <el-option label="III" value="III" />
              <el-option label="IV" value="IV" />
              <el-option label="V" value="V" />
              <el-option label="VI" value="VI" />
              <el-option label="VII" value="VII" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="升降号" prop="accidental">
            <el-radio-group 
              v-model="editingHarmony.accidental"
              @change="updateHarmony"
            >
              <el-radio value="">无</el-radio>
              <el-radio value="b">♭</el-radio>
              <el-radio value="#">♯</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="和弦类型" prop="chordType">
            <el-select 
              v-model="editingHarmony.chordType"
              @change="updateHarmony"
              style="width: 100%"
              placeholder="选择和弦类型"
            >
              <el-option label="三和弦 (Maj)" value="major" />
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
            <el-select 
              v-model="editingHarmony.bassDegree"
              @change="updateHarmony"
              placeholder="选择低音级数"
              clearable
              style="width: 100%"
            >
              <el-option label="I" value="I" />
              <el-option label="II" value="II" />
              <el-option label="III" value="III" />
              <el-option label="IV" value="IV" />
              <el-option label="V" value="V" />
              <el-option label="VI" value="VI" />
              <el-option label="VII" value="VII" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="低音升降号" prop="bassAccidental">
            <el-radio-group 
              v-model="editingHarmony.bassAccidental"
              @change="updateHarmony"
              size="small"
            >
              <el-radio value="">无</el-radio>
              <el-radio value="b">♭</el-radio>
              <el-radio value="#">♯</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="扩展音" prop="extensions">
            <el-select 
              v-model="editingHarmony.extensions"
              multiple
              placeholder="选择扩展音"
              style="width: 100%"
              collapse-tags
              collapse-tags-tooltip
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
        <div class="form-section">
          <h4 class="section-title">时间设置</h4>
          
          <el-form-item label="起始拍" prop="startBeat">
            <el-input-number 
              v-model="editingHarmony.startBeat"
              @change="updateHarmony"
              :min="0"
              :step="0.25"
              :precision="2"
              style="width: 100%"
              controls-position="right"
            />
          </el-form-item>
          
          <el-form-item label="持续拍数" prop="duration">
            <el-input-number 
              v-model="editingHarmony.duration"
              @change="updateHarmony"
              :min="0.25"
              :max="16"
              :step="0.25"
              :precision="2"
              style="width: 100%"
              controls-position="right"
            />
          </el-form-item>
        </div>

        <!-- 外观设置 -->
        <div class="form-section">
          <h4 class="section-title">外观设置</h4>
          
          <el-form-item label="颜色" prop="color">
            <el-color-picker 
              v-model="editingHarmony.color"
              @change="updateHarmony"
              :predefine="predefineColors"
              show-alpha
            />
          </el-form-item>
        </div>
      </el-form>
      
      <!-- 预览区域 -->
      <div class="preview-section">
        <h4 class="section-title">预览</h4>
        <div class="harmony-preview" :style="{ backgroundColor: props.harmony?.color }">
          <span class="preview-chord-degree" v-html="previewChordDegree"></span>
          <span class="preview-chord-name" v-html="previewChordName"></span>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="form-actions">
        <el-button type="danger" @click="deleteHarmony" :icon="Delete">
          删除和声
        </el-button>
        <el-button @click="handleClose">
          关闭
        </el-button>
        <el-button type="primary" @click="saveHarmony" :loading="saving">
          保存
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch, reactive, computed } from 'vue'
import { ElDrawer, ElForm, ElFormItem, ElInput, ElInputNumber, ElSelect, ElOption, ElButton, ElColorPicker, ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { usePlayerStore } from '../stores/player'
import type { HarmonySegment } from '../types/progression'

interface Props {
  modelValue: boolean
  harmony: HarmonySegment | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'update-harmony', harmony: HarmonySegment): void
  (e: 'delete-harmony', harmonyId: string): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 使用 store
const store = usePlayerStore()

const visible = ref(props.modelValue)
const saving = ref(false)
const formRef = ref()

// 编辑中的和声数据
const editingHarmony = reactive<HarmonySegment>({
  id: '',
  startBeat: 0,
  duration: 1,
  chord: 'C',
  rootDegree: 'I',
  accidental: '',
  chordType: 'major',
  suspensionType: '',
  bassDegree: undefined,
  bassAccidental: '',
  extensions: [],
  omissions: [],
  color: '#409EFF'
})

// 表单验证规则
const formRules = {
  rootDegree: [
    { required: true, message: '请选择根音级数', trigger: 'change' }
  ],
  chordType: [
    { required: true, message: '请选择和弦类型', trigger: 'change' }
  ],
  startBeat: [
    { required: true, message: '请输入起始拍', trigger: 'blur' },
    { type: 'number' as const, min: 0, message: '起始拍不能小于0', trigger: 'blur' }
  ],
  duration: [
    { required: true, message: '请输入持续拍数', trigger: 'blur' },
    { type: 'number' as const, min: 0.25, max: 16, message: '持续拍数应在0.25-16之间', trigger: 'blur' }
  ]
}

// 预定义颜色
const predefineColors = [
  '#409EFF', // 蓝色
  '#67C23A', // 绿色
  '#E6A23C', // 橙色
  '#F56C6C', // 红色
  '#909399', // 灰色
  '#9C27B0', // 紫色
  '#00BCD4', // 青色
  '#FF9800', // 深橙色
  '#4CAF50', // 深绿色
  '#2196F3', // 深蓝色
  '#FF5722', // 深红色
  '#795548'  // 棕色
]

// 根据根音级数、升降号和和弦类型生成和弦名称（基于片段调性）
const generateChordName = (rootDegree?: string, accidental?: string, chordType?: string, segmentKey?: string) => {
  if (!rootDegree || !chordType || !segmentKey) return 'C'
  
  // 各调的音阶映射
  const keyScales: Record<string, string[]> = {
    'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    'C#': ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'],
    'Db': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
    'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
    'D#': ['D#', 'E#', 'F##', 'G#', 'A#', 'B#', 'C##'],
    'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
    'E': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
    'F': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
    'F#': ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
    'Gb': ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
    'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
    'G#': ['G#', 'A#', 'B#', 'C#', 'D#', 'E#', 'F##'],
    'Ab': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
    'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
    'A#': ['A#', 'B#', 'C##', 'D#', 'E#', 'F##', 'G##'],
    'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
    'B': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#']
  }
  
  // 级数到索引的映射
  const degreeToIndex: Record<string, number> = {
    'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5, 'VII': 6
  }
  
  // 和弦类型到后缀的映射
  const chordTypeSuffix: Record<string, string> = {
    'major': '',
    'minor': 'm',
    'augmented': 'aug',
    'dominant7': '7',
    'major7': 'Maj7',
    'minor7': 'm7',
    'half_diminished7': 'm7♭5',
    'diminished7': 'dim7'
  }
  
  const scale = keyScales[segmentKey] || keyScales['C']
  const degreeIndex = degreeToIndex[rootDegree] || 0
  let rootNote = scale[degreeIndex] || 'C'
  
  // 应用升降号 - 使用Unicode音乐符号
  if (accidental === '#') {
    // 使用Unicode升号符号 ♯ (U+266F)
    const sharpMap: Record<string, string> = {
      'C': 'C♯', 'D': 'D♯', 'E': 'F', 'F': 'F♯', 'G': 'G♯', 'A': 'A♯', 'B': 'C'
    }
    rootNote = sharpMap[rootNote.charAt(0)] + rootNote.slice(1).replace(/[#b♯♭]/g, '') || rootNote
  } else if (accidental === 'b') {
    // 使用Unicode降号符号 ♭ (U+266D)
    const flatMap: Record<string, string> = {
      'C': 'B', 'D': 'D♭', 'E': 'E♭', 'F': 'E', 'G': 'G♭', 'A': 'A♭', 'B': 'B♭'
    }
    rootNote = flatMap[rootNote.charAt(0)] + rootNote.slice(1).replace(/[#b♯♭]/g, '') || rootNote
  }
  
  const suffix = chordTypeSuffix[chordType] || ''
  return rootNote + suffix
}

// 获取和弦类型标签
const getChordTypeLabel = (chordType: string) => {
  const typeLabels: Record<string, string> = {
    'major': '三和弦',
    'minor': '小三和弦',
    'augmented': '增三和弦',
    'dominant7': '属七和弦',
    'major7': '大七和弦',
    'minor7': '小七和弦',
    'half_diminished7': '半减七和弦',
    'diminished7': '减七和弦'
  }
  return typeLabels[chordType] || chordType
}

// 显示的和弦名称（基于编辑中的数据，实时更新）
const displayChord = computed(() => {
  // 获取当前片段的调性信息
  const currentSegment = store.selectedSegment
  const segmentKey = currentSegment?.key || 'C'
  
  // 基于根音级数、升降号和和弦类型生成基础和弦名称
  let chord = generateChordName(editingHarmony.rootDegree, editingHarmony.accidental, editingHarmony.chordType, segmentKey)
  
  // 添加挂留类型
  if (editingHarmony.suspensionType) {
    chord += editingHarmony.suspensionType
  }
  
  // 添加低音
  if (editingHarmony.bassNote) {
    chord += `/${editingHarmony.bassNote}`
  }
  
  // 添加扩展音 - 以上标形式显示
  if (editingHarmony.extensions && editingHarmony.extensions.length > 0) {
    const extensionsStr = editingHarmony.extensions.join(',')
    chord += `<sup>${extensionsStr}</sup>`
  }
  
  // 添加省略音 - 新格式
  if (editingHarmony.omissions && editingHarmony.omissions.length > 0) {
    chord += `(omit${editingHarmony.omissions.join(',')})`
  }
  
  // 添加罗马数字标记
  if (editingHarmony.roman) {
    chord += ` [${editingHarmony.roman}]`
  }
  
  return chord
})

// 预览和弦名称（基于原始数据，不实时更新）
const previewChordDegree = computed(() => {
  if (!props.harmony) return 'I'
  
  // 获取当前片段的调性信息
  const currentSegment = store.selectedSegment
  const segmentKey = currentSegment?.key || 'C'
  
  // 显示级数和升降号
  let display = ''
  if (props.harmony.accidental) {
    display += props.harmony.accidental
  }
  display += props.harmony.rootDegree || 'I'
  
  // 显示和弦性质
  const chordTypeDisplay: Record<string, string> = {
    'major': '',
    'minor': 'm',
    'augmented': 'aug',
    'dominant7': '7',
    'major7': 'Maj7',
    'minor7': 'm7',
    'half_diminished7': 'm7♭5',
    'diminished7': 'dim7'
  }
  display += chordTypeDisplay[props.harmony.chordType] || ''
  
  // 显示挂留类型
  if (props.harmony.suspensionType) {
    display += props.harmony.suspensionType
  }
  
  // 显示扩展音 - 以上标形式显示
  if (props.harmony.extensions && props.harmony.extensions.length > 0) {
    const extensionsStr = props.harmony.extensions.join(',')
    display += `<sup>${extensionsStr}</sup>`
  }
  
  // 显示省略音 - 新格式
  if (props.harmony.omissions && props.harmony.omissions.length > 0) {
    display += `(omit${props.harmony.omissions.join(',')})`
  }
  
  // 显示转位低音
  if (props.harmony.bassDegree) {
    let bassDisplay = ''
    if (props.harmony.bassAccidental) {
      bassDisplay += props.harmony.bassAccidental
    }
    bassDisplay += props.harmony.bassDegree
    display += `/${bassDisplay}`
  }
  
  return display
})

// 预览具体音名和弦（基于原始数据，不实时更新）
const previewChordName = computed(() => {
  if (!props.harmony) return 'C'
  
  // 获取当前片段的调性信息
  const currentSegment = store.selectedSegment
  const segmentKey = currentSegment?.key || 'C'
  
  // 基于根音级数、升降号和和弦类型生成基础和弦名称
  let chord = generateChordName(props.harmony.rootDegree, props.harmony.accidental, props.harmony.chordType, segmentKey) || props.harmony.chord || 'C'
  
  // 添加挂留类型
  if (props.harmony.suspensionType) {
    chord += props.harmony.suspensionType
  }
  
  // 添加扩展音 - 以上标形式显示
  if (props.harmony.extensions && props.harmony.extensions.length > 0) {
    const extensionsStr = props.harmony.extensions.join(',')
    chord += `<sup>${extensionsStr}</sup>`
  }
  
  // 添加省略音 - 新格式
  if (props.harmony.omissions && props.harmony.omissions.length > 0) {
    chord += `(omit${props.harmony.omissions.join(',')})`
  }
  
  // 添加低音级数（转位低音）
  if (props.harmony.bassDegree) {
    const bassNote = generateChordName(props.harmony.bassDegree, props.harmony.bassAccidental, 'major', segmentKey)
    chord += `/${bassNote}`
  }
  
  return chord
})

// 监听 modelValue 变化
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
})

// 监听 visible 变化
watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
  if (!newVal) {
    emit('close')
  }
})

// 监听 harmony 变化
watch(() => props.harmony, (newHarmony) => {
  if (newHarmony) {
    Object.assign(editingHarmony, {
      ...newHarmony,
      rootDegree: newHarmony.rootDegree || 'I',
      accidental: newHarmony.accidental || '',
      chordType: newHarmony.chordType || 'major',
      suspensionType: newHarmony.suspensionType || '',
      bassNote: newHarmony.bassNote || undefined,
      extensions: newHarmony.extensions || [],
      omissions: newHarmony.omissions || [],
      roman: newHarmony.roman || undefined,
      color: newHarmony.color || '#409EFF'
    })
    
  }
}, { immediate: true })

// 更新和声数据
const updateHarmony = () => {
  if (props.harmony) {
    emit('update-harmony', { ...editingHarmony })
  }
}

// 保存和声
const saveHarmony = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    saving.value = true
    
    // 获取当前片段的调性信息
    const currentSegment = store.selectedSegment
    const segmentKey = currentSegment?.key || 'C'
    
    // 清理数据
    const cleanedHarmony = {
      ...editingHarmony,
      chord: generateChordName(editingHarmony.rootDegree, editingHarmony.accidental, editingHarmony.chordType, segmentKey),
      rootDegree: editingHarmony.rootDegree || 'I',
      accidental: editingHarmony.accidental || '',
      chordType: editingHarmony.chordType || 'major',
      suspensionType: editingHarmony.suspensionType || '',
      bassNote: editingHarmony.bassNote?.trim() || undefined,
      roman: editingHarmony.roman?.trim() || undefined,
      extensions: editingHarmony.extensions?.filter(ext => ext.trim().length > 0) || [],
      omissions: editingHarmony.omissions?.filter(omit => omit.trim().length > 0) || []
    }
    
    emit('update-harmony', cleanedHarmony)
    ElMessage.success('和声已保存')
    
    // 延迟关闭，让用户看到成功消息
    setTimeout(() => {
      handleClose()
    }, 500)
    
  } catch (error) {
    console.error('保存和声失败:', error)
    ElMessage.error('请检查输入内容')
  } finally {
    saving.value = false
  }
}

// 删除和声
const deleteHarmony = async () => {
  if (!props.harmony) return
  
  try {
    await ElMessageBox.confirm(
      '确定要删除这个和声片段吗？此操作不可撤销。',
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    emit('delete-harmony', props.harmony.id)
    ElMessage.success('和声已删除')
    
  } catch {
    // 用户取消删除
  }
}

// 关闭面板
const handleClose = () => {
  visible.value = false
}
</script>

<style scoped>
.harmony-drawer {
  --el-drawer-padding-primary: 20px;
}

.edit-form {
  padding: 0 4px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.form-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409EFF;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 4px;
  background: #409EFF;
  border-radius: 50%;
}

.preview-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f0f2f5;
  border-radius: 8px;
}

.harmony-preview {
  padding: 16px;
  border-radius: 6px;
  color: white;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.preview-chord-degree {
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  font-family: 'Times New Roman', serif;
  /* 支持上标显示 */
  position: relative;
  opacity: 0.95;
}

.preview-chord-degree sup {
  font-size: 12px;
  vertical-align: super;
  line-height: 0;
}

.preview-chord-name {
  font-size: 18px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  font-family: 'Times New Roman', serif;
  /* 支持上标显示 */
  position: relative;
  opacity: 0.9;
}

.preview-chord-name sup {
  font-size: 11px;
  vertical-align: super;
  line-height: 0;
}

.preview-info {
  font-size: 12px;
  opacity: 0.9;
}

.preview-type {
  font-size: 11px;
  opacity: 0.8;
  font-style: italic;
}

.form-actions {
  margin-top: auto;
  padding-top: 20px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  border-top: 1px solid #e4e7ed;
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
}

:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}
</style>