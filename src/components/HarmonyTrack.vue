<template>
  <div ref="trackRef" class="harmony-track" :style="{ width: trackWidth + 'px' }">
    <!-- 片段显示 -->
    <div class="segments-container">
      <div 
        v-for="segment in visibleSegments" 
        :key="segment.id"
        class="segment-block"
        :style="{ 
          left: segment.position + 'px', 
          width: segment.width + 'px' 
        }"
      >
        <!-- 片段矩形 -->
        <div 
          class="segment-rect"
          :style="{ backgroundColor: segment.color }"
          :title="segment.width >= 80 ? '' : `${segment.name} (${segment.measures}小节)`"
          @mouseenter="segment.width < 80 ? showTooltip(segment) : null"
          @mouseleave="segment.width < 80 ? hideTooltip() : null"
          @click="handleSegmentClick(segment)"
        >
          <div class="segment-content" :class="{ 'compact': segment.width < 80 }">
            <template v-if="segment.width >= 80">
              <div class="segment-name">{{ segment.name }}</div>
              <div class="segment-info">{{ segment.measures }}小节</div>
            </template>
            <template v-else>
              <div class="segment-ellipsis">...</div>
            </template>
          </div>
          
          <!-- 悬停气泡提示 - 仅对小片段显示 -->
          <div 
            v-if="tooltipVisible && tooltipSegment && tooltipSegment.id === segment.id && segment.width < 80"
            class="segment-tooltip"
          >
            <div class="tooltip-content">
              <div class="tooltip-name">{{ segment.name }}</div>
              <div class="tooltip-info">{{ segment.measures }}小节</div>
            </div>
          </div>
        </div>
        
        <!-- 开始小节数 -->
        <div class="measure-marker start-marker">{{ segment.startMeasure }}</div>
        
        <!-- 结束小节数 -->
        <div class="measure-marker end-marker">{{ segment.endMeasure }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { usePlayerStore } from '../stores/player';
import type { HarmonySegment } from '../types/progression';

const store = usePlayerStore();

// 轨道容器引用
const trackRef = ref<HTMLDivElement>();

// 悬停气泡状态
const tooltipVisible = ref(false);
const tooltipSegment = ref<any>(null);

// 显示气泡提示
const showTooltip = (segment: any) => {
  tooltipSegment.value = segment;
  tooltipVisible.value = true;
};

// 隐藏气泡提示
const hideTooltip = () => {
  tooltipVisible.value = false;
  tooltipSegment.value = null;
};

// 处理片段点击事件
const handleSegmentClick = (segment: any) => {
  // 找到对应的ProjectSegment
  const targetSegment = store.segments.find(s => s.id === segment.id);
  if (targetSegment) {
    // 展开点击的片段，折叠其他所有片段
    store.segments.forEach(s => {
      const shouldExpand = s.id === segment.id;
      if (s.isExpanded !== shouldExpand) {
        store.updateSegment({
          ...s,
          isExpanded: shouldExpand
        });
      }
    });
  }
};

// 获取轨道宽度（与波形宽度一致）
const getTrackWidth = () => {
  // 通过父组件的波形容器获取实际宽度
  const waveformContainer = document.querySelector('.waveform');
  if (waveformContainer) {
    return waveformContainer.clientWidth;
  }
  return 800; // 默认宽度
};

// 响应式轨道宽度
const trackWidth = ref(800);

// 更新轨道宽度
const updateTrackWidth = () => {
  nextTick(() => {
    trackWidth.value = getTrackWidth();
  });
};

// 监听窗口大小变化
onMounted(() => {
  updateTrackWidth();
  window.addEventListener('resize', updateTrackWidth);
});

// 监听音频加载状态变化
watch(() => store.hasAudio, () => {
  if (store.hasAudio) {
    updateTrackWidth();
  }
});

// 计算可见片段
const visibleSegments = computed(() => {
  if (!store.hasAudio || store.audioDuration === 0 || store.segments.length === 0) return [];
  
  const bpm = store.bpm;
  const timeSignature = store.timeSignature;
  const beatsPerMeasure = timeSignature.numerator;
  
  // 计算总拍数和像素比例
  const totalSeconds = store.audioDuration;
  const beatOffsetSeconds = store.beatOffset || 0;
  const totalBeats = (totalSeconds / 60) * bpm;
  const pixelsPerBeat = trackWidth.value / totalBeats;
  
  // 计算初始强拍偏移的像素位置
  const beatOffsetPixels = (beatOffsetSeconds / 60) * bpm * pixelsPerBeat;
  
  const result = [];
  let currentMeasure = 1; // 从第1小节开始
  let currentBeat = 0;
  
  for (const segment of store.segments) {
    const segmentBeats = segment.measures * beatsPerMeasure;
    const segmentWidth = segmentBeats * pixelsPerBeat;
    const segmentPosition = beatOffsetPixels + (currentBeat * pixelsPerBeat);
    
    const startMeasure = currentMeasure;
    const endMeasure = currentMeasure + segment.measures - 1;
    
    result.push({
      id: segment.id,
      name: segment.name,
      measures: segment.measures,
      position: segmentPosition,
      width: segmentWidth,
      startMeasure,
      endMeasure,
      color: segment.color || '#409EFF'
    });
    
    currentBeat += segmentBeats;
    currentMeasure += segment.measures;
  }
  
  return result;
});
</script>

<style scoped>
.harmony-track {
  position: relative;
  height: 60px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.segments-container {
  position: relative;
  height: 100%;
  width: 100%;
}

.segment-block {
  position: absolute;
  height: 100%;
}

.segment-rect {
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  height: 36px;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.segment-rect:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.segment-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 4px 8px;
  min-width: 0;
}

.segment-content.compact {
  padding: 0;
}

.segment-ellipsis {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  color: white;
  opacity: 0.8;
}

.segment-name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.segment-info {
  font-size: 10px;
  font-weight: 500;
  opacity: 0.9;
  line-height: 1;
  white-space: nowrap;
}

.measure-marker {
  position: absolute;
  top: -2px;
  background: #606266;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 3px;
  z-index: 10;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.start-marker {
  left: 0;
  transform: translateX(-50%);
}

.end-marker {
  right: 0;
  transform: translateX(50%);
}

/* 悬停气泡提示样式 */
.segment-tooltip {
  position: absolute;
  top: 45px;
  left: 50%;
  transform: translateX(-50%);
  background: #303133;
  color: white;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  animation: tooltip-fade-in 0.2s ease-out;
}

.segment-tooltip::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-bottom-color: #303133;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.tooltip-name {
  font-weight: 600;
  font-size: 13px;
}

.tooltip-info {
  font-size: 11px;
  opacity: 0.9;
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>