export type DelayProfile = "chatbot" | "direct-send" | "broadcast" | "retry";

interface DelayConfig {
  minDelay: number;
  maxDelay: number;
  msPerChar: number;
  jitterFactor: number;
}

const PROFILE_CONFIGS: Record<DelayProfile, DelayConfig> = {
  chatbot: {
    minDelay: 3000,
    maxDelay: 10000,
    msPerChar: 200,
    jitterFactor: 0.3,
  },
  "direct-send": {
    minDelay: 2000,
    maxDelay: 6000,
    msPerChar: 200,
    jitterFactor: 0.3,
  },
  broadcast: {
    minDelay: 5000,
    maxDelay: 10000,
    msPerChar: 100,
    jitterFactor: 0.2,
  },
  retry: {
    minDelay: 3000,
    maxDelay: 6000,
    msPerChar: 0,
    jitterFactor: 0.4,
  },
};

export function getDelayConfig(profile: DelayProfile): DelayConfig {
  return PROFILE_CONFIGS[profile];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function calculateTypingDelay(text: string, msPerChar: number): number {
  const delay = text.length * msPerChar;
  return Math.max(500, delay);
}

export function jitterDelay(baseMs: number, factor = 0.3): number {
  const range = Math.floor(baseMs * factor);
  return baseMs + Math.floor(Math.random() * range * 2) - range;
}

export function humanDelay(profile: DelayProfile, textLength = 0): Promise<void> {
  const config = getDelayConfig(profile);

  let baseDelay: number;

  if (profile === "retry" || textLength === 0) {
    baseDelay = (config.minDelay + config.maxDelay) / 2;
  } else {
    const calculated = textLength * config.msPerChar;
    baseDelay = Math.max(config.minDelay, Math.min(config.maxDelay, calculated));
  }

  const finalDelay = jitterDelay(baseDelay, config.jitterFactor);
  return sleep(finalDelay);
}
