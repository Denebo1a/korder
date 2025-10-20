import * as Tone from 'tone';

// 时间转换工具函数
export const toSeconds = (beats: number, bpm: number): number => (beats * 60) / bpm;
export const toBeats = (sec: number, bpm: number): number => (sec * bpm) / 60;

// BPM 设置
export const setBpm = (bpm: number): void => {
  Tone.Transport.bpm.value = bpm;
};

export const getBpm = (): number => Tone.Transport.bpm.value;

// 传输控制
export const startTransport = async (): Promise<void> => {
  if (Tone.context.state !== 'running') {
    await Tone.start();
  }
  Tone.Transport.start();
};

export const pauseTransport = (): void => {
  Tone.Transport.pause();
};

export const stopTransport = (): void => {
  Tone.Transport.stop();
};

// 时间跳转
export const seekTransportSeconds = (sec: number): void => {
  Tone.Transport.seconds = sec;
};

export const seekTransportBeats = (beats: number): void => {
  const bpm = getBpm();
  const seconds = toSeconds(beats, bpm);
  seekTransportSeconds(seconds);
};

// 获取当前时间
export const getCurrentSeconds = (): number => Tone.Transport.seconds;
export const getCurrentBeats = (): number => {
  const bpm = getBpm();
  return toBeats(getCurrentSeconds(), bpm);
};

// 设置循环
export const setLoop = (startBeats: number, endBeats: number): void => {
  const bpm = getBpm();
  const startSec = toSeconds(startBeats, bpm);
  const endSec = toSeconds(endBeats, bpm);
  
  Tone.Transport.setLoopPoints(startSec, endSec);
  Tone.Transport.loop = true;
};

export const disableLoop = (): void => {
  Tone.Transport.loop = false;
};

// 事件监听
export const onTransportStart = (callback: () => void): void => {
  Tone.Transport.on('start', callback);
};

export const onTransportStop = (callback: () => void): void => {
  Tone.Transport.on('stop', callback);
};

export const onTransportPause = (callback: () => void): void => {
  Tone.Transport.on('pause', callback);
};