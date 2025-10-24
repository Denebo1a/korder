<template>
  <div class="harmony-editor">
    <!-- 编辑网格 -->
    <div class="harmony-grid">
      <!-- 按行分组显示小节 -->
      <div
        v-for="rowIndex in Math.ceil(segment.measures / 4)"
        :key="rowIndex"
        class="measure-row"
      >
        <div class="row-container">
          <!-- 每行的小节 -->
          <div
            v-for="colIndex in 4"
            :key="colIndex"
            class="measure-container"
            :class="{
              'measure-first': colIndex === 1,
              'measure-last':
                colIndex === 4 ||
                (rowIndex - 1) * 4 + colIndex === segment.measures,
              'measure-empty': (rowIndex - 1) * 4 + colIndex > segment.measures,
            }"
          >
            <!-- 小节数字标记，仅显示存在的小节 -->
            <div
              v-if="(rowIndex - 1) * 4 + colIndex <= segment.measures"
              class="measure-number"
            >
              {{ (rowIndex - 1) * 4 + colIndex }}
            </div>

            <!-- 小节内容，仅渲染存在的小节 -->
            <div
              v-if="(rowIndex - 1) * 4 + colIndex <= segment.measures"
              class="measure-content"
            >
              <!-- 拍子网格背景 -->
              <div class="beat-grid">
                <div
                  v-for="(subdivision, subdivisionIndex) in getSubdivisions()"
                  :key="subdivisionIndex"
                  class="beat-cell"
                  :class="{
                    'beat-strong': subdivision.isBeatStart,
                    'beat-subdivision': !subdivision.isBeatStart,
                    'beat-current': isCurrentSubdivision(
                      (rowIndex - 1) * 4 + colIndex - 1,
                      subdivisionIndex
                    ),
                  }"
                >
                  <span v-if="subdivision.isBeatStart">{{
                    subdivision.beatNumber
                  }}</span>
                </div>
              </div>

              <!-- 播放进度指示器 -->
              <div
                v-if="isPlayingInMeasure((rowIndex - 1) * 4 + colIndex - 1)"
                class="playback-cursor"
                :style="
                  getPlaybackCursorStyle((rowIndex - 1) * 4 + colIndex - 1)
                "
              ></div>

              <!-- 和声片段 -->
              <div class="harmony-layer">
                <div
                  v-for="harmony in getMeasureHarmonies(
                    (rowIndex - 1) * 4 + colIndex - 1
                  )"
                  :key="harmony.id"
                  class="harmony-segment"
                  :class="{
                    dragging: isDragging && draggedHarmonyId === harmony.id,
                    resizing: isResizing && resizedHarmonyId === harmony.id,
                    'drag-invalid':
                      isDragging &&
                      draggedHarmonyId === harmony.id &&
                      dragPreviewPosition &&
                      !dragPreviewPosition.isValid,
                    editing: store.selectedHarmonyId === harmony.id,
                  }"
                  :style="
                    getHarmonyStyle(harmony, (rowIndex - 1) * 4 + colIndex - 1)
                  "
                  @dblclick="editHarmony(harmony)"
                  @mousedown="startDrag($event, harmony)"
                >
                  <span class="harmony-chord">
                    <div
                      class="chord-degree"
                      v-html="getHarmonyDisplayText(harmony)"
                    ></div>
                    <div
                      class="chord-name"
                      v-html="getChordName(harmony)"
                    ></div>
                  </span>

                  <!-- 右边缘拖拽手柄：仅在和声真实结束所在小节显示 -->
                  <div
                    class="resize-handle"
                    v-if="
                      shouldShowResizeHandle(
                        harmony,
                        (rowIndex - 1) * 4 + colIndex - 1
                      )
                    "
                    @mousedown.stop="startResize($event, harmony)"
                    title="拖拽调整持续时间"
                  >
                    <div class="resize-indicator">
                      <div class="resize-grip"></div>
                      <div class="resize-grip"></div>
                      <div class="resize-grip"></div>
                    </div>
                  </div>

                  <!-- 持续时间提示 -->
                  <div
                    v-if="isResizing && resizedHarmonyId === harmony.id"
                    class="duration-tooltip"
                  >
                    {{ formatDuration(harmony.duration) }}
                  </div>
                </div>

                <!-- 添加按钮 -->
                <div
                  v-if="canAddHarmonyAt((rowIndex - 1) * 4 + colIndex - 1)"
                  class="add-harmony-btn"
                  :style="getAddButtonStyle((rowIndex - 1) * 4 + colIndex - 1)"
                  @click="addHarmony((rowIndex - 1) * 4 + colIndex - 1)"
                  title="添加和声"
                >
                  <el-icon><Plus /></el-icon>
                </div>
              </div>
            </div>
          </div>

          <!-- 行级播放游标 - 跨小节连续显示 -->
          <div
            v-if="isPlayingInRow(rowIndex - 1)"
            class="row-playback-cursor"
            :style="getRowPlaybackCursorStyle(rowIndex - 1)"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { ElIcon } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { usePlayerStore } from "../stores/player";
