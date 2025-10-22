# 和弦进行播放器 (Chord Player) - 完整开发文档

## 项目概述
一个基于 Vue 3 + TypeScript 的现代化和弦进行编辑器，支持音频同步播放、可视化编辑和项目管理。

## 技术栈

### 核心框架
- **Vue 3.5.22** - 主框架，使用 Composition API 和 `<script setup>` 语法
- **TypeScript 5.9.3** - 类型安全的 JavaScript 超集
- **Vite 7.1.7** - 现代化构建工具和开发服务器

### UI 组件库
- **Element Plus 2.11.4** - Vue 3 UI 组件库
- **@element-plus/icons-vue 2.3.2** - Element Plus 图标库

### 状态管理
- **Pinia 3.0.3** - Vue 3 官方推荐的状态管理库

### 音频处理
- **Tone.js 15.1.22** - Web Audio API 音频合成和播放库
- **WaveSurfer.js 7.11.0** - 音频波形可视化库

### 音乐理论
- **@tonaljs/tonal 4.10.0** - 音乐理论计算库（音程、和弦、调性等）

### 数据验证
- **Zod 4.1.12** - TypeScript 优先的数据验证库

### 开发工具
- **@vue/tsconfig 0.8.1** - Vue TypeScript 配置
- **@vitejs/plugin-vue 6.0.1** - Vite Vue 插件
- **vue-tsc 3.1.0** - Vue TypeScript 编译器

## 项目架构

### 目录结构
```
chord-player/
├── public/                  # 静态资源
│   └── vite.svg
├── src/
│   ├── components/          # Vue 组件
│   │   ├── HarmonyEditor.vue    # 和声编辑器（核心组件）
│   │   ├── SegmentEditor.vue    # 片段编辑器
│   │   ├── SidePanel.vue        # 侧边栏和声属性编辑
│   │   └── Timeline.vue         # 时间轴组件
│   ├── services/            # 服务层
│   │   ├── transport.ts         # 音频传输控制
│   │   └── wave.ts             # 波形处理
│   ├── stores/              # Pinia 状态管理
│   │   └── player.ts           # 播放器状态管理
│   ├── types/               # TypeScript 类型定义
│   │   └── progression.ts      # 核心数据类型
│   ├── utils/               # 工具函数
│   │   └── chordUtils.ts       # 和弦计算工具
│   ├── App.vue             # 根组件
│   ├── main.ts             # 应用入口
│   └── style.css           # 全局样式
├── index.html              # HTML 模板
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
├── vite.config.ts          # Vite 配置
└── AI-context.txt          # 开发文档（本文件）
```

## 核心数据结构

### HarmonySegment (和声片段)
```typescript
interface HarmonySegment {
  id: string;                 // 唯一标识符
  startBeat: number;          // 起始拍数
  duration: number;           // 持续拍数
  chord: string;              // 和弦名称
  rootDegree: string;         // 根音级数 (I-VII)
  accidental?: string;        // 升降号 (#, ##, b, bb)
  chordType: string;          // 和弦类型 (major, minor, dominant7, major7, minor7, half_diminished7, diminished7, augmented)
  suspensionType?: string;    // 挂留类型 (sus2, sus4)
  bassDegree?: string;        // 低音级数（转位）
  bassAccidental?: string;    // 低音升降号
  extensions?: string[];      // 扩展音 (9, 11, 13)
  omissions?: string[];       // 省略音 (3, 5)
  roman?: string;             // 罗马数字标记
  color?: string;             // 显示颜色
}
```

### ProjectSegment (项目片段)
```typescript
interface ProjectSegment {
  id: string;                 // 唯一标识符
  name: string;               // 片段名称
  measures: number;           // 小节数
  isExpanded: boolean;        // 是否展开编辑器
  harmonies: HarmonySegment[]; // 和声列表
  key: string;                // 调性主音 (C, C#, Db, D, D#, Eb, E, F, F#, Gb, G, G#, Ab, A, A#, Bb, B)
  mode: string;               // 调式 (major, minor)
  timeSignature?: TimeSignature; // 拍号（可选，不设置则使用全局拍号）
}
```

