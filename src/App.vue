<template>
  <div class="app">
    <!-- 顶部工具栏 -->
    <el-header class="app-header">
      <div class="header-left">
        <!-- Logo下拉菜单 -->
        <el-dropdown @command="handleLogoMenuCommand" trigger="click">
          <img src="/korder-logo.png" class="logo-dropdown" title="项目管理" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="new" :icon="DocumentAdd">
                新建项目
              </el-dropdown-item>
              <el-dropdown-item command="load" :icon="FolderOpened">
                加载项目
              </el-dropdown-item>
              <el-dropdown-item command="save" :icon="Download">
                保存项目
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-divider direction="vertical" />
        <!-- 播放信息与设置（放在播放控制左侧） -->
        <div class="time-info">
          <el-tag size="large" color="#000000" effect="dark" round type="info">
            <span class="current-time-label"
              >{{ formatTime(store.currentSec) }} /
              {{ formatTime(store.audioDuration) }}</span
            >
          </el-tag>
        </div>

        <el-divider direction="vertical" />
        <!-- BPM 设置 -->
        <div class="setting-item">
          <img src="/BPM.png" class="setting-icon" />
          <el-input-number
            v-model="store.bpm"
            @change="onBpmChange"
            :min="20"
            :max="300"
            size="default"
            style="width: 110px"
          />
        </div>

        <!-- 量化级别 -->
        <div class="setting-item">
          <svg
            t="1761233994322"
            viewBox="0 0 1024 1024"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            p-id="29831"
            width="24"
            height="24"
          >
            <path
              d="M678.218667 302.602667H842.666667a32 32 0 0 1 31.946666 30.122666l0.053334 1.877334V522.666667c0 212.074667-150.592 384-362.666667 384-209.952 0-359.648-168.501333-362.624-377.653334L149.333333 522.666667V334.613333a32 32 0 0 1 30.122667-31.946666l1.877333-0.064h164.437334a32 32 0 0 1 31.946666 30.112l0.053334 1.888v202.613333c0 72.010667 56.778667 130.944 127.893333 134.08l3.306667 0.106667 3.029333 0.032c72.010667 0 130.944-56.768 134.08-127.893334l0.106667-3.285333 0.032-3.04V334.613333a32 32 0 0 1 30.122666-31.946666l1.877334-0.053334z m95.776 316.853333c-22.208 73.866667-75.082667 135.146667-144.64 168.202667a21.333333 21.333333 0 0 0 18.314666 38.538666c80.416-38.218667 141.504-109.013333 167.189334-194.453333a21.333333 21.333333 0 0 0-40.864-12.288zM349.077333 117.333333c15.850667 0 28.693333 11.797333 28.693334 26.346667v96.64c0 14.549333-12.842667 26.346667-28.693334 26.346667H182.474667c-15.850667 0-28.693333-11.797333-28.693334-26.346667v-96.64c0-14.549333 12.842667-26.346667 28.693334-26.346667z m492.448 0c15.850667 0 28.693333 11.797333 28.693334 26.346667v96.64c0 14.549333-12.842667 26.346667-28.693334 26.346667h-166.613333c-15.84 0-28.693333-11.797333-28.693333-26.346667v-96.64c0-14.549333 12.853333-26.346667 28.693333-26.346667z"
              p-id="29832"
            ></path>
          </svg>
          <el-select
            v-model="store.quantization"
            size="default"
            style="width: 110px"
          >
            <el-option value="quarter" label="1拍" />
            <el-option value="eighth" label="1/2拍" />
            <el-option value="sixteenth" label="1/4拍" />
          </el-select>
        </div>

        <el-divider direction="vertical" />

        <!-- 播放控制 -->
        <div class="control-group">
          <div class="custom-button-group">
            <button
              @click="seekToStart"
              class="custom-button"
              title="跳转至初始强拍位置"
            >
              <img src="/init.svg" class="button-icon" alt="跳转至开头" />
            </button>
            <button
              @click="togglePlay"
              class="custom-button"
              :class="{ playing: store.isPlaying }"
              :title="store.isPlaying ? '暂停' : '播放'"
            >
              <img
                :src="store.isPlaying ? '/pause.svg' : '/play.svg'"
                class="button-icon"
                :alt="store.isPlaying ? '暂停' : '播放'"
              />
            </button>
            <button @click="stopPlay" class="custom-button" title="停止">
              <img src="/stop.svg" class="button-icon" alt="停止" />
            </button>
          </div>
        </div>

        <el-divider direction="vertical" />

        <!-- 设定初始强拍 -->
        <el-button
          @click="openBeatOffsetDialog"
          :icon="Timer"
          size="default"
          title="设定初始强拍"
          :disabled="!store.hasAudio"
        >
          设定初始强拍
        </el-button>
      </div>

      <div class="header-right">
        <!-- 右侧暂留空，保留布局占位 -->
      </div>
    </el-header>

    <!-- 主内容区 -->
    <div class="app-content">
      <!-- 左侧主内容区域 -->
      <el-main ref="appMainRef" class="app-main">
        <!-- 波形显示区域 -->
        <el-card class="waveform-card" shadow="never">
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
          <div
            v-if="!store.hasAudio"
            class="waveform-placeholder"
            @click="fileInput?.click()"
          >
            <el-icon><Upload /></el-icon>
            <el-text>点击此处导入音频文件（支持.mp3/.wav/.flac）</el-text>
          </div>

          <!-- 和声轨 -->
          <div v-if="store.hasAudio" class="harmony-track-container">
            <HarmonyTrack ref="harmonyTrackRef" />
          </div>
        </el-card>

        <!-- 时间轴区域 -->
        <el-card class="timeline-card" shadow="never">
          <Timeline @edit-harmony="onEditHarmony" />
        </el-card>
      </el-main>

      <!-- 右侧常驻侧边栏区域 -->
      <aside class="app-sidebar">
        <div class="sidebar-content">
          <Transition name="sidebar-content" mode="out-in">
            <SidePanel
              v-if="selectedHarmony"
              :key="selectedHarmony?.id"
              :harmony="selectedHarmony"
              @update-harmony="onUpdateHarmony"
              @delete-harmony="onDeleteHarmony"
              @close="onCloseSidePanel"
            />
            <div v-else key="placeholder" class="sidebar-placeholder">
              <el-empty
                description="双击和声块进行编辑"
                image="/side-panel-empty.png"
                :image-size="128"
              />
            </div>
          </Transition>
        </div>
      </aside>
    </div>

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
import { ref, onMounted, onUnmounted, computed, nextTick } from "vue";
import {
  DocumentAdd,
  FolderOpened,
  Download,
  Timer,
  Upload,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import Timeline from "./components/Timeline.vue";
import SidePanel from "./components/SidePanel.vue";
import HarmonyTrack from "./components/HarmonyTrack.vue";
import { usePlayerStore } from "./stores/player";
import type { ProgressionFile, HarmonySegment } from "./types/progression";
import * as transport from "./services/transport";
import * as wave from "./services/wave";
import emptyImage from "./assets/img/side-panel-empty.png";

const store = usePlayerStore();

// Refs
const waveformRef = ref<HTMLDivElement>();
const harmonyTrackRef = ref();
const fileInput = ref<HTMLInputElement>();
const projectFileInput = ref<HTMLInputElement>();
const appMainRef = ref<HTMLElement>();

// 对话框状态
const showBeatOffsetDialog = ref(false);
const beatOffsetTime = ref(0);
const timeInputString = ref("0:00.000");

// 游标拖拽状态
const isDraggingCursor = ref(false);

// 侧边栏状态
const selectedHarmony = ref<HarmonySegment | null>(null);

// 初始化示例数据
const initSampleData = () => {
  // 创建默认片段（空白片段，不添加示例和声）
  const defaultSegment = store.createDefaultSegment();
  store.addSegment(defaultSegment);
};

// 键盘事件处理
const handleKeyDown = (event: KeyboardEvent) => {
  // 空格键播放/暂停
  if (event.code === "Space") {
    // 阻止默认行为（如页面滚动）
    event.preventDefault();
    event.stopPropagation();

    // 如果焦点在输入框或可编辑元素上，不触发播放/暂停
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.getAttribute("contenteditable") === "true" ||
        activeElement.closest(".el-input") ||
        activeElement.closest(".el-textarea"))
    ) {
      return;
    }

    togglePlay();
  }
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
      ElMessage.success("音频加载完成");
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

  // 添加键盘事件监听
  document.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  // 移除键盘事件监听
  document.removeEventListener("keydown", handleKeyDown);
});

