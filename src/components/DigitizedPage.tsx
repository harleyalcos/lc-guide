import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { Box, PageLayout, PrintLine } from '../types';

const printFont = Platform.select({ ios: 'Arial', android: 'sans-serif', default: 'Arial, Helvetica, sans-serif' });

function Line({ line, scale }: { line: PrintLine; scale: number }) {
  const style = { fontFamily: printFont, fontSize: line.fontSize * scale, lineHeight: line.fontSize * 1.18 * scale, color: '#151515', fontWeight: line.bold ? '700' as const : '400' as const, fontStyle: line.italic ? 'italic' as const : 'normal' as const, includeFontPadding: false };
  const frame = { position: 'absolute' as const, left: line.x * scale, top: line.y * scale, width: line.width * scale };
  if (line.leader) return <View testID={`print-line-${line.id}`} style={[frame, s.row]} accessibilityLabel={`${line.text}, ${line.rightText}`}>
    <Text selectable allowFontScaling={false} style={style}>{line.text}</Text>
    <Text numberOfLines={1} ellipsizeMode="clip" allowFontScaling={false} style={[style, { flex: 1, marginHorizontal: 3 * scale }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{'.'.repeat(160)}</Text>
    <Text selectable allowFontScaling={false} style={style}>{line.rightText}</Text>
  </View>;
  if (line.align === 'justify') return <View testID={`print-line-${line.id}`} style={[frame, s.justified]} accessible accessibilityLabel={line.text}>
    {line.text.split(/\s+/).map((word, i) => <Text key={i} allowFontScaling={false} style={style}>{word}</Text>)}
  </View>;
  // Preserve the printed emphasis of "Major in:" without italicizing the subjects.
  const major = line.text.startsWith('Major in:');
  return <Text testID={`print-line-${line.id}`} selectable allowFontScaling={false} style={[frame, style, { textAlign: line.align ?? 'left' }]}>{major ? <><Text style={{ fontWeight: '700', fontStyle: 'italic' }}>Major in:</Text>{line.text.slice(9)}</> : line.text}</Text>;
}

/** Actual native text, with stable print coordinates; page photographs are reference inputs only. */
export function DigitizedPage({ layout, label, width, highlight, reduced }: { layout: PageLayout; label: string; width: number; highlight?: Box; reduced: boolean }) {
  const scale = width / layout.width;
  return <View testID={`digitized-page-${label}`} style={{ width, height: layout.height * scale, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
    {highlight && <Animated.View testID="cited-passage-highlight" entering={reduced ? undefined : FadeIn.delay(650).duration(400)} pointerEvents="none" style={{ position: 'absolute', left: highlight.x * width, top: highlight.y * layout.height * scale, width: highlight.width * width, height: highlight.height * layout.height * scale, backgroundColor: '#FFE49B88', borderRadius: 2 }} />}
    {layout.seal && <Image source={require('../../assets/laguna-college-seal.png')} style={{ position: 'absolute', left: layout.seal.x * scale, top: layout.seal.y * scale, width: layout.seal.size * scale, height: layout.seal.size * scale, opacity: layout.seal.opacity ?? 1 }} resizeMode="contain" accessibilityLabel="Laguna College seal" />}
    {layout.lines.map(line => <Line key={line.id} line={line} scale={scale} />)}
    {layout.folio && <Text allowFontScaling={false} style={{ position: 'absolute', top: 1040 * scale, left: 0, width, textAlign: 'center', fontFamily: printFont, fontSize: 21 * scale, color: '#151515', includeFontPadding: false }}>{layout.folio}</Text>}
  </View>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'baseline' }, justified: { flexDirection: 'row', justifyContent: 'space-between' } });
