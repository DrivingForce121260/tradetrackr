import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export function CameraFrame() {
  // Card aspect ratio ~1.6:1
  const frameWidth = width * 0.85;
  const frameHeight = frameWidth / 1.6;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.frame,
          {
            width: frameWidth,
            height: frameHeight,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
});











