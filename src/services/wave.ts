import WaveSurfer from 'wavesurfer.js';

let wavesurfer: WaveSurfer | null = null;

// 创建 WaveSurfer 实例
export const createWaveSurfer = (container: HTMLElement): WaveSurfer => {
  if (wavesurfer) {
    wavesurfer.destroy();
  }
  
  wavesurfer = WaveSurfer.create({
    container,
    height: 80,
    waveColor: '#e5e7eb',
    progressColor: '#3b82f6',
    cursorColor: '#ef4444',
    barWidth: 2,
    barRadius: 1,
    normalize: true,
    interact: true,
    hideScrollbar: true,
  });
  
  return wavesurfer;
};

// 音频文件加载
export const loadAudioBlob = async (file: File): Promise<void> => {
  if (!wavesurfer) throw new Error('WaveSurfer not initialized');
  await wavesurfer.loadBlob(file);
};

export const loadAudioUrl = async (url: string): Promise<void> => {
  if (!wavesurfer) throw new Error('WaveSurfer not initialized');
  await wavesurfer.load(url);
};

// 播放控制
export const playAudio = (): void => {
  if (!wavesurfer) return;
  wavesurfer.play();
};

export const pauseAudio = (): void => {
  if (!wavesurfer) return;
  wavesurfer.pause();
};

export const stopAudio = (): void => {
  if (!wavesurfer) return;
  wavesurfer.stop();
};

// 时间跳转
export const seekSeconds = (sec: number): void => {
  if (!wavesurfer) return;
  wavesurfer.setTime(sec);
};

export const seekPercent = (percent: number): void => {
  if (!wavesurfer) return;
  wavesurfer.seekTo(percent);
};

// 获取当前状态
export const getCurrentSeconds = (): number => {
  if (!wavesurfer) return 0;
  return wavesurfer.getCurrentTime();
};

export const getDuration = (): number => {
  if (!wavesurfer) return 0;
  return wavesurfer.getDuration();
};

export const isPlaying = (): boolean => {
  if (!wavesurfer) return false;
  return wavesurfer.isPlaying();
};

export const isReady = (): boolean => {
  if (!wavesurfer) return false;
  return wavesurfer.getDecodedData() !== null;
};

// 音量控制
export const setVolume = (volume: number): void => {
  if (!wavesurfer) return;
  wavesurfer.setVolume(volume);
};

export const getVolume = (): number => {
  if (!wavesurfer) return 1;
  return wavesurfer.getVolume();
};

// 事件监听
export const onReady = (callback: () => void): void => {
  if (!wavesurfer) return;
  wavesurfer.on('ready', callback);
};

export const onPlay = (callback: () => void): void => {
  if (!wavesurfer) return;
  wavesurfer.on('play', callback);
};

export const onPause = (callback: () => void): void => {
  if (!wavesurfer) return;
  wavesurfer.on('pause', callback);
};

export const onFinish = (callback: () => void): void => {
  if (!wavesurfer) return;
  wavesurfer.on('finish', callback);
};

export const onAudioProcess = (callback: (currentTime: number) => void): void => {
  if (!wavesurfer) return;
  wavesurfer.on('audioprocess', callback);
};

export const onSeek = (callback: (progress: number) => void): void => {
  if (!wavesurfer) return;
  wavesurfer.on('timeupdate', (currentTime: number) => {
    const duration = wavesurfer?.getDuration() || 1;
    callback(currentTime / duration);
  });
};

export const onClick = (callback: (progress: number) => void): void => {
  if (!wavesurfer) return;
  wavesurfer.on('click', (relativeY: number) => {
    callback(relativeY);
  });
};

// 销毁实例
export const destroyWaveSurfer = (): void => {
  if (wavesurfer) {
    wavesurfer.destroy();
    wavesurfer = null;
  }
};

// 获取当前实例
export const getWaveSurfer = (): WaveSurfer | null => wavesurfer;