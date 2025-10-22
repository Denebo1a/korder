// 拍号类型
export interface TimeSignature {
  numerator: number;   // 分子（每小节拍数）
  denominator: number; // 分母（拍的时值）
}

// 和声片段 - 简化的数据结构
export interface HarmonySegment {
  id: string;             // 唯一标识符
  startBeat: number;      // 起始拍数（从0开始）
  duration: number;       // 持续拍数
  chord: string;          // 和弦名称（如 "C", "Am", "F7"）
  rootDegree?: string;    // 根音级数（I, II, III, IV, V, VI, VII）
  accidental?: string;    // 升降号（'#', 'b', ''）
  chordType: string;      // 和弦类型（major, minor, dominant7等）- 现在为必填
  suspensionType?: string; // 挂留类型（sus2, sus4, ''）
  bassDegree?: string;    // 低音级数（I, II, III, IV, V, VI, VII）
  bassAccidental?: string; // 低音升降号（'#', 'b', ''）
  extensions?: string[];  // 扩展音（如 "9", "11", "13"）
  omissions?: string[];   // 省略音（如 "3", "5"）
  color?: string;         // 显示颜色
}

// 项目片段 - 核心数据结构
export interface ProjectSegment {
  id: string;             // 唯一标识符
  name: string;           // 片段名称
  measures: number;       // 小节数
  isExpanded: boolean;    // 是否展开显示和声编辑器
  harmonies: HarmonySegment[]; // 和声片段列表
  key: string;            // 片段调性主音（如 "C", "D", "E"等）
  mode: string;           // 片段调式（目前仅支持 "major"）
  timeSignature?: TimeSignature; // 片段拍号（可选，不设置则使用全局拍号）
}

// 和声轨道（保留用于兼容性）
export interface HarmonyTrack {
  name: string;
  segments: HarmonySegment[];
}

// 项目文件格式
export interface ProgressionFile {
  version: string;
  title: string;
  bpm: number;
  timeSignature: TimeSignature;
  startOffsetSec: number;
  beatOffset?: number; // 初始强拍偏移量（秒）
  segments: ProjectSegment[];
  // 保留tracks用于向后兼容
  tracks?: HarmonyTrack[];
}

// 播放器状态
export interface PlayerState {
  audioFile: File | null;
  bpm: number;
  isPlaying: boolean;
  currentSec: number;
  
  // 片段管理
  segments: ProjectSegment[];
  selectedSegmentId: string | null;
  selectedHarmonyId: string | null; // 改为使用ID而不是索引
  
  // 项目信息
  title: string;
  timeSignature: TimeSignature;
  
  // 音频信息
  audioDuration: number;
  hasAudio: boolean;
  volume: number;
  beatOffset: number; // 初始强拍偏移量（秒）
  
  // 显示设置
  showWaveform: boolean;
  measuresPerRow: number; // 每行显示的小节数
  quantization: QuantizationType; // 全局量化级别
}

// 和声编辑器的网格数据
export interface HarmonyGridCell {
  measureIndex: number;
  beatIndex: number;
  isEmpty: boolean;
  harmony?: HarmonySegment;
}

// 量化选项
export type QuantizationType = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

// 和声编辑事件
export interface HarmonyEditEvent {
  type: 'add' | 'edit' | 'delete';
  segmentId: string;
  harmonyId?: string;
  position?: {
    measureIndex: number;
    beatIndex: number;
  };
  harmony?: Partial<HarmonySegment>;
}