### PlayerState (播放器状态)
```typescript
interface PlayerState {
  // 音频文件
  audioFile: File | null;
  audioDuration: number;
  hasAudio: boolean;
  volume: number;
  
  // 播放控制
  bpm: number;
  isPlaying: boolean;
  currentSec: number;
  beatOffset: number;         // 初始强拍偏移量（秒）
  
  // 项目数据
  segments: ProjectSegment[];
  selectedSegmentId: string | null;
  selectedHarmonyId: string | null;
  
  // 项目信息
  title: string;
  timeSignature: TimeSignature;
  
  // 显示设置
  showWaveform: boolean;
  measuresPerRow: number;     // 每行显示的小节数
  quantization: QuantizationType; // 全局量化级别 (quarter, eighth, sixteenth)
}
```

## 组件架构

### App.vue (根组件)
**功能**: 应用主界面，包含顶部工具栏和主内容区
**主要功能**:
- 播放控制 (播放/暂停/停止)
- 项目管理 (新建/保存/加载)
- 音频文件导入
- BPM 设置
- 量化级别选择
- 波形显示开关

### Timeline.vue (时间轴组件)
**功能**: 管理项目片段的时间轴视图
**主要功能**:
- 显示所有项目片段
- 添加新片段
- 片段展开/折叠控制
- 片段操作 (编辑/复制/删除)

### SegmentEditor.vue (片段编辑器)
**Props**:
- `segment: ProjectSegment` - 要编辑的片段
- `index: number` - 片段索引

**Emits**:
- `update-segment` - 更新片段信息
- `duplicate-segment` - 复制片段
- `delete-segment` - 删除片段

**主要功能**:
- 片段信息编辑 (名称、小节数、调性、拍号)
- 和声编辑器容器
- 片段操作控制

### HarmonyEditor.vue (和声编辑器 - 核心组件)
**Props**:
- `segment: ProjectSegment` - 当前编辑的片段

**Emits**:
- `update-segment` - 更新片段数据
- `edit-harmony` - 编辑和声属性

**主要功能**:
- 网格化和声显示
- 拖拽移动和声块 (支持水平和垂直跨行拖拽)
- 调整和声块大小
- 添加新和声
- 播放进度可视化
- 量化对齐

**关键实现**:
- 拖拽系统: 支持水平移动和垂直跨行移动
- 重叠检测: 防止和声块重叠
- 量化对齐: 根据全局量化设置对齐
- 实时预览: 显示拖拽过程中的位置

**视觉状态 (最新)**:
- **编辑状态高亮**: 通过 `editing` CSS 类为正在编辑的和声块添加蓝色边框和上浮晃动动画
- **状态绑定**: 使用 `store.selectedHarmonyId === harmony.id` 判断编辑状态
- **动画效果**: `float-editing` 关键帧动画提供略微上浮晃动的视觉反馈，使编辑状态更加显眼
- **拖拽把手优化**: 将右侧拖拽把手从三个黑色圆点改为一条白色圆角粗线，提升视觉效果和用户体验
- **拖拽把手常驻**: 拖拽把手现在常驻显示（opacity: 0.7），悬停时完全不透明（opacity: 1），提升可发现性

### SidePanel.vue (侧边栏编辑器)
**Props**:
- `harmony: HarmonySegment | null` - 要编辑的和声

**Emits**:
- `update-harmony` - 更新和声数据
- `delete-harmony` - 删除和声
- `close` - 关闭面板

**主要功能**:
- 和声属性详细编辑
- 根音级数和升降号设置
- 和弦类型选择 (大三、小三、属七、大七、小七、半减七、减七、增三)
- 挂留类型设置 (sus2, sus4)
- 转位低音设置
- 扩展音和省略音配置
- 颜色自定义（顶部操作区）
- 实时预览和弦信息

**布局变更 (2024年最新)**:
- **从抽屉式设计改为常驻侧边栏**: SidePanel 不再使用 `el-drawer` 组件，改为固定在应用右侧的常驻面板
- **移除 v-model 绑定**: 不再通过 `visible` 属性控制显示/隐藏，而是通过条件渲染 (`v-if="selectedHarmony"`)
- **简化事件处理**: 移除了 `visible` 相关的响应式逻辑，简化了组件状态管理
- **移除预览区域**: 删除了和弦预览功能相关的 HTML、计算属性和样式，专注于编辑功能
- **优化样式结构**: 重新设计了面板样式，适配常驻布局的视觉需求

