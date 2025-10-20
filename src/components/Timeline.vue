<template>
  <div class="timeline-container">
    <!-- 工具栏 -->
    <div class="timeline-toolbar">
      <div class="toolbar-left">
        <el-button type="primary" @click="addNewSegment" :icon="Plus">
          添加片段
        </el-button>
        <el-divider direction="vertical" />
        <span class="total-info">
          共 {{ store.segments.length }} 个片段 · {{ totalMeasures }} 小节
        </span>
      </div>
      <div class="toolbar-right">
        <el-button-group size="small">
          <el-button @click="expandAllSegments" :icon="Expand">全部展开</el-button>
          <el-button @click="collapseAllSegments" :icon="Fold">全部折叠</el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 片段列表 -->
    <div class="segments-list">
      <div v-if="store.segments.length === 0" class="empty-state">
        <el-empty description="暂无片段">
          <el-button type="primary" @click="addNewSegment" :icon="Plus">
            创建第一个片段
          </el-button>
        </el-empty>
      </div>
      
      <div v-else class="segments-container">
        <SegmentEditor
          v-for="(segment, index) in store.segments"
          :key="segment.id"
          :segment="segment"
          :index="index"
          @update-segment="updateSegment"
          @duplicate-segment="duplicateSegment"
          @delete-segment="deleteSegment"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElButton, ElButtonGroup, ElDivider, ElEmpty, ElMessage } from 'element-plus'
import { Plus, Expand, Fold } from '@element-plus/icons-vue'
import SegmentEditor from './SegmentEditor.vue'
import type { ProjectSegment } from '../types/progression'
import { usePlayerStore } from '../stores/player'

const store = usePlayerStore()

// 计算属性
const totalMeasures = computed(() => {
  return store.segments.reduce((total, segment) => total + (segment?.measures || 0), 0)
})

// 方法
const addNewSegment = () => {
  // 获取上一个片段的调性，如果没有片段则默认C大调
  const lastSegment = store.segments[store.segments.length - 1]
  const defaultKey = lastSegment?.key || 'C'
  const defaultMode = lastSegment?.mode || 'major'
  
  const newSegment: ProjectSegment = {
    id: `segment-${Date.now()}`,
    name: `片段 ${store.segments.length + 1}`,
    measures: 4,
    isExpanded: true,
    harmonies: [], // 空白片段，不添加默认和声
    key: defaultKey,
    mode: defaultMode
  }
  store.addSegment(newSegment)
}

const updateSegment = (updatedSegment: ProjectSegment) => {
  store.updateSegment(updatedSegment)
}

const duplicateSegment = (index: number) => {
  const originalSegment = store.segments[index]
  if (!originalSegment) return
  
  const duplicatedSegment: ProjectSegment = {
    ...originalSegment,
    id: `segment-${Date.now()}`,
    name: `${originalSegment.name} (副本)`,
    harmonies: [...originalSegment.harmonies]
  }
  store.addSegment(duplicatedSegment, index + 1)
}

const deleteSegment = (index: number) => {
  if (store.segments.length > 1) {
    const segment = store.segments[index]
    if (segment) {
      store.removeSegment(segment.id)
    }
  } else {
    // 不允许删除最后一个片段
    ElMessage.warning('至少需要保留一个片段')
  }
}

const expandAllSegments = () => {
  store.segments.forEach(segment => {
    if (!segment.isExpanded) {
      updateSegment({ ...segment, isExpanded: true })
    }
  })
}

const collapseAllSegments = () => {
  store.segments.forEach(segment => {
    if (segment.isExpanded) {
      updateSegment({ ...segment, isExpanded: false })
    }
  })
}
</script>

<style scoped>
.timeline-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.timeline-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.total-info {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.segments-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 10px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.segments-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 滚动条样式 */
.segments-list::-webkit-scrollbar {
  width: 8px;
}

.segments-list::-webkit-scrollbar-track {
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
}

.segments-list::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 4px;
}

.segments-list::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-dark);
}
</style>