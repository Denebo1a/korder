<template>
  <div class="app">
    <!-- 顶部工具栏 -->
    <el-header class="app-header">
      <div class="header-left">
        <h1 class="app-title">和弦进行播放器</h1>
        <el-divider direction="vertical" />
        
        <!-- 播放控制 -->
        <div class="control-group">
          <el-button-group>
            <el-button @click="seekToStart" :icon="DArrowLeft" size="small" />
            <el-button 
              @click="togglePlay" 
              :type="store.isPlaying ? 'danger' : 'primary'"
              :icon="store.isPlaying ? VideoPause : VideoPlay"
              size="small"
            />
            <el-button @click="stopPlay" :icon="Close" size="small" />
          </el-button-group>
        </div>
        
        <el-divider direction="vertical" />
        
        <!-- 项目管理 -->
        <div class="control-group">
          <el-button-group>
            <el-button @click="newProject" :icon="DocumentAdd" size="small" title="新建项目" />
            <el-button @click="loadProject" :icon="FolderOpened" size="small" title="加载项目" />
            <el-button @click="saveProject" :icon="Download" size="small" title="保存项目" />
          </el-button-group>
        </div>
        
        <el-divider direction="vertical" />
        
        <!-- 音频导入 -->
        <el-button @click="fileInput?.click()" :icon="Microphone" size="small" title="导入音频">
          导入音频
        </el-button>
        
        <el-divider direction="vertical" />
        
        <!-- 设定初始强拍 -->
        <el-button 
          @click="openBeatOffsetDialog" 
          :icon="Timer" 
          size="small" 
          title="设定初始强拍"
          :disabled="!store.hasAudio"
        >
          设定初始强拍
        </el-button>
      </div>
      
      <div class="header-right">
        <!-- BPM 设置 -->
        <div class="setting-item">
          <span class="setting-label">BPM:</span>
          <el-input-number 
            v-model="store.bpm" 
            @change="onBpmChange"
            :min="20" 
            :max="300"
            size="small"
            style="width: 80px"
          />
        </div>
        
        <!-- 每行小节数 -->
        <div class="setting-item">
          <span class="setting-label">每行:</span>
          <el-select v-model="store.measuresPerRow" size="small" style="width: 80px">
            <el-option :value="4" label="4小节" />
            <el-option :value="8" label="8小节" />
          </el-select>
        </div>
        
        <!-- 视图选项 -->
        <el-switch 
          v-model="store.showWaveform"
          active-text="波形"
          size="small"
        />
      </div>
    </el-header>

    <!-- 主内容区 -->
    <el-main class="app-main">
      <!-- 波形显示区域 -->
      <el-card v-if="store.showWaveform" class="waveform-card" shadow="never">
        <div class="waveform-container">
          <div ref="waveformRef" class="waveform"></div>
          <!-- 初始强拍游标 -->
          <div 
            v-if="store.hasAudio"
            class="beat-offset-cursor"
            :style="beatOffsetCursorStyle"
            @mousedown="startDragCursor"
            title="初始强拍位置 - 拖动调整"
          >
            <div class="cursor-line"></div>
            <div class="cursor-handle">♪</div>
          </div>
        </div>
        <div v-if="!store.hasAudio" class="waveform-placeholder">
          <el-empty description="请导入音频文件以显示波形" :image-size="60" />
        </div>
      </el-card>

      <!-- 时间轴区域 -->
      <el-card class="timeline-card" shadow="never">
        <template #header>
          <div class="timeline-header">
            <span>和声进行</span>
            <div class="time-info">
              <el-tag size="small" type="info">
                {{ formatTime(store.currentSec) }} / {{ formatTime(store.audioDuration) }}
              </el-tag>
              <el-tag size="small" type="success">
                拍: {{ store.adjustedCurrentBeat.toFixed(1) }}
              </el-tag>
            </div>
          </div>
        </template>
        
        <Timeline />
      </el-card>
    </el-main>

    <!-- 移除侧边编辑面板，现在使用内嵌的片段编辑器 -->

    <!-- 隐藏的文件输入 -->
    <input 
      type="file" 
      accept="audio/*" 
      @change="onAudioFile" 
      ref="fileInput"
      style="display: none"
    />
    <input 
      type="file" 
      accept=".chp.json,.json" 
      @change="onProjectFile" 
      ref="projectFileInput"
      style="display: none"
    />
    
    <!-- 设定初始强拍对话框 -->
    <el-dialog
      v-model="showBeatOffsetDialog"
      title="设定初始强拍"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="beat-offset-dialog">
        <div class="dialog-section">
          <label class="dialog-label">当前设定的初始强拍位置：</label>
          <div class="time-display">{{ formatTime(beatOffsetTime) }}</div>
        </div>
        
        <div class="dialog-section">
          <label class="dialog-label">输入时间（格式：分钟:秒.毫秒）：</label>
          <el-input
            v-model="timeInputString"
            placeholder="0:00.000"
            style="width: 150px"
            @blur="onTimeInputChange"
            @keyup.enter="onTimeInputChange"
          />
        </div>
        
        <div class="dialog-section">
          <el-text type="info" size="small">
            设定此位置为第一个强拍的开始时间，用于准确对齐和弦进行与音频节拍。可以在波形图上拖动游标或直接输入时间。
          </el-text>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelBeatOffset">取消</el-button>
          <el-button type="primary" @click="saveBeatOffset">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { 
  VideoPlay, VideoPause, Close, DArrowLeft, 
  DocumentAdd, FolderOpened, Download, Microphone, Timer 
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import Timeline from './components/Timeline.vue';
import { usePlayerStore } from './stores/player';
import type { ProgressionFile } from './types/progression';
import * as transport from './services/transport';
import * as wave from './services/wave';

const store = usePlayerStore();

// Refs
const waveformRef = ref<HTMLDivElement>();
const fileInput = ref<HTMLInputElement>();
const projectFileInput = ref<HTMLInputElement>();

// 对话框状态
const showBeatOffsetDialog = ref(false);
const beatOffsetTime = ref(0);
const timeInputString = ref('0:00.000');

// 游标拖拽状态
const isDraggingCursor = ref(false);

// 音调选项
const keys = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

// 初始化示例数据
const initSampleData = () => {
  // 创建默认片段（空白片段，不添加示例和声）
  const defaultSegment = store.createDefaultSegment();
  store.addSegment(defaultSegment);
};

// 生命周期
onMounted(async () => {
  // 初始化示例数据
  initSampleData();
  
  // 初始化 wavesurfer
  if (waveformRef.value) {
    wave.createWaveSurfer(waveformRef.value);
    
    // 设置事件监听
    wave.onAudioProcess((currentTime) => {
      store.setCurrentTime(currentTime);
    });
    
    wave.onReady(() => {
      const duration = wave.getDuration();
      store.setAudioInfo(duration, true);
      ElMessage.success('音频加载完成');
    });
    
    wave.onPlay(() => {
      store.setPlaying(true);
    });
    
    wave.onPause(() => {
      store.setPlaying(false);
    });
    
    wave.onClick((progress) => {
      const duration = wave.getDuration();
      const seconds = progress * duration;
      transport.seekTransportSeconds(seconds);
    });
  }
  
  // 初始化 transport
  transport.setBpm(store.bpm);
});

// 方法
const togglePlay = async () => {
  try {
    if (store.isPlaying) {
      transport.pauseTransport();
      wave.pauseAudio();
    } else {
      await transport.startTransport();
      wave.playAudio();
    }
  } catch (error) {
    console.error('播放控制错误:', error);
    ElMessage.error('播放控制失败');
  }
};

const stopPlay = () => {
  transport.stopTransport();
  wave.stopAudio();
  store.setPlaying(false);
  store.setCurrentTime(0);
};

const seekToStart = () => {
  transport.seekTransportSeconds(0);
  wave.seekSeconds(0);
  store.setCurrentTime(0);
};

const onBpmChange = () => {
  transport.setBpm(store.bpm);
};

const onAudioFile = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    try {
      await wave.loadAudioBlob(file);
      ElMessage.success(`音频文件 "${file.name}" 加载成功`);
    } catch (error) {
      console.error('音频加载错误:', error);
      ElMessage.error('音频文件加载失败，请检查文件格式');
    }
  }
};