**界面优化 (最新)**:
- **紧凑布局设计**: 采用更紧凑的间距和尺寸，提高空间利用率
- **顶部操作区**: 将颜色选择器和删除按钮移至标题区域，删除按钮改为仅显示图标的圆形按钮
- **移除保存按钮**: 实现实时保存，无需手动保存操作
- **小尺寸控件**: 所有表单控件使用 `size="small"` 属性，节省空间
- **优化分组**: 减少各区块间距，使界面更加紧凑
- **视觉层级优化**: 
  - 设置板块标题增加分隔线和圆点标识，字体加粗
  - 表单区块增加背景色和边框，提升视觉层次
  - 优化字体大小和颜色，提高可读性
  - 内联控件布局：根音级数和低音级数与对应升降号单选组置于同一行
- **过渡动画**: 添加性能友好的侧边栏过渡动画，包括：
  - **侧边栏切换**: 在 App.vue 中使用 Transition 组件包装侧边栏内容，实现平滑的内容切换动画
  - **表单内容过渡**: 在 SidePanel.vue 中为表单内容添加 `form-content` 过渡动画，支持不同和声块间的切换
  - **动画效果**: 使用 `cubic-bezier(0.4, 0, 0.2, 1)` 缓动函数，结合透明度、位移和缩放变换
  - **性能优化**: 动画时长控制在 0.2-0.25s，避免过长的动画影响用户体验

**功能修复 (最新)**:
- **编辑状态高亮**: 正在编辑的和声块现在有明显的蓝色边框和脉冲动画效果，通过 `store.selectedHarmonyId` 状态控制
- **实时同步优化**: 修复了侧边栏修改无法实时同步到和声块的问题，现在所有属性变更都能立即反映在界面上
- **事件流优化**: 改进了 `updateHarmony` 方法的实现，确保数据更新的一致性和实时性

## 应用布局架构

### 整体布局结构
```
App.vue
├── Header (工具栏)
│   ├── 播放控制 (播放/暂停/停止/跳转开始)
│   ├── BPM 设置
│   ├── 量化级别选择
│   ├── 项目管理 (新建/保存/加载)
│   ├── 音频导入
│   ├── 初始强拍设置
│   └── 波形显示开关
├── Main Content (主内容区)
│   ├── 波形显示区域 (可选)
│   └── Timeline 组件
│       └── SegmentEditor 组件列表
│           └── HarmonyEditor 组件
└── Sidebar (右侧常驻侧边栏)
    └── SidePanel 组件 (条件渲染)
```

### 事件流架构
```
HarmonyEditor → SegmentEditor → Timeline → App → SidePanel
     ↓              ↓            ↓        ↓        ↓
edit-harmony → edit-harmony → edit-harmony → onEditHarmony → 显示编辑面板
```

## 服务层架构

### transport.ts (音频传输控制)
**功能**: 基于 Tone.js 的音频播放和同步控制
**主要方法**:
- `startTransport()` - 开始播放
- `pauseTransport()` - 暂停播放  
- `stopTransport()` - 停止播放
- `seekTransportSeconds()` - 跳转到指定时间
- `setBpm()` - 设置 BPM

### wave.ts (波形处理)
**功能**: 基于 WaveSurfer.js 的音频波形显示和交互
**主要方法**:
- `createWaveSurfer()` - 创建波形实例
- `loadAudioBlob()` - 加载音频文件
- `playAudio()` / `pauseAudio()` / `stopAudio()` - 音频控制
- `seekSeconds()` - 跳转到指定时间
- `getDuration()` - 获取音频时长
- 事件回调: `onReady()`, `onPlay()`, `onPause()`, `onAudioProcess()`, `onClick()`

## 状态管理 (Pinia Store)

### usePlayerStore
**State**:
- 播放状态管理
- 项目数据管理
- 音频信息管理
- 显示设置管理

**Getters**:
- `adjustedCurrentBeat` - 调整后的当前拍数
- `selectedSegment` - 当前选中的片段
- `selectedHarmony` - 当前选中的和声

**Actions**:
- **播放控制**: `setPlaying()`, `setCurrentTime()`, `setBpm()`
- **片段管理**: `addSegment()`, `updateSegment()`, `removeSegment()`
- **和声管理**: `addHarmony()`, `updateHarmony()`, `removeHarmony()`
- **选择管理**: `selectSegment()`, `selectHarmony()`
- **项目管理**: `exportProject()`, `loadProject()`
- **工具方法**: `canAddHarmonyAt()`, `getNextAvailableBeat()`

## 服务层

### transport.ts (音频传输控制)
基于 Tone.js 的音频播放控制服务
**主要功能**:
- BPM 设置和获取
- 播放控制 (开始/暂停/停止)
- 时间跳转 (按秒或拍数)
- 循环设置
- 事件监听

