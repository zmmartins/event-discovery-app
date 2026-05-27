import * as Haptics from "expo-haptics";
import { Accelerometer } from "expo-sensors";
import { useCallback, useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";

import {
  LOG_ACTIONS,
  logInteraction,
} from "../services/interactionLogService";

const SHAKE_THRESHOLD = 1.15;
const SENSOR_INTERVAL_MS = 80;
const PROCESSING_MS = 1700;
const PROGRESS_INTERVAL_MS = 80;

export default function useShakeToDiscover({
  enabled = true,
  onShakeComplete,
  onShakeStart,
} = {}) {
  const [isShaking, setIsShaking] = useState(false);
  const [shakeProgress, setShakeProgress] = useState(0);
  const isProcessingRef = useRef(false);
  const progressIntervalRef = useRef(null);
  const completionTimeoutRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, []);

  const startShakeFlow = useCallback(() => {
    if (!enabled || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsShaking(true);
    setShakeProgress(0);
    onShakeStart?.();
    Vibration.vibrate(650);
    logInteraction(LOG_ACTIONS.shakeDetected, {
      screen: "ShakeDiscoverScreen",
      source: "accelerometer",
    }).catch(() => null);

    const startedAt = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const nextProgress = Math.min(
        1,
        (Date.now() - startedAt) / PROCESSING_MS,
      );
      setShakeProgress(nextProgress);
    }, PROGRESS_INTERVAL_MS);

    completionTimeoutRef.current = setTimeout(async () => {
      clearTimers();
      setShakeProgress(1);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => null,
      );
      setIsShaking(false);
      isProcessingRef.current = false;
      await onShakeComplete?.();
    }, PROCESSING_MS);
  }, [clearTimers, enabled, onShakeComplete, onShakeStart]);

  useEffect(() => {
    if (!enabled) return undefined;

    Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const movement = Math.abs(magnitude - 1);

      if (movement >= SHAKE_THRESHOLD) {
        startShakeFlow();
      }
    });

    return () => {
      subscription?.remove();
      clearTimers();
      isProcessingRef.current = false;
    };
  }, [clearTimers, enabled, startShakeFlow]);

  return {
    isShaking,
    shakeProgress,
    startShakeFlow,
  };
}