import type { ProjectSegment, HarmonySegment } from "../types/progression";
import { generateChordName } from "../utils/chordUtils";

interface Props {
  segment: ProjectSegment;
}

interface Emits {
  (e: "update-segment", segment: ProjectSegment): void;
  (e: "edit-harmony", harmony: HarmonySegment): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const store = usePlayerStore();

// 拖拽和调整大小状态
const isDragging = ref(false);
const isResizing = ref(false);
const draggedHarmonyId = ref<string | null>(null);
const resizedHarmonyId = ref<string | null>(null);
const dragStartX = ref(0);
const dragStartBeat = ref(0);
const resizeStartX = ref(0);
const resizeStartDuration = ref(0);
// 垂直拖拽支持
const dragStartY = ref(0);
const rowHeightPx = ref(0);

// 计算属性
const beatsPerMeasure = computed(() => {
  // 优先使用片段的拍号，如果没有则使用全局拍号
  return (
    props.segment.timeSignature?.numerator || store.timeSignature.numerator
  );
});
const beatsPerRow = computed(() => 4 * beatsPerMeasure.value);

// 获取量化细分
const getSubdivisions = () => {
  const subdivisions = [];
  const subdivisionsPerBeat = getSubdivisionsPerBeat();

  for (let beat = 1; beat <= beatsPerMeasure.value; beat++) {
    for (let sub = 0; sub < subdivisionsPerBeat; sub++) {
      subdivisions.push({
        isBeatStart: sub === 0,
        beatNumber: beat,
        subdivisionIndex: sub,
      });
    }
  }

  return subdivisions;
};

// 获取每拍的细分数
const getSubdivisionsPerBeat = () => {
  switch (store.quantization) {
    case "eighth":
      return 2;
    case "sixteenth":
      return 4;
    default:
      return 1; // quarter
  }
};

// 检查是否是当前播放的细分
const isCurrentSubdivision = (
  measureIndex: number,
  subdivisionIndex: number
) => {
  if (!store.isPlaying || currentBeatInSegment.value < 0) return false;

  const subdivisionsPerBeat = getSubdivisionsPerBeat();
  const totalSubdivisions = beatsPerMeasure.value * subdivisionsPerBeat;
  const measureStartSubdivision = measureIndex * totalSubdivisions;
  const currentSubdivision = Math.floor(
    currentBeatInSegment.value * subdivisionsPerBeat
  );

  return currentSubdivision === measureStartSubdivision + subdivisionIndex;
};

// 播放进度相关计算
const currentBeatInSegment = computed(() => {
  // 使用基于初始强拍偏移量的拍子计算
  const currentBeat = store.adjustedCurrentBeat;

  // 计算当前片段在项目中的起始拍数
  let segmentStartBeat = 0;
  for (const seg of store.segments) {
    if (seg.id === props.segment.id) {
      break;
    }
    segmentStartBeat += seg.measures * beatsPerMeasure.value;
  }

  // 计算在当前片段中的相对拍数
  const beatInSegment = currentBeat - segmentStartBeat;

  // 如果播放位置在当前片段范围内，返回相对拍数，否则返回-1
  const segmentTotalBeats = props.segment.measures * beatsPerMeasure.value;
  return beatInSegment >= 0 && beatInSegment < segmentTotalBeats
    ? beatInSegment
    : -1;
});

// 检查是否正在当前行播放
const isPlayingInRow = (rowIndex: number) => {
  if (!store.isPlaying || currentBeatInSegment.value < 0) return false;

  const rowStartBeat = rowIndex * 4 * beatsPerMeasure.value;
  const rowEndBeat = Math.min(
    (rowIndex + 1) * 4 * beatsPerMeasure.value,
    props.segment.measures * beatsPerMeasure.value
  );

  return (
    currentBeatInSegment.value >= rowStartBeat &&
    currentBeatInSegment.value < rowEndBeat
  );
};

// 获取行级播放游标样式
const getRowPlaybackCursorStyle = (rowIndex: number) => {
  if (currentBeatInSegment.value < 0) return { display: "none" };

  const rowStartBeat = rowIndex * 4 * beatsPerMeasure.value;
  const rowEndBeat = Math.min(
    (rowIndex + 1) * 4 * beatsPerMeasure.value,
    props.segment.measures * beatsPerMeasure.value
  );
  const rowTotalBeats = rowEndBeat - rowStartBeat;

  const relativePosition = currentBeatInSegment.value - rowStartBeat;
  const progressPercent = (relativePosition / rowTotalBeats) * 100;

  return {
    left: `${Math.max(0, Math.min(progressPercent, 100))}%`,
  };
};

// 检查是否正在当前小节播放
const isPlayingInMeasure = (measureIndex: number) => {
  if (!store.isPlaying || currentBeatInSegment.value < 0) return false;

  const measureStartBeat = measureIndex * beatsPerMeasure.value;
  const measureEndBeat = (measureIndex + 1) * beatsPerMeasure.value;

  return (
    currentBeatInSegment.value >= measureStartBeat &&
    currentBeatInSegment.value < measureEndBeat
  );
};

// 获取和弦名称（不包含级数）- 改为计算属性以支持响应式更新
const getChordName = computed(() => {
  // 添加对片段调性的响应式依赖
  const segmentKey = props.segment.key || "C";
  const segmentMode = props.segment.mode || "major";

  return (harmony: HarmonySegment) => {
    // 基于根音级数、升降号和和弦类型生成基础和弦名称
    let chord =
      generateChordName(
        harmony.rootDegree,
        harmony.accidental,
        harmony.chordType,
        segmentKey
      ) ||
      harmony.chord ||
      "C";

    // 添加挂留类型
    if (harmony.suspensionType) {
      chord += harmony.suspensionType;
    }

    // 添加扩展音 - 以上标形式显示
    if (harmony.extensions && harmony.extensions.length > 0) {
      const extensionsStr = harmony.extensions.join(",");
      chord += `<sup>${extensionsStr}</sup>`;
    }

    // 添加省略音 - 新格式
    if (harmony.omissions && harmony.omissions.length > 0) {
      chord += `(omit${harmony.omissions.join(",")})`;
    }

    // 添加低音级数（转位低音）
    if (harmony.bassDegree) {
      const bassNote = generateChordName(
        harmony.bassDegree,
        harmony.bassAccidental,
        "major",
        segmentKey
      );
      chord += `/${bassNote}`;
    }

    return chord;
  };
});

// 获取和声片段的显示文本（包含级数、和弦性质和转位低音）- 改为计算属性以支持响应式更新
const getHarmonyDisplayText = computed(() => {
  // 添加对片段调性的响应式依赖
  const segmentKey = props.segment.key || "C";
  const segmentMode = props.segment.mode || "major";

  return (harmony: HarmonySegment) => {
    let display = "";

    // 显示级数和升降号
    if (harmony.accidental) {
      display += harmony.accidental;
    }
    display += harmony.rootDegree || "I";

    // 显示和弦性质
    const chordTypeDisplay: Record<string, string> = {
      major: "",
      minor: "m",
      augmented: "aug",
      dominant7: "7",
      major7: "Maj7",
      minor7: "m7",
      half_diminished7: "m7♭5",
      diminished7: "dim7",
    };
    display += chordTypeDisplay[harmony.chordType] || "";

    // 显示挂留类型
    if (harmony.suspensionType) {
      display += harmony.suspensionType;
    }

    // 显示扩展音 - 以上标形式显示
    if (harmony.extensions && harmony.extensions.length > 0) {
      const extensionsStr = harmony.extensions.join(",");
      display += `<sup>${extensionsStr}</sup>`;
    }

    // 显示省略音 - 新格式
    if (harmony.omissions && harmony.omissions.length > 0) {
      display += `(omit${harmony.omissions.join(",")})`;
    }

    // 显示转位低音
    if (harmony.bassDegree) {
      let bassDisplay = "";
      if (harmony.bassAccidental) {
        bassDisplay += harmony.bassAccidental;
      }
      bassDisplay += harmony.bassDegree;
      display += `/${bassDisplay}`;
    }

    return display;
  };
});

// 使用 utils 中的 generateChordName（已在顶部引入）
const getPlaybackCursorStyle = (measureIndex: number) => {
  if (currentBeatInSegment.value < 0) return { display: "none" };

  const measureStartBeat = measureIndex * beatsPerMeasure.value;
  const relativePosition = currentBeatInSegment.value - measureStartBeat;
  const progressPercent = (relativePosition / beatsPerMeasure.value) * 100;

  return {
    left: `${Math.max(0, Math.min(progressPercent, 100))}%`,
  };
};

// 获取指定小节的和声片段
const getMeasureHarmonies = (measureIndex: number) => {
  const measureStart = measureIndex * beatsPerMeasure.value;
  const measureEnd = (measureIndex + 1) * beatsPerMeasure.value;

  return props.segment.harmonies.filter((harmony) => {
    const harmonyStart = harmony.startBeat;
    const harmonyEnd = harmony.startBeat + harmony.duration;

    // 和声片段与小节有重叠
    return harmonyStart < measureEnd && harmonyEnd > measureStart;
  });
};

// 获取和声片段样式
const getHarmonyStyle = (harmony: HarmonySegment, measureIndex: number) => {
  const measureStart = measureIndex * beatsPerMeasure.value;
  const measureEnd = (measureIndex + 1) * beatsPerMeasure.value;

  // 计算在当前小节内的相对位置
  const harmonyStart = Math.max(harmony.startBeat, measureStart);
  const harmonyEnd = Math.min(harmony.startBeat + harmony.duration, measureEnd);

  const relativeStart = harmonyStart - measureStart;
  const relativeDuration = harmonyEnd - harmonyStart;

  const left = (relativeStart / beatsPerMeasure.value) * 100;
  const width = (relativeDuration / beatsPerMeasure.value) * 100;

  return {
    left: `${left}%`,
    width: `${width}%`,
    backgroundColor: harmony.color || "#409EFF",
  };
};

// 仅在和声真实结束所在的小节显示拖拽手柄
const shouldShowResizeHandle = (
  harmony: HarmonySegment,
  measureIndex: number
) => {
  const measureStart = measureIndex * beatsPerMeasure.value;
  const measureEnd = (measureIndex + 1) * beatsPerMeasure.value;
  const harmonyEnd = harmony.startBeat + harmony.duration;
  return harmonyEnd <= measureEnd && harmonyEnd > measureStart;
};

// 检查是否可以在指定小节添加和声
const canAddHarmonyAt = (measureIndex: number) => {
  if (measureIndex >= props.segment.measures) return false;

  const measureStart = measureIndex * beatsPerMeasure.value;
  const measureEnd = (measureIndex + 1) * beatsPerMeasure.value;

  // 检查该小节是否有任何和声块
  const harmoniesInMeasure = props.segment.harmonies.filter((harmony) => {
    const harmonyEndBeat = harmony.startBeat + harmony.duration;
    return (
      (harmony.startBeat >= measureStart && harmony.startBeat < measureEnd) ||
      (harmonyEndBeat > measureStart && harmonyEndBeat <= measureEnd) ||
      (harmony.startBeat < measureStart && harmonyEndBeat > measureEnd)
    );
  });

  // 如果小节内没有和声块，可以添加
  if (harmoniesInMeasure.length === 0) {
    return true;
  }

  // 检查是否有足够的空间添加新和声（至少需要1拍的空间）
  const minDuration = 1; // 最小和声持续时间为1拍

  // 按起始拍排序
  const sortedHarmonies = harmoniesInMeasure.sort(
    (a, b) => a.startBeat - b.startBeat
  );

  // 检查小节开始到第一个和声之间的空间
  if (sortedHarmonies.length > 0 && sortedHarmonies[0].startBeat - measureStart >= minDuration) {
    return true;
  }

  // 检查和声之间的空隙
  for (let i = 0; i < sortedHarmonies.length - 1; i++) {
    const currentEnd =
      sortedHarmonies[i].startBeat + sortedHarmonies[i].duration;
    const nextStart = sortedHarmonies[i + 1].startBeat;
    if (nextStart - currentEnd >= minDuration) {
      return true;
    }
  }

  // 检查最后一个和声到小节结束的空间
  if (sortedHarmonies.length > 0) {
    const lastHarmony = sortedHarmonies[sortedHarmonies.length - 1];
    const lastEnd = lastHarmony.startBeat + lastHarmony.duration;
    if (measureEnd - lastEnd >= minDuration) {
      return true;
    }
  }

  return false;
};

// 获取添加按钮的位置
const getAddButtonStyle = (measureIndex: number) => {
  // 找到该小节最后一个和声块的结束位置
  const measureHarmonies = getMeasureHarmonies(measureIndex);
  const measureStart = measureIndex * beatsPerMeasure.value;
  const measureEnd = (measureIndex + 1) * beatsPerMeasure.value;

  let rightmostEnd = measureStart;

  measureHarmonies.forEach((harmony) => {
    const harmonyEnd = Math.min(
      harmony.startBeat + harmony.duration,
      measureEnd
    );
    if (harmonyEnd > rightmostEnd) {
      rightmostEnd = harmonyEnd;
    }
  });

  // 在最后一个和声块右侧一定距离显示按钮
  const relativePosition = rightmostEnd - measureStart + 0.2; // 增加0.2拍的间距
  const left = Math.min((relativePosition / beatsPerMeasure.value) * 100, 85); // 限制最大位置

  return {
    left: `${left}%`,
  };
};

// 添加和声片段
const addHarmony = (measureIndex: number) => {
  console.log("添加和声 - 小节:", measureIndex);

  if (!canAddHarmonyAt(measureIndex)) {
    console.warn("无法在此位置添加和声");
    return;
  }

  const measureStartBeat = measureIndex * beatsPerMeasure.value;
  const measureEndBeat = (measureIndex + 1) * beatsPerMeasure.value;

  // 找到最佳的放置位置
  const harmoniesInMeasure = props.segment.harmonies.filter((harmony) => {
    const harmonyEndBeat = harmony.startBeat + harmony.duration;
    return (
      (harmony.startBeat >= measureStartBeat &&
        harmony.startBeat < measureEndBeat) ||
      (harmonyEndBeat > measureStartBeat && harmonyEndBeat <= measureEndBeat) ||
      (harmony.startBeat < measureStartBeat && harmonyEndBeat > measureEndBeat)
    );
  });

  let startBeat = measureStartBeat;
  let duration = 1; // 默认持续时间为1拍

  if (harmoniesInMeasure.length === 0) {
    // 空小节，放在开头
    startBeat = measureStartBeat;
    duration = Math.min(beatsPerMeasure.value, 2); // 默认2拍或整个小节
  } else {
    // 按起始拍排序
    const sortedHarmonies = harmoniesInMeasure.sort(
      (a, b) => a.startBeat - b.startBeat
    );

    // 尝试在小节开始放置
    if (sortedHarmonies.length > 0 && sortedHarmonies[0].startBeat - measureStartBeat >= 1) {
      startBeat = measureStartBeat;
      duration = Math.min(sortedHarmonies[0].startBeat - measureStartBeat, 2);
    } else {
      // 寻找和声之间的空隙
      let placed = false;
      for (let i = 0; i < sortedHarmonies.length - 1; i++) {
        const currentEnd =
          sortedHarmonies[i].startBeat + sortedHarmonies[i].duration;
        const nextStart = sortedHarmonies[i + 1].startBeat;
        const availableSpace = nextStart - currentEnd;

        if (availableSpace >= 1) {
          startBeat = currentEnd;
          duration = Math.min(availableSpace, 2);
          placed = true;
          break;
        }
      }

      // 如果没有找到空隙，尝试在最后放置
      if (!placed && sortedHarmonies.length > 0) {
        const lastHarmony = sortedHarmonies[sortedHarmonies.length - 1];
        const lastEnd = lastHarmony.startBeat + lastHarmony.duration;
        const availableSpace = measureEndBeat - lastEnd;

        if (availableSpace >= 1) {
          startBeat = lastEnd;
          duration = Math.min(availableSpace, 2);
        } else {
          // 没有足够空间，不应该到达这里（canAddHarmonyAt应该已经检查过）
          console.warn("No space available for new harmony");
          return;
        }
      }
    }
  }

  if (duration <= 0) {
    console.warn("没有足够空间添加和声");
    return;
  }

  // 获取当前片段的调性信息
  const segmentKey = props.segment.key || "C";
  const segmentMode = props.segment.mode || "major";

  // 根据片段调性生成默认和弦名称
  const defaultChordName =
    generateChordName("I", "", "major", segmentKey) || "C";

  const newHarmony: Omit<HarmonySegment, "id"> = {
    startBeat,
    duration,
    chord: defaultChordName,
    rootDegree: "I",
    accidental: "",
    chordType: "major",
    suspensionType: "",
    color: "#409EFF",
  };

  console.log("新和声数据:", newHarmony);

  // 使用store的方法添加和声
  const harmonyId = store.addHarmony(props.segment.id, newHarmony);

  // 发出更新事件
  const updatedSegment = store.segments.find((s) => s.id === props.segment.id);
  if (updatedSegment) {
    emit("update-segment", updatedSegment);
  }

  console.log("和声添加完成，ID:", harmonyId);
};

// 编辑和声片段
const editHarmony = (harmony: HarmonySegment) => {
  console.log("编辑和声:", harmony);
  store.selectHarmony(harmony.id);
  emit("edit-harmony", harmony);
};

// 拖拽和调整大小处理方法
const dragCandidateHarmonyId = ref<string | null>(null);
const draggingInitiated = ref(false);
const DRAG_START_THRESHOLD_PX = 4;
const dragPreviewPosition = ref<{ startBeat: number; isValid: boolean } | null>(
  null
);

const startDrag = (event: MouseEvent, harmony: HarmonySegment) => {
  // 双击仅用于编辑，不触发拖拽
  if (event.detail && event.detail > 1) {
    return;
  }
  isDragging.value = false;
  draggedHarmonyId.value = null;
  draggingInitiated.value = false;
  dragCandidateHarmonyId.value = harmony.id;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  dragStartBeat.value = harmony.startBeat;
  dragPreviewPosition.value = null;

  // 获取行高用于计算垂直跨行
  const rowEl = document.querySelector(".row-container") as HTMLElement | null;
  rowHeightPx.value = rowEl?.offsetHeight || 120;

  document.addEventListener("mousemove", handleDrag);
  document.addEventListener("mouseup", endDrag);
};

const handleDrag = (event: MouseEvent) => {
  if (!dragCandidateHarmonyId.value) return;

  const deltaX = event.clientX - dragStartX.value;
  const deltaBeatX = deltaX / store.pxPerBeat;

  // 只有超过阈值后才认为进入拖拽状态，避免轻微抖动及双击触发动画
  if (!draggingInitiated.value) {
    if (Math.abs(deltaX) < DRAG_START_THRESHOLD_PX) return;
    draggingInitiated.value = true;
    isDragging.value = true;
    draggedHarmonyId.value = dragCandidateHarmonyId.value;
  }

  // 计算垂直方向跨行带来的拍子偏移
  const deltaY = event.clientY - dragStartY.value;
  const deltaRows =
    rowHeightPx.value > 0 ? Math.round(deltaY / rowHeightPx.value) : 0;
  const deltaBeatY = deltaRows * beatsPerRow.value;

  const newStartBeat = Math.max(
    0,
    dragStartBeat.value + deltaBeatX + deltaBeatY
  );

  // 量化到最近的细分
  const quantizedBeat = quantizeBeat(newStartBeat);

  // 获取当前拖拽的和声信息
  const currentHarmony = props.segment.harmonies.find(
    (h) => h.id === draggedHarmonyId.value
  );
  if (!currentHarmony) return;

  // 检查新位置是否会造成重叠
  const wouldOverlap = store.checkHarmonyOverlap(
    props.segment.id,
    quantizedBeat,
    currentHarmony.duration,
    draggedHarmonyId.value || undefined
  );

  // 更新预览位置状态
  dragPreviewPosition.value = {
    startBeat: quantizedBeat,
    isValid: !wouldOverlap,
  };

  // 只有在不会重叠的情况下才实际更新位置
  if (!wouldOverlap && draggedHarmonyId.value) {
    store.updateHarmony(draggedHarmonyId.value, { startBeat: quantizedBeat });
  }
};

const endDrag = () => {
  isDragging.value = false;
  draggedHarmonyId.value = null;
  dragCandidateHarmonyId.value = null;
  draggingInitiated.value = false;
  dragPreviewPosition.value = null;

  document.removeEventListener("mousemove", handleDrag);
  document.removeEventListener("mouseup", endDrag);
};

const startResize = (event: MouseEvent, harmony: HarmonySegment) => {
  isResizing.value = true;
  resizedHarmonyId.value = harmony.id;
  resizeStartX.value = event.clientX;
  resizeStartDuration.value = harmony.duration;

  document.addEventListener("mousemove", handleResize);
  document.addEventListener("mouseup", endResize);
};

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value || !resizedHarmonyId.value) return;

  const deltaX = event.clientX - resizeStartX.value;
  const deltaBeat = deltaX / store.pxPerBeat;

  const minStep = 1 / getSubdivisionsPerBeat();
  const unclamped = resizeStartDuration.value + deltaBeat;
  const quantizedDuration = quantizeBeat(unclamped);
  const finalDuration = Math.max(minStep, quantizedDuration);

  // 获取当前调整大小的和声信息
  const currentHarmony = props.segment.harmonies.find(
    (h) => h.id === resizedHarmonyId.value
  );
  if (!currentHarmony) return;

  // 检查新的持续时间是否会造成重叠
  const wouldOverlap = store.checkHarmonyOverlap(
    props.segment.id,
    currentHarmony.startBeat,
    finalDuration,
    resizedHarmonyId.value
  );

  // 如果会重叠，计算允许的最大持续时间
  if (wouldOverlap) {
    const beatsPerMeasure =
      props.segment.timeSignature?.numerator || store.timeSignature.numerator;
    const segmentTotalBeats = props.segment.measures * beatsPerMeasure;

    // 找到右侧最近的和声块
    const rightNeighbor = props.segment.harmonies
      .filter(
        (h) =>
          h.id !== resizedHarmonyId.value &&
          h.startBeat > currentHarmony.startBeat
      )
      .sort((a, b) => a.startBeat - b.startBeat)[0];

    const maxEndBeat = rightNeighbor
      ? rightNeighbor.startBeat
      : segmentTotalBeats;
    const maxDuration = maxEndBeat - currentHarmony.startBeat;
    const clampedDuration = Math.max(
      minStep,
      Math.min(finalDuration, maxDuration)
    );

    store.updateHarmony(resizedHarmonyId.value, { duration: clampedDuration });
  } else {
    // 只有在不会重叠的情况下才实际更新持续时间
    store.updateHarmony(resizedHarmonyId.value, { duration: finalDuration });
  }
};

