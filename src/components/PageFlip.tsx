import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, Easing, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { DigitizedPage } from './DigitizedPage';
import type { Box, HandbookPage } from '../types';

export type PageTurn = { previous: HandbookPage; direction: 1 | -1; sequence: number };

function Paper({ page, width, highlight, reduced }: { page: HandbookPage; width: number; highlight?: Box; reduced: boolean }) {
  return page.layout
    ? <DigitizedPage layout={page.layout} label={page.label} width={width} highlight={highlight} reduced={reduced} />
    : <View style={{ padding: 30 }}><Text>{page.title}</Text>{page.passages.map(p => <Text key={p.id}>{p.text}</Text>)}</View>;
}

/** One hinged paper leaf over a stationary page. The reader chrome never rotates. */
function TurningLeaf({ turn, page, width, height, onFinish }: { turn: PageTurn; page: HandbookPage; width: number; height: number; onFinish: () => void }) {
  const progress = useSharedValue(0);
  const direction = turn.direction;
  useEffect(() => {
    progress.value = withTiming(1, { duration: 620, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System }, finished => {
      if (finished) runOnJS(onFinish)();
    });
    return () => cancelAnimation(progress);
  }, [progress, onFinish]);
  const leaf = useAnimatedStyle(() => ({
    // Stop before the back face: some native/web compositors can briefly draw
    // mirrored text despite backfaceVisibility. A thin edge fades at the hinge.
  transform: [{ perspective: 1400 }, { rotateY: `${-88 * (direction === 1 ? progress.value : 1 - progress.value)}deg` }],
    opacity: direction === 1 ? Math.min(1, (1 - progress.value) / .08) : Math.min(1, progress.value / .08),
  }));
  const shade = useAnimatedStyle(() => ({ opacity: Math.sin(progress.value * Math.PI) * .2 }));
  const movingPage = turn.direction === 1 ? turn.previous : page;
 return <Animated.View testID="turning-page-leaf" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.leaf, { width, height, transformOrigin: 'left center' }, leaf]}>
    <Paper page={movingPage} width={width} reduced />
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, shade]}>
   <LinearGradient colors={['#15243D00', '#15243D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  </Animated.View>;
}

export function PageFlip({ page, width, height, highlight, reduced, turn, onFinish }: { page: HandbookPage; width: number; height: number; highlight?: Box; reduced: boolean; turn: PageTurn | null; onFinish: () => void }) {
  const basePage = turn?.direction === -1 ? turn.previous : page;
  return <View testID="handbook-paper" style={[s.paper, { width, height }]}>
    <View accessibilityElementsHidden={!!turn} importantForAccessibility={turn ? 'no-hide-descendants' : 'auto'}>
      <Paper page={basePage} width={width} reduced={reduced} highlight={turn ? undefined : highlight} />
    </View>
    {turn && !reduced && <TurningLeaf key={turn.sequence} turn={turn} page={page} width={width} height={height} onFinish={onFinish} />}
  </View>;
}

const s = StyleSheet.create({
  paper: { backgroundColor: '#FFFFFF', boxShadow: '0 8px 28px #23396212' },
  leaf: { position: 'absolute', top: 0, left: 0, backgroundColor: '#FFFFFF', backfaceVisibility: 'hidden', overflow: 'hidden', boxShadow: '0 3px 18px #14244026' },
});
