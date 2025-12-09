/**
 * Layout Component
 * Base wrapper with SafeArea and default styling
 */

import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

interface LayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: any;
}

export default function Layout({ children, scrollable = false, style }: LayoutProps) {
  const Container = scrollable ? ScrollView : View;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Container style={[styles.container, style]}>
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    padding: 16,
  },
});