const endResize = () => {
  isResizing.value = false;
  resizedHarmonyId.value = null;

  document.removeEventListener("mousemove", handleResize);
  document.removeEventListener("mouseup", endResize);
};

const quantizeBeat = (beat: number) => {
  const subdivisionsPerBeat = getSubdivisionsPerBeat();
  const subdivision = 1 / subdivisionsPerBeat;
  return Math.round(beat / subdivision) * subdivision;
};

const formatDuration = (duration: number) => {
  return `${duration.toFixed(2)} 拍`;
};
</script>

<style scoped>
.harmony-editor {
  width: 100%;
  max-width: 100%;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  box-sizing: border-box;
}

.harmony-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  width: 100%;
  box-sizing: border-box;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.measure-row {
  width: 100%;
  margin-bottom: 12px;
}

.measure-row:last-child {
  margin-bottom: 0;
}

.row-container {
  display: flex;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative; /* 为行级游标定位 */
}

.row-playback-cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #ff4d4f, #ff7875);
  z-index: 15;
  pointer-events: none;
  box-shadow: 0 0 6px rgba(255, 77, 79, 0.6);
  border-radius: 1px;
}

.measure-container {
  flex: 1;
  position: relative;
  border-right: 1px solid #e4e7ed;
  min-width: 0;
}