// 方法
const handleLogoMenuCommand = (command: string) => {
  switch (command) {
    case "new":
      newProject();
      break;
    case "load":
      loadProject();
      break;
    case "save":
      saveProject();
      break;
  }
};

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
    console.error("播放控制错误:", error);
    ElMessage.error("播放控制失败");
  }
};

const stopPlay = () => {
  transport.stopTransport();
  wave.stopAudio();
  store.setPlaying(false);
  store.setCurrentTime(0);
};

const seekToStart = () => {
  const offset = Math.min(
    Math.max(store.beatOffset || 0, 0),
    store.audioDuration || 0
  );
  transport.seekTransportSeconds(offset);
  wave.seekSeconds(offset);
  store.setCurrentTime(offset);
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
      console.error("音频加载错误:", error);
      ElMessage.error("音频文件加载失败，请检查文件格式");
    }
  }
};

const saveProject = () => {
  const project = store.exportProject();
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.title || "和弦进行"}.chp.json`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success("项目保存成功");
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
      console.error("项目加载错误:", error);
      ElMessage.error("项目文件加载失败，请检查文件格式");
    }
  }
};

const newProject = () => {
  ElMessageBox.confirm(
    "确定要新建项目吗？当前项目的未保存更改将丢失。",
    "新建项目",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    }
  )
    .then(() => {
      store.reset();
      initSampleData();
      ElMessage.success("新项目创建成功");
    })
    .catch(() => {
      // 用户取消
    });
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms
    .toString()
    .padStart(3, "0")}`;
};