**关键方法**:
- `setBpm(bpm: number)` - 设置 BPM
- `startTransport()` - 开始播放
- `seekTransportBeats(beats: number)` - 跳转到指定拍数
- `setLoop(startBeats: number, endBeats: number)` - 设置循环

### wave.ts (波形处理)
基于 WaveSurfer.js 的音频波形可视化服务
**主要功能**:
- 音频文件加载
- 波形可视化
- 播放控制
- 时间跳转
- 音量控制
- 事件监听

**关键方法**:
- `createWaveSurfer(container: HTMLElement)` - 创建波形实例
- `loadAudioBlob(file: File)` - 加载音频文件
- `seekSeconds(sec: number)` - 跳转到指定时间
- `onAudioProcess(callback)` - 监听播放进度

## 工具函数

### chordUtils.ts (和弦计算工具)
**主要功能**:
- 音名计算和转换
- 和弦名称生成
- 升降号处理
- 调性转换

**关键方法**:
- `generateChordName(rootDegree, accidental, chordType, segmentKey)` - 生成和弦名称
- `degreeToNoteName(degree, accidental, key)` - 级数转音名
- `applyAccidental(rootNote, accidental)` - 应用升降号
- `formatAccidental(accidental)` - 格式化升降号显示

## 关键实现细节

### 1. 拖拽系统
**水平拖拽**:
- 基于鼠标位移计算拍数偏移
- 量化对齐到指定细分
- 边界检测防止越界

**垂直拖拽 (跨行移动)**:
- 计算垂直位移对应的行数变化
- 转换为拍数偏移 (`deltaRows * beatsPerRow`)
- 结合水平位移计算最终位置

**实现代码位置**: `HarmonyEditor.vue` 的 `handleDrag()` 方法

### 2. 重叠检测与防护
**检测逻辑**:
- 在 `store.updateHarmony()` 中实现
- 计算相邻和声的边界
- 钳位 `startBeat` 和 `duration` 到允许范围
- 拒绝无可用空间的更新

**边界计算**:
```typescript
// 计算左边界 (前一个和声的结束位置)
const leftBoundary = prevHarmony ? prevHarmony.startBeat + prevHarmony.duration : 0;
// 计算右边界 (后一个和声的开始位置)
const rightBoundary = nextHarmony ? nextHarmony.startBeat : segmentTotalBeats;
```

### 3. 音频同步
**时间计算**:
- 使用 `beatOffset` 调整初始强拍位置
- `adjustedCurrentBeat = currentBeat - beatOffset * bpm / 60`
- 支持音频文件与和声进行的精确同步

**播放进度显示**:
- 实时计算当前播放位置在各片段中的相对位置
- 跨片段连续显示播放游标
- 支持按小节和按行的进度可视化

### 4. 量化系统
**量化级别**:
- `quarter` - 四分音符 (1拍细分)
- `eighth` - 八分音符 (2拍细分)
- `sixteenth` - 十六分音符 (4拍细分)

**对齐算法**:
```typescript
const quantizeStep = 1 / getSubdivisionsPerBeat();
const quantizedBeat = Math.round(beat / quantizeStep) * quantizeStep;
```

### 5. 项目文件格式
**文件扩展名**: `.chp.json`
**版本**: 2.0
**向后兼容**: 支持从旧版本 `tracks` 格式迁移到新版本 `segments` 格式

## 开发规范

### 代码风格
- 使用 TypeScript 严格模式
- Vue 3 Composition API + `<script setup>`
- ESLint + Prettier 代码格式化
- 组件采用 PascalCase 命名
- 文件名采用 camelCase

### 组件设计原则
- 单一职责原则
- Props 向下，Events 向上
- 使用 TypeScript 接口定义 Props 和 Emits
- 响应式数据使用 `ref()` 和 `reactive()`
- 计算属性使用 `computed()`

### 状态管理
- 使用 Pinia 进行全局状态管理
- Store 按功能模块划分
- Actions 处理异步操作
- Getters 处理派生状态

## 构建配置