.measure-container:last-child {
  border-right: none;
}

.measure-container.measure-first {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.measure-container.measure-last {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.measure-number {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(144, 147, 153, 0.1);
  color: #909399;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 5;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.measure-content {
  position: relative;
  height: 90px;
  padding: 12px;
  padding-top: 30px; /* 为小节数字留出空间 */
  padding-bottom: 0px;
}

.beat-grid {
  display: flex;
  height: 20px;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 8px;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.beat-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #c0c4cc;
  border-right: 1px solid #f0f0f0;
  transition: all 0.2s ease;
  position: relative;
}

.beat-cell:last-child {
  border-right: none;
}

.beat-strong {
  font-weight: bold;
  color: #909399;
  background: linear-gradient(to bottom, #fafafa, #f5f5f5);
  border-left: 2px solid #d9d9d9;
}

.beat-subdivision {
  background: #fafafa;
  border-left: 1px dotted #e0e0e0;
}

.beat-current {
  background: #e6f7ff;
  color: #1890ff;
  font-weight: 600;
  box-shadow: inset 0 0 0 2px #1890ff;
}

.playback-cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ff4d4f;
  z-index: 10;
  pointer-events: none;
  box-shadow: 0 0 4px rgba(255, 77, 79, 0.5);
}

.harmony-layer {
  position: relative;
  height: 50px;
}

.harmony-segment {
  position: absolute;
  height: 50px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  min-width: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.harmony-segment:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border-color: #409eff;
}

.harmony-chord {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  line-height: 1.2;
}

.chord-degree {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
  opacity: 0.95;
  font-family: "Times New Roman", "Georgia", "DejaVu Serif", serif;
  /* 确保音乐符号正确显示 */
  font-feature-settings: "liga" 1, "kern" 1;
  text-rendering: optimizeLegibility;
  /* 支持上标显示 */
  position: relative;
}

.chord-degree sup {
  font-size: 10px;
  vertical-align: super;
  line-height: 0;
}

.chord-name {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.9;
  font-family: "Times New Roman", "Georgia", "DejaVu Serif", serif;
  /* 确保音乐符号正确显示 */
  font-feature-settings: "liga" 1, "kern" 1;
  text-rendering: optimizeLegibility;
  /* 防止音乐符号被截断 */
  line-height: 1.4;
  /* 支持上标显示 */
  position: relative;
}

.chord-name sup {
  font-size: 10px;
  vertical-align: super;
  line-height: 0;
}

.add-harmony-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.add-harmony-btn:hover {
  background: #79bbff;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.add-harmony-btn .el-icon {
  font-size: 14px;
}

/* 拖拽和调整大小样式 */
.harmony-segment.dragging {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  animation: float 0.6s ease-in-out infinite alternate;
}

.harmony-segment.editing {
  border: 2px solid #409eff !important;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
  animation: float-editing 2s ease-in-out infinite;
  z-index: 10;
}

@keyframes float-editing {
  0%,
  100% {
    transform: translateY(0px);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
  }
  50% {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(64, 158, 255, 0.6);
  }
}

.harmony-segment.drag-invalid {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  animation: shake 0.3s ease-in-out infinite;
}

.harmony-segment.resizing {
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

@keyframes float {
  0% {
    transform: translateY(-4px);
  }
  100% {
    transform: translateY(-6px);
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0) translateY(-4px);
  }
  25% {
    transform: translateX(-2px) translateY(-4px);
  }
  75% {
    transform: translateX(2px) translateY(-4px);
  }
}

/* 拖拽把手样式 */
.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.resize-handle::after {
  content: "";
  width: 3px;
  height: 20px;
  background: white;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.harmony-segment:hover .resize-handle {
  opacity: 1;
}

.duration-tooltip {
  position: absolute;
  top: -30px;
  right: 0;
  background: #303133;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 100;
}

.duration-tooltip::after {
  content: "";
  position: absolute;
  top: 100%;
  right: 8px;
  border: 4px solid transparent;
  border-top-color: #303133;
}
</style>