import { Capacitor } from '@capacitor/core';

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

interface HapticsInterface {
  impact(options: { style: ImpactStyle }): Promise<void>;
  notification(options: { type: NotificationType }): Promise<void>;
  selectionStart(): Promise<void>;
  selectionChanged(): Promise<void>;
  selectionEnd(): Promise<void>;
  vibrate(options?: { duration: number }): Promise<void>;
}

let hapticsModule: HapticsInterface | null = null;

async function getHaptics(): Promise<HapticsInterface | null> {
  if (hapticsModule) return hapticsModule;
  
  if (Capacitor.isNativePlatform()) {
    try {
      const { Haptics } = await import('@capacitor/haptics');
      hapticsModule = Haptics as unknown as HapticsInterface;
      return hapticsModule;
    } catch {
      return null;
    }
  }
  return null;
}

function webVibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

export async function impactLight(): Promise<void> {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.impact({ style: 'light' });
  } else {
    webVibrate(10);
  }
}

export async function impactMedium(): Promise<void> {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.impact({ style: 'medium' });
  } else {
    webVibrate(20);
  }
}

export async function impactHeavy(): Promise<void> {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.impact({ style: 'heavy' });
  } else {
    webVibrate(30);
  }
}

export async function notificationSuccess(): Promise<void> {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.notification({ type: 'success' });
  } else {
    webVibrate([10, 50, 10]);
  }
}

export async function notificationWarning(): Promise<void> {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.notification({ type: 'warning' });
  } else {
    webVibrate([30, 50, 30]);
  }
}

export async function notificationError(): Promise<void> {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.notification({ type: 'error' });
  } else {
    webVibrate([50, 30, 50]);
  }
}

export async function selectionChanged(): Promise<void> {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.selectionChanged();
  } else {
    webVibrate(5);
  }
}

export async function vibrate(duration: number = 100): Promise<void> {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.vibrate({ duration });
  } else {
    webVibrate(duration);
  }
}

export async function panicVibrate(): Promise<void> {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.notification({ type: 'error' });
    await new Promise(resolve => setTimeout(resolve, 100));
    await haptics.notification({ type: 'error' });
  } else {
    webVibrate([50, 30, 50]);
  }
}

export const haptics = {
  impactLight,
  impactMedium,
  impactHeavy,
  notificationSuccess,
  notificationWarning,
  notificationError,
  selectionChanged,
  vibrate,
  panicVibrate,
};

export default haptics;
