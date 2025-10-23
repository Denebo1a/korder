import { defineStore } from 'pinia';
import type { HarmonySegment, ProgressionFile, PlayerState, TimeSignature, ProjectSegment } from '../types/progression';

export const usePlayerStore = defineStore('player', {
  state: (): PlayerState => ({
    // 播放状态
    audioFile: null,
    bpm: 120,
    isPlaying: false,
    currentSec: 0,
    
    // 项目片段数据
    segments: [],
    selectedSegmentId: null,
    selectedHarmonyId: null, // 使用ID而不是索引
    
    // 项目信息
    title: '新建项目',
    timeSignature: { numerator: 4, denominator: 4 },
    
    // 音频相关
    audioDuration: 0,
    hasAudio: false,
    volume: 0.8,
    beatOffset: 0, // 初始强拍偏移量（秒）
    
    // 显示设置
    measuresPerRow: 4, // 每行显示的小节数
    quantization: 'quarter' as const, // 默认四分音符量化
  }),

  getters: {
    currentBeat(): number {
      return (this.currentSec / 60) * this.bpm;
    },
    
    // 基于初始强拍偏移量的当前拍子
    adjustedCurrentBeat(): number {
      const adjustedTime = Math.max(0, this.currentSec - this.beatOffset);
      return (adjustedTime / 60) * this.bpm;
    },
    
    selectedSegment(): ProjectSegment | null {
      return this.selectedSegmentId ? 
        this.segments.find(s => s.id === this.selectedSegmentId) || null : null;
    },
    
    selectedHarmony(): HarmonySegment | null {
      if (!this.selectedHarmonyId) return null;
      
      for (const segment of this.segments) {
        const harmony = segment.harmonies.find(h => h.id === this.selectedHarmonyId);
        if (harmony) return harmony;
      }
      return null;
    },
    
    totalBeats(): number {
      return this.segments.reduce((total, segment) => 
        total + segment.measures * this.timeSignature.numerator, 0) || 32;
    },
    
    totalMeasures(): number {
      return this.segments.reduce((total, segment) => total + segment.measures, 0);
    },
    
    // 计算每拍的像素宽度（基于每行显示的小节数）
    pxPerBeat(): number {
      const containerWidth = 800; // 假设容器宽度
      const beatsPerRow = this.measuresPerRow * this.timeSignature.numerator;
      return containerWidth / beatsPerRow;
    }
  },

  actions: {
    // 播放控制
    setPlaying(playing: boolean) {
      this.isPlaying = playing;
    },

    setCurrentTime(seconds: number) {
      this.currentSec = seconds;
    },

    setBpm(bpm: number) {
      this.bpm = bpm;
    },

    // 片段管理
    addSegment(segment: ProjectSegment, index?: number) {
      if (index !== undefined) {
        this.segments.splice(index, 0, segment);
      } else {
        this.segments.push(segment);
      }
    },

    updateSegment(updatedSegment: ProjectSegment) {
      const index = this.segments.findIndex(s => s.id === updatedSegment.id);
      if (index !== -1) {
        this.segments[index] = updatedSegment;
      }
    },

    removeSegment(segmentId: string) {
      const index = this.segments.findIndex(s => s.id === segmentId);
      if (index !== -1) {
        const removedSegment = this.segments[index];
        this.segments.splice(index, 1);
        
        // 清除选中状态
        if (removedSegment && this.selectedSegmentId === removedSegment.id) {
          this.selectedSegmentId = null;
          this.selectedHarmonyId = null;
        }
      }
    },

    // 选择管理
    selectSegment(segmentId: string | null) {
      this.selectedSegmentId = segmentId;
      this.selectedHarmonyId = null; // 切换片段时清除和声选择
    },

    selectHarmony(harmonyId: string | null) {
      this.selectedHarmonyId = harmonyId;
    },

    // 和声管理 - 简化的API
    addHarmony(segmentId: string, harmony: Omit<HarmonySegment, 'id'>) {
      const segment = this.segments.find(s => s.id === segmentId);
      if (!segment) return;

      const newHarmony: HarmonySegment = {
        ...harmony,
        id: `harmony_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const updatedSegment = {
        ...segment,
        harmonies: [...segment.harmonies, newHarmony].sort((a, b) => a.startBeat - b.startBeat)
      };

      this.updateSegment(updatedSegment);
      return newHarmony.id;
    },

    updateHarmony(harmonyId: string, updates: Partial<HarmonySegment>) {
      for (const segment of this.segments) {
        const harmonyIndex = segment.harmonies.findIndex(h => h.id === harmonyId);
        if (harmonyIndex !== -1) {
          const currentHarmony = segment.harmonies[harmonyIndex];
          if (!currentHarmony) continue;

          const beatsPerMeasure = segment.timeSignature?.numerator ?? this.timeSignature.numerator;
          const segmentTotalBeats = segment.measures * beatsPerMeasure;

          // 拟更新值
          let newStart = updates.startBeat ?? currentHarmony.startBeat;
          let newDuration = updates.duration ?? currentHarmony.duration;

          // 确保最小持续时间（至少1/16拍）
          const minDuration = 0.0625;
          newDuration = Math.max(minDuration, newDuration);

          // 获取其他和声块，按起始拍排序
          const others = segment.harmonies
            .filter(h => h.id !== harmonyId)
            .sort((a, b) => a.startBeat - b.startBeat);

          // 严格的重叠检测：找到可用的空间区间
          const availableSpaces = this.findAvailableSpaces(others, segmentTotalBeats);
          
          // 寻找最适合的空间区间
          const targetSpace = this.findBestFitSpace(availableSpaces, newStart, newDuration);
          
          if (!targetSpace) {
            // 没有合适的空间，尝试在当前位置附近寻找
            const nearestSpace = this.findNearestSpace(availableSpaces, newStart, newDuration);
            if (nearestSpace) {
              newStart = nearestSpace.start;
              newDuration = Math.min(newDuration, nearestSpace.end - nearestSpace.start);
            } else {
              // 完全没有空间，拒绝更新
              console.warn(`无法更新和声 ${harmonyId}：没有足够的空间`);
              break;
            }
          } else {
            // 在找到的空间内调整位置和持续时间
            newStart = Math.max(targetSpace.start, Math.min(newStart, targetSpace.end - newDuration));
            newDuration = Math.min(newDuration, targetSpace.end - newStart);
          }

          // 确保不超出片段边界
          newStart = Math.max(0, Math.min(newStart, segmentTotalBeats - minDuration));
          newDuration = Math.min(newDuration, segmentTotalBeats - newStart);

          const updatedHarmonies = [...segment.harmonies];
          updatedHarmonies[harmonyIndex] = {
            ...currentHarmony,
            ...updates,
            startBeat: newStart,
            duration: newDuration,
            id: currentHarmony.id // 确保ID不被覆盖
          };

          const updatedSegment = {
            ...segment,
            harmonies: updatedHarmonies.sort((a, b) => a.startBeat - b.startBeat)
          };

          this.updateSegment(updatedSegment);
          break;
        }
      }
    },

    // 辅助方法：查找所有可用的空间区间
    findAvailableSpaces(harmonies: HarmonySegment[], totalBeats: number): Array<{start: number, end: number}> {
      const spaces: Array<{start: number, end: number}> = [];
      const sortedHarmonies = [...harmonies].sort((a, b) => a.startBeat - b.startBeat);

      // 检查开头的空间
      if (sortedHarmonies.length === 0 || sortedHarmonies[0].startBeat > 0) {
        spaces.push({
          start: 0,
          end: sortedHarmonies.length > 0 ? sortedHarmonies[0].startBeat : totalBeats
        });
      }

      // 检查中间的空隙
      for (let i = 0; i < sortedHarmonies.length - 1; i++) {
        const current = sortedHarmonies[i];
        const next = sortedHarmonies[i + 1];
        const gapStart = current.startBeat + current.duration;
        const gapEnd = next.startBeat;

        if (gapEnd > gapStart) {
          spaces.push({ start: gapStart, end: gapEnd });
        }
      }

      // 检查结尾的空间
      if (sortedHarmonies.length > 0) {
        const lastHarmony = sortedHarmonies[sortedHarmonies.length - 1];
        const endSpace = lastHarmony.startBeat + lastHarmony.duration;
        if (endSpace < totalBeats) {
          spaces.push({ start: endSpace, end: totalBeats });
        }
      }

      return spaces;
    },

    // 辅助方法：找到最适合的空间区间
    findBestFitSpace(
      spaces: Array<{start: number, end: number}>, 
      targetStart: number, 
      targetDuration: number
    ): {start: number, end: number} | null {
      for (const space of spaces) {
        // 检查空间是否足够大
        if (space.end - space.start >= targetDuration) {
          // 检查目标起始位置是否在这个空间内
          if (targetStart >= space.start && targetStart + targetDuration <= space.end) {
            return space;
          }
        }
      }
      return null;
    },

    // 辅助方法：找到最近的可用空间
    findNearestSpace(
      spaces: Array<{start: number, end: number}>, 
      targetStart: number, 
      targetDuration: number
    ): {start: number, end: number} | null {
      let nearestSpace: {start: number, end: number} | null = null;
      let minDistance = Infinity;

      for (const space of spaces) {
        if (space.end - space.start >= targetDuration) {
          // 计算到目标位置的距离
          let distance: number;
          if (targetStart < space.start) {
            distance = space.start - targetStart;
          } else if (targetStart > space.end - targetDuration) {
            distance = targetStart - (space.end - targetDuration);
          } else {
            distance = 0; // 目标位置在空间内
          }

          if (distance < minDistance) {
            minDistance = distance;
            nearestSpace = space;
          }
        }
      }

      return nearestSpace;
    },

    // 检查和声是否会与其他和声重叠
    checkHarmonyOverlap(
      segmentId: string, 
      startBeat: number, 
      duration: number, 
      excludeHarmonyId?: string
    ): boolean {
      const segment = this.segments.find(s => s.id === segmentId);
      if (!segment) return false;

      const endBeat = startBeat + duration;
      
      return segment.harmonies.some(harmony => {
        if (excludeHarmonyId && harmony.id === excludeHarmonyId) return false;
        
        const harmonyEnd = harmony.startBeat + harmony.duration;
        
        // 检查是否有重叠：两个区间重叠的条件是 start1 < end2 && start2 < end1
        return startBeat < harmonyEnd && harmony.startBeat < endBeat;
      });
    },

    removeHarmony(harmonyId: string) {
      for (const segment of this.segments) {
        const harmonyIndex = segment.harmonies.findIndex(h => h.id === harmonyId);
        if (harmonyIndex !== -1) {
          const updatedHarmonies = segment.harmonies.filter(h => h.id !== harmonyId);
          
          const updatedSegment = {
            ...segment,
            harmonies: updatedHarmonies
          };
          
          this.updateSegment(updatedSegment);
          
          // 清除选中状态
          if (this.selectedHarmonyId === harmonyId) {
            this.selectedHarmonyId = null;
          }
          break;
        }
      }
    },

    // 和声位置验证和计算
    canAddHarmonyAt(segmentId: string, measureIndex: number, beatIndex: number = 0): boolean {
      const segment = this.segments.find(s => s.id === segmentId);
      if (!segment || measureIndex >= segment.measures) return false;

      const targetBeat = measureIndex * this.timeSignature.numerator + beatIndex;
      
      // 检查是否与现有和声冲突
      return !segment.harmonies.some(harmony => {
        const harmonyStart = harmony.startBeat;
        const harmonyEnd = harmony.startBeat + harmony.duration;
        return targetBeat >= harmonyStart && targetBeat < harmonyEnd;
      });
    },

    getNextAvailableBeat(segmentId: string, measureIndex: number): number {
      const segment = this.segments.find(s => s.id === segmentId);
      if (!segment) return measureIndex * this.timeSignature.numerator;

      const measureStart = measureIndex * this.timeSignature.numerator;
      const measureEnd = (measureIndex + 1) * this.timeSignature.numerator;
      
      // 找到该小节内的所有和声
      const measureHarmonies = segment.harmonies
        .filter(h => h.startBeat >= measureStart && h.startBeat < measureEnd)
        .sort((a, b) => a.startBeat - b.startBeat);

      if (measureHarmonies.length === 0) {
        return measureStart;
      }

      // 找到最后一个和声的结束位置
      const lastHarmony = measureHarmonies[measureHarmonies.length - 1];
      if (lastHarmony) {
        return Math.min(lastHarmony.startBeat + lastHarmony.duration, measureEnd);
      }
      return measureStart;
    },

    // 音频和显示设置
    setAudioInfo(duration: number, hasAudio: boolean) {
      this.audioDuration = duration;
      this.hasAudio = hasAudio;
    },

    setVolume(volume: number) {
      this.volume = Math.max(0, Math.min(1, volume));
    },

    setMeasuresPerRow(measures: number) {
      this.measuresPerRow = Math.max(1, measures);
    },

    setBeatOffset(offset: number) {
      this.beatOffset = Math.max(0, Math.min(this.audioDuration, offset));
    },

    setProjectInfo(title: string, timeSignature: TimeSignature) {
      this.title = title;
      this.timeSignature = timeSignature;
    },

    setQuantization(quantization: 'quarter' | 'eighth' | 'sixteenth') {
      this.quantization = quantization;
    },

    // 项目文件操作
    exportProject(): ProgressionFile {
      return {
        version: '2.0',
        title: this.title,
        bpm: this.bpm,
        timeSignature: this.timeSignature,
        startOffsetSec: 0,
        beatOffset: this.beatOffset, // 保存初始强拍偏移量
        segments: this.segments
      };
    },

    loadProject(project: ProgressionFile) {
      this.title = project.title;
      this.bpm = project.bpm;
      this.timeSignature = project.timeSignature;
      this.beatOffset = project.beatOffset || 0; // 加载初始强拍偏移量
      
      // 处理新格式的segments
      if (project.segments) {
        // 为旧项目的片段添加默认调性设置
        this.segments = project.segments.map(segment => ({
          ...segment,
          key: segment.key || 'C',
          mode: segment.mode || 'major'
        }));
      } 
      // 兼容旧格式的tracks
      else if (project.tracks) {
        this.segments = project.tracks.map((track, index) => ({
          id: `segment_${index}`,
          name: track.name,
          measures: 4,
          isExpanded: false,
          harmonies: track.segments,
          key: 'C',
          mode: 'major'
        }));
      }
      
      // 清除选中状态
      this.selectedSegmentId = null;
      this.selectedHarmonyId = null;
    },

    createDefaultSegment(): ProjectSegment {
      return {
        id: `segment_${Date.now()}`,
        name: `片段 ${this.segments.length + 1}`,
        measures: 4,
        isExpanded: false,
        harmonies: [],
        key: 'C',
        mode: 'major',
        color: '#409EFF'
      };
    },

    reset() {
      this.bpm = 120;
      this.isPlaying = false;
      this.currentSec = 0;
      this.segments = [];
      this.selectedSegmentId = null;
      this.selectedHarmonyId = null;
      this.title = '新建项目';
      this.timeSignature = { numerator: 4, denominator: 4 };
      this.audioDuration = 0;
      this.hasAudio = false;
      this.volume = 0.8;
      this.beatOffset = 0; // 重置初始强拍偏移量
      this.measuresPerRow = 4;
    }
  }
});