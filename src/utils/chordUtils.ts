// 音名计算工具函数 - 统一接口

// 各调的音阶映射
export const keyScales: Record<string, string[]> = {
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
export const degreeToIndex: Record<string, number> = {
  'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5, 'VII': 6
}

// 和弦类型到后缀的映射
export const chordTypeSuffix: Record<string, string> = {
  'major': '',
  'minor': 'm',
  'augmented': 'aug',
  'dominant7': '7',
  'major7': 'Maj7',
  'minor7': 'm7',
  'half_diminished7': 'm7♭5',
  'diminished7': 'dim7'
}

// 升降号显示映射
export const accidentalDisplay: Record<string, string> = {
  '##': '𝄪',  // 重升号 (U+1D12A)
  '#': '♯',   // 升号 (U+266F)
  'b': '♭',   // 降号 (U+266D)
  'bb': '𝄫'   // 重降号 (U+1D12B)
}

/**
 * 解析音名，分离基础音名和升降号
 * @param noteName 音名（如 'C♯', 'D♭', 'F##'）
 * @returns {baseName: string, accidentalCount: number} 基础音名和升降号数量（正数为升号，负数为降号）
 */
export const parseNoteName = (noteName: string): { baseName: string; accidentalCount: number } => {
  const baseName = noteName.charAt(0)
  const accidentalPart = noteName.slice(1)
  
  let accidentalCount = 0
  
  // 计算升降号数量
  for (const char of accidentalPart) {
    if (char === '♯' || char === '#') {
      accidentalCount++
    } else if (char === '♭' || char === 'b') {
      accidentalCount--
    }
  }
  
  return { baseName, accidentalCount }
}



/**
 * 根据基础音名和升降号数量构建音名
 * @param baseName 基础音名
 * @param accidentalCount 升降号数量（正数为升号，负数为降号）
 * @returns 完整音名
 */
const buildNoteName = (baseName: string, accidentalCount: number): string => {
  if (accidentalCount === 0) return baseName
  
  if (accidentalCount > 0) {
    // 升号
    if (accidentalCount === 1) return baseName + '♯'
    if (accidentalCount === 2) return baseName + '𝄪'  // 重升号
    // 更多升号的情况（理论上很少用到）
    return baseName + '♯'.repeat(accidentalCount)
  } else {
    // 降号
    const flatCount = Math.abs(accidentalCount)
    if (flatCount === 1) return baseName + '♭'
    if (flatCount === 2) return baseName + '𝄫'  // 重降号
    // 更多降号的情况（理论上很少用到）
    return baseName + '♭'.repeat(flatCount)
  }
}

/**
 * 应用升降号到音名
 * @param rootNote 原始音名（可能已经带有升降号）
 * @param accidental 要应用的升降号 ('##', '#', 'b', 'bb', '')
 * @returns 应用升降号后的音名
 */
export const applyAccidental = (rootNote: string, accidental?: string): string => {
  if (!accidental) return rootNote

  // 解析原始音名
  const { baseName, accidentalCount } = parseNoteName(rootNote)
  
  // 根据要应用的升降号计算最终的升降号数量
  let finalAccidentalCount = 0
  if (accidental === '##') {
    finalAccidentalCount = accidentalCount + 2
  } else if (accidental === '#') {
    finalAccidentalCount = accidentalCount + 1
  } else if (accidental === 'b') {
    finalAccidentalCount = accidentalCount - 1
  } else if (accidental === 'bb') {
    finalAccidentalCount = accidentalCount - 2
  }
  
  // 构建最终音名
  return buildNoteName(baseName, finalAccidentalCount)
}

/**
 * 根据级数和调性获取音名
 * @param degree 级数 ('I', 'II', 'III', 'IV', 'V', 'VI', 'VII')
 * @param accidental 升降号 ('##', '#', 'b', 'bb', '')
 * @param key 调性 ('C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'Db', etc.)
 * @returns 对应的音名
 */
export const degreeToNoteName = (degree: string, accidental?: string, key?: string): string => {
  if (!degree || !key) return 'C'
  
  const scale = keyScales[key] || keyScales['C']
  const degreeIndex = degreeToIndex[degree] || 0
  const rootNote = scale[degreeIndex] || 'C'
  
  return applyAccidental(rootNote, accidental)
}

/**
 * 根据根音级数、升降号和和弦类型生成和弦名称（基于片段调性）
 * @param rootDegree 根音级数
 * @param accidental 升降号
 * @param chordType 和弦类型
 * @param segmentKey 片段调性
 * @returns 和弦名称
 */
export const generateChordName = (
  rootDegree?: string, 
  accidental?: string, 
  chordType?: string, 
  segmentKey?: string
): string => {
  if (!rootDegree || !chordType || !segmentKey) return 'C'
  
  const rootNote = degreeToNoteName(rootDegree, accidental, segmentKey)
  const suffix = chordTypeSuffix[chordType] || ''
  
  return rootNote + suffix
}

/**
 * 格式化升降号显示
 * @param accidental 升降号字符串
 * @returns 格式化后的升降号显示
 */
export const formatAccidental = (accidental?: string): string => {
  if (!accidental) return ''
  return accidentalDisplay[accidental] || accidental
}