### 开发命令
- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run preview` - 预览构建结果

### TypeScript 配置
- 使用项目引用 (Project References)
- 分离应用代码和构建工具配置
- 启用严格类型检查

### Vite 配置
- Vue 插件支持
- 开发服务器热重载
- 生产构建优化

## 最新功能更新

### 已实现功能
1. **完善的和声块重叠防护机制** ⭐ **最新更新**
   - **Store 层重叠检测**: 在 `store.updateHarmony` 中实现严格的重叠检测和边界钳位
   - **拖拽实时检测**: 拖拽过程中实时检查目标位置是否会重叠，提供视觉反馈
   - **调整大小防护**: 调整和声块大小时自动钳位到允许的最大持续时间
   - **智能添加验证**: 添加新和声时智能选择最佳位置，确保不重叠

2. **跨行垂直拖拽**
   - 支持和声块上下拖拽跨行移动
   - 基于行高计算垂直位移对应的拍数偏移
   - 与水平拖拽结合实现二维移动
   - 自动量化对齐到指定细分

3. **侧边栏编辑器优化** ⭐ **最新更新**
   - **预览同步修复**: 解决预览和声块文本与片段实际文本不同步问题，确保预览使用正确的片段调性
   - **界面简化**: 移除时间设置表单项，现在通过直观的拖拽操作调整时间
   - **数据结构统一**: 使用标准的 `bassDegree`/`bassAccidental` 属性处理转位低音

### 重叠防护机制详细实现

#### 1. Store 层核心方法
**新增 `checkHarmonyOverlap` 方法**:
```typescript
checkHarmonyOverlap(segmentId: string, startBeat: number, duration: number, excludeId?: string): boolean
```
- 检查指定位置和持续时间的和声是否与现有和声重叠
- 支持排除特定和声ID（用于更新现有和声时的检查）

**增强 `updateHarmony` 方法**:
- 集成 `findAvailableSpaces`、`findBestFitSpace`、`findNearestSpace` 辅助方法
- 实现智能空间查找和最佳位置匹配
- 自动边界钳位，防止越界和重叠

#### 2. 拖拽重叠检测
**实时检测机制**:
- 在 `handleDrag` 中调用 `store.checkHarmonyOverlap` 检查目标位置
- 引入 `dragPreviewPosition` 状态跟踪拖拽预览
- 只有在不重叠的情况下才允许实际更新位置

**视觉反馈**:
- 添加 `drag-invalid` CSS 类，当拖拽到无效位置时显示红色背景
- 实现抖动动画 (`shake` keyframes) 提供明确的视觉警告

#### 3. 调整大小防护
**智能钳位算法**:
- 检测调整大小是否会造成重叠
- 自动计算允许的最大持续时间
- 找到右侧最近的和声块作为边界限制
- 确保调整后的持续时间不小于最小步长

#### 4. 添加和声验证
**增强 `canAddHarmonyAt` 方法**:
- 检查小节内是否有足够空间（至少1拍）
- 分析小节开始、和声间隙、小节结束的可用空间
- 支持复杂的空间计算和验证

**智能 `addHarmony` 方法**:
- 自动寻找最佳放置位置
- 优先选择小节开始、和声间隙、小节结束
- 根据可用空间智能调整默认持续时间（1-2拍）

### 技术实现要点
- **重叠检测**: 通过精确的时间区间计算实现非重叠约束
- **实时反馈**: 拖拽过程中提供即时的视觉和逻辑反馈
- **智能钳位**: 自动调整到允许的边界范围内
- **空间优化**: 智能利用可用空间，避免浪费
- **边界保护**: 统一在 Store 层处理所有越界和重叠约束

## 开发建议

### 性能优化
1. **虚拟滚动**: 对于大量和声数据使用虚拟滚动
2. **防抖处理**: 拖拽和输入操作使用防抖
3. **缓存策略**: 缓存计算结果和渲染数据
4. **Web Workers**: 将音频处理移至后台线程

### 功能扩展
1. **MIDI 支持**: 集成 Web MIDI API
2. **音频导出**: 支持导出音频文件
3. **协作编辑**: 实时协作功能
4. **插件系统**: 支持第三方插件

### 测试策略
1. **单元测试**: 使用 Vitest 测试工具函数
2. **组件测试**: 使用 Vue Test Utils 测试组件
3. **E2E 测试**: 使用 Playwright 测试完整流程
4. **音频测试**: 模拟音频播放和同步测试

### 用户体验优化
1. **键盘快捷键**: 添加常用操作的快捷键
2. **撤销重做**: 实现操作历史管理
3. **拖拽反馈**: 优化拖拽过程中的视觉反馈
4. **响应式设计**: 支持移动端和平板设备

---

*本文档基于项目当前状态生成，随着功能迭代会持续更新。建议开发者在添加新功能时同步更新此文档。*