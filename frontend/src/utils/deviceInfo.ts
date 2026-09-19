export interface DeviceTelemetry {
  browser: string;
  os: string;
  device_type: string;
  screen_resolution: string;
  device_fingerprint: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  location_status: 'granted' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';
}

function getOrCreateDeviceFingerprint(): string {
  const KEY = 'ubicode_device_fingerprint';
  let fp = localStorage.getItem(KEY);
  if (!fp) {
    const randomBytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randomBytes);
      fp = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      fp = 'fp_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    localStorage.setItem(KEY, fp);
  }
  return fp;
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (/windows phone/i.test(ua)) return 'Windows Phone';
  if (/win(dows|98|nt|2000|xp|vista|7|8|10|11)/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  if (/cros/i.test(ua)) return 'ChromeOS';
  return 'Unknown OS';
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let version = '';

  if (/edg\/([0-9.]+)/i.test(ua)) {
    browser = 'Edge';
    version = RegExp.$1;
  } else if (/opr\/([0-9.]+)/i.test(ua)) {
    browser = 'Opera';
    version = RegExp.$1;
  } else if (/chrome\/([0-9.]+)/i.test(ua)) {
    browser = 'Chrome';
    version = RegExp.$1;
  } else if (/firefox\/([0-9.]+)/i.test(ua)) {
    browser = 'Firefox';
    version = RegExp.$1;
  } else if (/version\/([0-9.]+).*safari/i.test(ua)) {
    browser = 'Safari';
    version = RegExp.$1;
  }

  const major = version ? version.split('.')[0] : '';
  return major ? `${browser} ${major}` : browser;
}

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    )
  ) {
    return 'Mobile';
  }
  return 'Desktop';
}

/**
 * Collects client device specifications and attempts to acquire browser geolocation.
 * Always resolves within 4.5 seconds even if geolocation is delayed or denied.
 */
export async function collectDeviceTelemetry(): Promise<DeviceTelemetry> {
  const baseTelemetry: DeviceTelemetry = {
    browser: detectBrowser(),
    os: detectOS(),
    device_type: detectDeviceType(),
    screen_resolution: `${window.screen.width || 0}x${window.screen.height || 0}`,
    device_fingerprint: getOrCreateDeviceFingerprint(),
    location_status: 'unavailable',
    latitude: null,
    longitude: null,
    accuracy: null,
  };

  if (!navigator.geolocation) {
    baseTelemetry.location_status = 'unsupported';
    return baseTelemetry;
  }

  return new Promise<DeviceTelemetry>((resolve) => {
    let resolved = false;

    // 4.5 second safeguard timeout
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        baseTelemetry.location_status = 'timeout';
        resolve(baseTelemetry);
      }
    }, 4500);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        baseTelemetry.location_status = 'granted';
        baseTelemetry.latitude = Number(pos.coords.latitude.toFixed(6));
        baseTelemetry.longitude = Number(pos.coords.longitude.toFixed(6));
        baseTelemetry.accuracy = Number(pos.coords.accuracy.toFixed(1));
        resolve(baseTelemetry);
      },
      (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        if (err.code === err.PERMISSION_DENIED) {
          baseTelemetry.location_status = 'denied';
        } else if (err.code === err.TIMEOUT) {
          baseTelemetry.location_status = 'timeout';
        } else {
          baseTelemetry.location_status = 'unavailable';
        }
        resolve(baseTelemetry);
      },
      {
        enableHighAccuracy: true,
        timeout: 4000,
        maximumAge: 60000,
      }
    );
  });
}
