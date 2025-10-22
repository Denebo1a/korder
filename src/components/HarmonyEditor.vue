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
            v-show="(rowIndex - 1) * 4 + colIndex <= segment.measures"
            class="measure-container"
            :class="{
              'measure-first': colIndex === 1,
              'measure-last':
                colIndex === 4 ||
                (rowIndex - 1) * 4 + colIndex === segment.measures,
            }"
          >
            <!-- 小节数字标记 -->
            <div class="measure-number">
              {{ (rowIndex - 1) * 4 + colIndex }}
            </div>

            <!-- 小节内容 -->
            <div class="measure-content">
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

                  <!-- 右边缘拖拽手柄 -->
                  <div
                    class="resize-handle"
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
import { ElRadioGroup, ElRadioButton, ElIcon } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { usePlayerStore } from "../stores/player";
import type { ProjectSegment, HarmonySegment } from "../types/progression";

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

// 计算属性
const beatsPerMeasure = computed(() => {
  // 优先使用片段的拍号，如果没有则使用全局拍号
  return (
    props.segment.timeSignature?.numerator || store.timeSignature.numerator
  );
});

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

// 检查是否是当前播放的拍子
const isCurrentBeat = (measureIndex: number, beatIndex: number) => {
  if (!store.isPlaying || currentBeatInSegment.value < 0) return false;

  const absoluteBeat = measureIndex * beatsPerMeasure.value + beatIndex;
  const currentBeat = Math.floor(currentBeatInSegment.value);

  return currentBeat === absoluteBeat;
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

// 根据根音级数、升降号和和弦类型生成和弦名称（基于片段调性）
const generateChordName = (
  rootDegree?: string,
  accidental?: string,
  chordType?: string,
  segmentKey?: string
) => {
  if (!rootDegree || !chordType || !segmentKey) return "";

  // 各调的音阶映射
  const keyScales: Record<string, string[]> = {
    C: ["C", "D", "E", "F", "G", "A", "B"],
    "C#": ["C#", "D#", "E#", "F#", "G#", "A#", "B#"],
    Db: ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"],
    D: ["D", "E", "F#", "G", "A", "B", "C#"],
    "D#": ["D#", "E#", "F##", "G#", "A#", "B#", "C##"],
    Eb: ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
    E: ["E", "F#", "G#", "A", "B", "C#", "D#"],
    F: ["F", "G", "A", "Bb", "C", "D", "E"],
    "F#": ["F#", "G#", "A#", "B", "C#", "D#", "E#"],
    Gb: ["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"],
    G: ["G", "A", "B", "C", "D", "E", "F#"],
    "G#": ["G#", "A#", "B#", "C#", "D#", "E#", "F##"],
    Ab: ["Ab", "Bb", "C", "Db", "Eb", "F", "G"],
    A: ["A", "B", "C#", "D", "E", "F#", "G#"],
    "A#": ["A#", "B#", "C##", "D#", "E#", "F##", "G##"],
    Bb: ["Bb", "C", "D", "Eb", "F", "G", "A"],
    B: ["B", "C#", "D#", "E", "F#", "G#", "A#"],
  };

  // 级数到索引的映射
  const degreeToIndex: Record<string, number> = {
    I: 0,
    II: 1,
    III: 2,
    IV: 3,
    V: 4,
    VI: 5,
    VII: 6,
  };

  // 和弦类型到后缀的映射
  const chordTypeSuffix: Record<string, string> = {
    major: "",
    minor: "m",
    augmented: "aug",
    dominant7: "7",
    major7: "Maj7",
    minor7: "m7",
    half_diminished7: "m7♭5",
    diminished7: "dim7",
  };

  const scale = keyScales[segmentKey] || keyScales["C"];
  const degreeIndex = degreeToIndex[rootDegree] || 0;
  let rootNote = scale[degreeIndex] || "C";

  // 应用升降号 - 使用Unicode音乐符号
  if (accidental === "#") {
    // 使用Unicode升号符号 ♯ (U+266F)
    const sharpMap: Record<string, string> = {
      C: "C♯",
      D: "D♯",
      E: "F",
      F: "F♯",
      G: "G♯",
      A: "A♯",
      B: "C",
    };
    rootNote =
      sharpMap[rootNote.charAt(0)] + rootNote.slice(1).replace(/[#b♯♭]/g, "") ||
      rootNote;
  } else if (accidental === "b") {
    // 使用Unicode降号符号 ♭ (U+266D)
    const flatMap: Record<string, string> = {
      C: "B",
      D: "D♭",
      E: "E♭",
      F: "E",
      G: "G♭",
      A: "A♭",
      B: "B♭",
    };
    rootNote =
      flatMap[rootNote.charAt(0)] + rootNote.slice(1).replace(/[#b♯♭]/g, "") ||
      rootNote;
  }

  const suffix = chordTypeSuffix[chordType] || "";
  return rootNote + suffix;
};
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

// 检查是否可以在指定小节添加和声
const canAddHarmonyAt = (measureIndex: number) => {
  if (measureIndex >= props.segment.measures) return false;

  const measureStart = measureIndex * beatsPerMeasure.value;
  const measureEnd = (measureIndex + 1) * beatsPerMeasure.value;

  // 检查该小节是否有空间
  const measureHarmonies = getMeasureHarmonies(measureIndex);

  if (measureHarmonies.length === 0) {
    return true; // 空小节可以添加
  }

  // 检查是否有空隙
  const sortedHarmonies = measureHarmonies
    .map((h) => ({
      start: Math.max(h.startBeat, measureStart),
      end: Math.min(h.startBeat + h.duration, measureEnd),
    }))
    .sort((a, b) => a.start - b.start);

  // 检查开头是否有空间
  if (
    sortedHarmonies.length > 0 &&
    sortedHarmonies[0] &&
    sortedHarmonies[0].start > measureStart
  ) {
    return true;
  }

  // 检查中间是否有空隙
  for (let i = 0; i < sortedHarmonies.length - 1; i++) {
    const current = sortedHarmonies[i];
    const next = sortedHarmonies[i + 1];
    if (current && next && current.end < next.start) {
      return true;
    }
  }

  // 检查结尾是否有空间
  const lastHarmony = sortedHarmonies[sortedHarmonies.length - 1];
  return lastHarmony ? lastHarmony.end < measureEnd : true;
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

  const startBeat = store.getNextAvailableBeat(props.segment.id, measureIndex);
  const measureEnd = (measureIndex + 1) * beatsPerMeasure.value;
  const maxDuration = measureEnd - startBeat;
  const duration = Math.min(1, maxDuration); // 默认1拍，但不超过可用空间

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
const startDrag = (event: MouseEvent, harmony: HarmonySegment) => {
  isDragging.value = true;
  draggedHarmonyId.value = harmony.id;
  dragStartX.value = event.clientX;
  dragStartBeat.value = harmony.startBeat;

  document.addEventListener("mousemove", handleDrag);
  document.addEventListener("mouseup", endDrag);
};

const handleDrag = (event: MouseEvent) => {
  if (!isDragging.value || !draggedHarmonyId.value) return;

  const deltaX = event.clientX - dragStartX.value;
  const deltaBeat = deltaX / store.pxPerBeat;
  const newStartBeat = Math.max(0, dragStartBeat.value + deltaBeat);

  // 量化到最近的细分
  const quantizedBeat = quantizeBeat(newStartBeat);

  store.updateHarmony(draggedHarmonyId.value, { startBeat: quantizedBeat });
};

const endDrag = () => {
  isDragging.value = false;
  draggedHarmonyId.value = null;

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
  const newDuration = Math.max(0.25, resizeStartDuration.value + deltaBeat);

  // 量化到最近的细分
  const quantizedDuration = quantizeBeat(newDuration);

  store.updateHarmony(resizedHarmonyId.value, { duration: quantizedDuration });
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
  height: 100px;
  padding: 12px;
  padding-top: 30px; /* 为小节数字留出空间 */
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
  height: 60px;
}

.harmony-segment {
  position: absolute;
  height: 60px;
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
  top: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #67c23a;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.add-harmony-btn:hover {
  background: #85ce61;
  transform: scale(1.1);
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

.resize-handle {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 8px;
  background: rgba(255, 255, 255, 0.1);
  cursor: ew-resize;
  border-radius: 0 4px 4px 0;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-handle:hover {
  background: rgba(24, 144, 255, 0.2);
  border-color: rgba(24, 144, 255, 0.4);
  transform: scaleX(1.2);
}

.resize-indicator {
  display: flex;
  flex-direction: column;
  gap: 1px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.resize-handle:hover .resize-indicator {
  opacity: 1;
}

.resize-grip {
  width: 2px;
  height: 2px;
  background: currentColor;
  border-radius: 50%;
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