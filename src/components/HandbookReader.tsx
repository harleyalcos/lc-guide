import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Animated, { Easing, FadeIn, FadeInLeft, FadeInRight, ReduceMotion, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { Button } from './Pressable';
import { DigitizedPage } from './DigitizedPage';
import type { Corpus, Source } from '../types';

export function HandbookReader({ corpus, source, onClose }: { corpus: Corpus; source?: Source; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(Math.max(0, corpus.pages.findIndex(p => p.id === source?.pageId)));
  const [contents, setContents] = useState(false);
  const [search, setSearch] = useState('');
  const [pageInput, setPageInput] = useState('');
  const [pageError, setPageError] = useState('');
  const [direction, setDirection] = useState(1);
  const [zoom, setZoom] = useState(1);
  const pageScroll = useRef<ScrollView>(null);
  const horizontalPage = useRef<ScrollView>(null);
  const opening = useSharedValue(reduced ? 1 : 0);
  const closing = useSharedValue(0);
  const page = corpus.pages[index];
  const highlight = page.passages.find(p => p.id === source?.passageId);
  const wide = width > 760;
  const viewportWidth = Math.min(width - (wide ? 132 : 36), 660);
  const paperWidth = viewportWidth * zoom;
  const paperHeight = page.layout ? paperWidth * page.layout.height / page.layout.width : paperWidth / .699;
  useEffect(() => { opening.value = withTiming(1, { duration: reduced ? 0 : 760, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }); }, [opening, reduced]);
  const panelStyle = useAnimatedStyle(() => ({ opacity: 1 - closing.value, transform: [{ perspective: 1200 }, { translateY: (1 - opening.value) * 65 + closing.value * 60 }, { scale: 0.94 + opening.value * 0.06 }, { rotateY: `${(1 - opening.value) * -9}deg` }] }));
  const coverStyle = useAnimatedStyle(() => ({ opacity: 1 - opening.value, transform: [{ perspective: 1000 }, { rotateY: `${-opening.value * 78}deg` }, { translateX: -opening.value * 60 }] }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: opening.value * (1 - closing.value) * 0.48 }));
  const close = () => { closing.value = withTiming(1, { duration: reduced ? 0 : 220 }, finished => { if (finished) runOnJS(onClose)(); }); };
  const turn = (next: number) => {
    if (next < 0 || next >= corpus.pages.length || next === index) return;
    setDirection(next > index ? 1 : -1); setIndex(next); setZoom(1); setContents(false); setPageError('');
  };
  const jump = () => {
    const found = corpus.pages.findIndex(p => p.label.toLowerCase() === pageInput.trim().toLowerCase());
    if (found < 0) { setPageError('That page is not in this edition.'); return; }
    turn(found); setPageInput('');
  };
  const filtered = corpus.pages.filter(p => `${p.title} ${p.chapter} ${p.label} ${p.layout?.lines.map(l => l.text).join(' ') ?? p.passages.filter(t => t.verified).map(t => t.text).join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  if (!page) return null;
  return <Modal transparent animationType="none" onRequestClose={close} statusBarTranslucent>
    <View style={s.modal} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#11254B' }, shadeStyle]} />
      <Animated.View style={[s.reader, wide ? { marginVertical: 30, height: height - 60, maxHeight: height - 60, width: Math.min(width - 80, 880), borderRadius: 24 } : { flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }, panelStyle]}>
        <View style={s.toolbar}>
          <Button onPress={close} style={s.toolButton} accessibilityLabel="Return to conversation"><Feather name="arrow-left" size={21} color={colors.ink} /></Button>
          <View style={{ flex: 1 }}><Text style={s.toolbarTitle}>Student handbook</Text><Text style={s.toolbarSubtitle}>{corpus.edition}</Text></View>
          {page.layout && <Button onPress={() => setZoom(z => z === 1 ? 2 : 1)} style={s.toolButton} accessibilityLabel={zoom === 1 ? 'Zoom into handbook page' : 'Fit handbook page to screen'}><Feather name={zoom === 1 ? 'zoom-in' : 'zoom-out'} size={19} color={colors.ink} /></Button>}
          <Button onPress={() => setContents(!contents)} style={[s.toolButton, contents && { backgroundColor: colors.line }]} accessibilityLabel={contents ? 'Close table of contents' : 'Open table of contents'}><Feather name={contents ? 'x' : 'list'} size={21} color={colors.ink} /></Button>
        </View>
        {page.isDemo && <View style={s.notice}><View style={s.dot} /><Text style={s.noticeText}>Demo pages · not official college policies</Text></View>}
        {!page.isDemo && !page.layout?.reviewed && <View style={s.notice}><Text style={s.noticeText}>Page transcription is being checked</Text></View>}
        {contents ? <View style={s.contents}>
          <Text style={s.contentsTitle}>Find your page.</Text>
          <View style={s.search}><Feather name="search" size={18} color={colors.muted} /><TextInput style={s.searchInput} placeholder="Search the handbook" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} accessibilityLabel="Search handbook contents" /></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {filtered.map(p => <Button key={p.id} onPress={() => { const n = corpus.pages.findIndex(v => v.id === p.id); if (n === index) setContents(false); else turn(n); }} style={s.contentsRow} accessibilityLabel={`Open ${p.title}, page ${p.label}`}><View style={{ flex: 1 }}><Text style={s.chapter}>{p.chapter}</Text><Text style={s.contentsRowTitle}>{p.title}</Text></View><Text style={s.contentsPage}>{p.label}</Text><Feather name="chevron-right" size={17} color={colors.muted} /></Button>)}
            {!filtered.length && <Text style={s.empty}>No pages found. Try another keyword.</Text>}
          </ScrollView>
        </View> : <ScrollView ref={pageScroll} key={page.id} style={{ flex: 1 }} contentContainerStyle={[s.pageScroll, { minHeight: wide ? 510 : undefined }]} showsVerticalScrollIndicator={false} onContentSizeChange={() => { if (highlight?.box && paperHeight) pageScroll.current?.scrollTo({ y: Math.max(0, highlight.box.y * paperHeight - 70), animated: false }); }}>
          {highlight && <Animated.View entering={reduced ? undefined : FadeIn.delay(600).duration(350)} style={s.sourceLabel}><Feather name="corner-down-right" size={14} color={colors.teal} /><Text style={s.sourceLabelText}>The passage behind your answer</Text></Animated.View>}
          <ScrollView ref={horizontalPage} horizontal scrollEnabled={zoom > 1} style={{ width: viewportWidth, flexGrow: 0 }} contentContainerStyle={{ paddingVertical: 3 }} showsHorizontalScrollIndicator={zoom > 1} onContentSizeChange={() => horizontalPage.current?.scrollTo({ x: highlight?.box ? Math.min(paperWidth - viewportWidth, Math.max(0, highlight.box.x * paperWidth - 20)) : 0, animated: false })}>
          <Animated.View key={page.id} entering={reduced ? undefined : (direction > 0 ? FadeInRight : FadeInLeft).duration(320)} style={[s.paper, { width: paperWidth, height: paperHeight }]}>
            {page.layout ? <DigitizedPage layout={page.layout} label={page.label} width={paperWidth} highlight={highlight?.box} reduced={reduced} /> : <View style={{ padding: 30 }}><Text style={s.bookTitle}>{page.title}</Text>{page.passages.map(p => <Text key={p.id} style={s.paragraph}>{p.text}</Text>)}</View>}
            {!reduced && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.openingCover, coverStyle]}><Feather name="book-open" size={44} color="#D5E1FF" /><Text style={s.coverTitle}>LC:Guide</Text><Text style={s.coverCaption}>STUDENT HANDBOOK</Text></Animated.View>}
          </Animated.View>
          </ScrollView>

        </ScrollView>}
        <View style={s.footer}>
          <Button onPress={() => turn(index - 1)} disabled={index === 0} style={s.pageButton} accessibilityLabel="Previous page"><Feather name="chevron-left" size={20} color={colors.ink} /></Button>
          <View style={s.pageJump}><Text style={s.pageCaption}>PAGE</Text><TextInput style={s.pageNumber} value={pageInput || page.label} onChangeText={setPageInput} onSubmitEditing={jump} selectTextOnFocus accessibilityLabel="Go to handbook page" returnKeyType="go" /><Text style={s.pageCaption}>· {index + 1} OF {corpus.pages.length}</Text></View>
          <Button onPress={() => turn(index + 1)} disabled={index === corpus.pages.length - 1} style={s.pageButton} accessibilityLabel="Next page"><Feather name="chevron-right" size={20} color={colors.ink} /></Button>
        </View>
        {!!pageError && <Text accessibilityRole="alert" style={s.pageError}>{pageError}</Text>}
      </Animated.View>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  modal: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reader: { backgroundColor: '#EDF1F8', width: '100%', overflow: 'hidden', boxShadow: '0 24px 90px #081C4438' },
  toolbar: { flexDirection: 'row', alignItems: 'center', padding: 17, gap: 13, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  toolbarTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink }, toolbarSubtitle: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: 3 },
  toolButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, backgroundColor: '#E8EDF7' }, noticeText: { fontFamily: fonts.medium, fontSize: 10, color: '#6C7890' }, dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.muted },
  pageScroll: { alignItems: 'center', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 30 }, sourceLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 }, sourceLabelText: { fontFamily: fonts.medium, fontSize: 11, color: colors.teal },
  paper: { backgroundColor: '#FFFFFF', boxShadow: '0 8px 28px #23396212', overflow: 'hidden' },
  bookTitle: { fontFamily: fonts.bookBold, fontSize: 30, lineHeight: 39, color: colors.ink }, paragraph: { fontFamily: fonts.book, color: '#354056', fontSize: 14, lineHeight: 25 },
  openingCover: { backgroundColor: colors.ink, justifyContent: 'center', alignItems: 'center', gap: 18, borderLeftWidth: 8, borderLeftColor: '#081A3C' }, coverTitle: { fontFamily: fonts.bookBold, color: colors.white, fontSize: 35 }, coverCaption: { fontFamily: fonts.medium, fontSize: 9, letterSpacing: 2.5, color: '#A6B8DC' },
  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 22, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, pageButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sky, borderRadius: 22 }, pageJump: { flexDirection: 'row', alignItems: 'center', gap: 9 }, pageCaption: { fontFamily: fonts.medium, fontSize: 8, letterSpacing: 1, color: colors.muted }, pageNumber: { fontFamily: fonts.book, fontSize: 17, color: colors.ink, minWidth: 29, maxWidth: 65, textAlign: 'center', padding: 4 }, pageError: { fontFamily: fonts.regular, fontSize: 11, textAlign: 'center', color: '#A54D36', paddingBottom: 10, backgroundColor: colors.white },
  contents: { flex: 1, padding: 25 }, contentsTitle: { fontFamily: fonts.bookBold, fontSize: 30, color: colors.ink, marginBottom: 20 }, search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, backgroundColor: colors.white, borderRadius: 12, marginBottom: 16 }, searchInput: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink, flex: 1, paddingVertical: 14, outlineWidth: 0 },
  contentsRow: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: colors.line }, chapter: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted, marginBottom: 5 }, contentsRowTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink }, contentsPage: { fontFamily: fonts.book, fontSize: 19, color: colors.blue }, empty: { fontFamily: fonts.regular, color: colors.muted, fontSize: 13, marginTop: 18 },
});