// 解析时间字符串为秒数
const parseTimeString = (timeStr: string): number => {
  const regex = /^(\d+):(\d{2})\.(\d{3})$/;
  const match = timeStr.match(regex);
  if (!match) return 0;

  const [, mins, secs, ms] = match;
  return parseInt(mins!) * 60 + parseInt(secs!) + parseInt(ms!) / 1000;
};

// 设定初始强拍相关函数
const cancelBeatOffset = () => {
  showBeatOffsetDialog.value = false;
  beatOffsetTime.value = store.beatOffset || 0;
};

const saveBeatOffset = () => {
  store.setBeatOffset(beatOffsetTime.value);
  showBeatOffsetDialog.value = false;
  ElMessage.success("初始强拍设定成功");
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
    ElMessage.warning("请输入有效的时间格式（分钟:秒.毫秒）");
  }
};

// 游标位置计算
const beatOffsetCursorStyle = computed(() => {
  if (!store.hasAudio || store.audioDuration === 0) {
    return { display: "none" };
  }

  const position = (store.beatOffset / store.audioDuration) * 100;
  return {
    left: `${Math.max(0, Math.min(position, 100))}%`,
  };
});

// 侧边栏事件处理
const onEditHarmony = (harmony: HarmonySegment) => {
  selectedHarmony.value = harmony;
  store.selectHarmony(harmony.id); // 同步选中状态到 store
};

const onUpdateHarmony = (updatedHarmony: HarmonySegment) => {
  store.updateHarmony(updatedHarmony.id, updatedHarmony);
};

const onDeleteHarmony = (harmonyId: string) => {
  store.removeHarmony(harmonyId);
  selectedHarmony.value = null;
  store.selectHarmony(null); // 清除选中状态
};

const onCloseSidePanel = () => {
  selectedHarmony.value = null;
  store.selectHarmony(null); // 清除选中状态
};

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
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
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

.app-content {
  flex: 1;
  display: flex;
  height: 0; /* 确保 flex 子元素正确计算高度 */
}

.app-main {
  flex: 1;
  padding: 20px;
  overflow-y: hidden;
  overflow-x: hidden;
  height: 100%;
}

/* 移除自定义滚动条样式 */

.app-sidebar {
  width: 380px;
  flex-shrink: 0;
  border-left: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  height: 100%;
  overflow: hidden;
}

.sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 侧边栏内容过渡动画 */
.sidebar-content-enter-active,
.sidebar-content-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-content-enter-from {
  opacity: 0;
  transform: translateX(20px) scale(0.95);
}

.sidebar-content-leave-to {
  opacity: 0;
  transform: translateX(-20px) scale(0.95);
}

.sidebar-content-enter-to,
.sidebar-content-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
}

.sidebar-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--el-text-color-placeholder);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
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
  gap: 6px;
}

.setting-icon {
  height: 32px;
  width: 32px;
}

.harmony-track-container {
  margin-top: 10px;
  width: 100%;
}

.waveform-card {
  margin-bottom: 20px;
  width: 100%;
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
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: 8px;
}

.waveform-placeholder:hover {
  background-color: var(--el-fill-color-light);
}

.timeline-card {
  margin-bottom: 20px;
  width: 100%;
}

.time-info {
  display: flex;
  gap: 6px;
}

.current-time-label {
  font-size: 14px;
  font-family: Cambria, Cochin, Georgia, Times, "Times New Roman", serif;
  font-weight: bold;
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

/* 自定义按钮组样式 */
.custom-button-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.custom-button {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  outline: none;
}

.custom-button:hover {
  background-color: #f0f0f0;
}

.custom-button:active {
  background-color: #e0e0e0;
}

.custom-button.playing {
  background-color: #e0e0e0;
  color: white;
}

.custom-button.playing:hover {
  background-color: #c9c9c9;
}

.button-icon {
  width: 16px;
  height: 16px;
  display: block;
  fill: currentColor;
}

.custom-button.playing .button-icon {
  fill: white;
}

.logo-dropdown {
  cursor: pointer;
  transition: opacity 0.2s ease, background-color 0.2s ease,
    border-radius 0.2s ease;
  background-color: transparent;
  border-radius: 5px;
}

.logo-dropdown:hover {
  opacity: 0.8;
  background-color: #e0e0e0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .app-sidebar {
    width: 350px;
  }
}

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

  .app-content {
    flex-direction: column;
  }

  .app-sidebar {
    width: 100%;
    height: 300px;
    border-left: none;
    border-top: 1px solid var(--el-border-color-light);
  }

  .app-main {
    padding: 12px;
  }
}
</style>
