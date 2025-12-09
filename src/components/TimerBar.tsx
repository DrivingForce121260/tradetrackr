/**
 * Timer Bar Component
 * Shows running/stopped timer state and elapsed time
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/appStore';

export default function TimerBar() {
  const timer = useAppStore((state) => state.timer);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!timer.running || !timer.startTime) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - timer.startTime!) / 1000);
      setElapsed(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.running, timer.startTime]);

  if (!timer.running && !timer.startTime) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, timer.running ? styles.running : styles.paused]}>
      <View style={styles.indicator} />
      <Text style={styles.text}>
        {timer.running ? '⏱ Läuft' : '⏸ Pausiert'} · {formatTime(elapsed)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  running: {
    backgroundColor: '#34C759',
  },
  paused: {
    backgroundColor: '#FF9500',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});