const saveProject = () => {
  const project = store.exportProject();
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title || '和弦进行'}.chp.json`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success('项目保存成功');
};

const loadProject = () => {
  projectFileInput.value?.click();
};

const onProjectFile = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    try {
      const text = await file.text();
      const project: ProgressionFile = JSON.parse(text);
      store.loadProject(project);
      transport.setBpm(store.bpm);
      ElMessage.success(`项目 "${project.title}" 加载成功`);
    } catch (error) {
      console.error('项目加载错误:', error);
      ElMessage.error('项目文件加载失败，请检查文件格式');
    }
  }
};

const newProject = () => {
  ElMessageBox.confirm('确定要新建项目吗？当前项目的未保存更改将丢失。', '新建项目', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    store.reset();
    initSampleData();
    ElMessage.success('新项目创建成功');
  }).catch(() => {
    // 用户取消
  });
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

// 解析时间字符串为秒数
const parseTimeString = (timeStr: string): number => {
  const regex = /^(\d+):(\d{2})\.(\d{3})$/;
  const match = timeStr.match(regex);
  if (!match) return 0;
  
  const [, mins, secs, ms] = match;
  return parseInt(mins) * 60 + parseInt(secs) + parseInt(ms) / 1000;
};

// 设定初始强拍相关函数
const cancelBeatOffset = () => {
  showBeatOffsetDialog.value = false;
  beatOffsetTime.value = store.beatOffset || 0;
};

const saveBeatOffset = () => {
  store.setBeatOffset(beatOffsetTime.value);
  showBeatOffsetDialog.value = false;
  ElMessage.success('初始强拍设定成功');
};

// 打开对话框时初始化当前值
const openBeatOffsetDialog = () => {
  beatOffsetTime.value = store.beatOffset || 0;
  timeInputString.value = formatTime(beatOffsetTime.value);
  showBeatOffsetDialog.value = true;
};

// 处理时间输入变化
const onTimeInputChange = () => {
  const parsedTime = parseTimeString(timeInputString.value);
  if (parsedTime >= 0 && parsedTime <= store.audioDuration) {
    beatOffsetTime.value = parsedTime;
  } else {
    // 如果输入无效，恢复为当前值
    timeInputString.value = formatTime(beatOffsetTime.value);
    ElMessage.warning('请输入有效的时间格式（分钟:秒.毫秒）');
  }
};

// 游标位置计算
const beatOffsetCursorStyle = computed(() => {
  if (!store.hasAudio || store.audioDuration === 0) {
    return { display: 'none' };
  }
  
  const position = (store.beatOffset / store.audioDuration) * 100;
  return {
    left: `${Math.max(0, Math.min(position, 100))}%`
  };
});

// 游标拖拽功能
const startDragCursor = (event: MouseEvent) => {
  event.preventDefault();
  isDraggingCursor.value = true;
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingCursor.value || !waveformRef.value) return;
    
    const rect = waveformRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(x / rect.width, 1));
    const newTime = percentage * store.audioDuration;
    
    store.setBeatOffset(newTime);
    beatOffsetTime.value = newTime;
    timeInputString.value = formatTime(newTime);
  };
  
  const handleMouseUp = () => {
    isDraggingCursor.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};
</script>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.control-group {
  display: flex;
  align-items: center;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-label {
  font-size: 12px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.app-main {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  overflow-x: hidden;
  height: 0;
}

.waveform-card {
  margin-bottom: 20px;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.waveform-container {
  position: relative;
  width: 100%;
}

.waveform {
  width: 100%;
  min-height: 80px;
}

.beat-offset-cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  cursor: ew-resize;
  z-index: 10;
  user-select: none;
}

.cursor-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ff4757;
  box-shadow: 0 0 4px rgba(255, 71, 87, 0.6);
}

.cursor-handle {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 18px;
  height: 18px;
  background: #ff4757;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.cursor-handle:hover {
  transform: scale(1.2);
}

.waveform-placeholder {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline-card {
  margin-bottom: 20px;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time-info {
  display: flex;
  gap: 8px;
}

/* 设定初始强拍对话框样式 */
.beat-offset-dialog {
  padding: 20px 0;
}

.dialog-section {
  margin-bottom: 20px;
}

.dialog-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.time-display {
  font-size: 18px;
  font-weight: bold;
  color: var(--el-color-primary);
  margin-bottom: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  
  .header-left,
  .header-right {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .app-main {
    padding: 12px;
  }
}
</style>
