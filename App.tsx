import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Feather from '@expo/vector-icons/Feather';
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, useReducedMotion } from 'react-native-reanimated';
import type { SQLiteDatabase } from 'expo-sqlite';
import { HandbookReader } from './src/components/HandbookReader';
import { Button } from './src/components/Pressable';
import { Emblem } from './src/components/Emblem';
import { colors, fonts } from './src/theme';
import bundledCorpus from './src/data/handbook.json';
import { openStore, loadCorpus, loadMessages, saveExchange } from './src/storage/database';
import { answerQuestion, resolveSource } from './src/nlp/retrieve';
import type { Corpus, Message, Source } from './src/types';

const initialCorpus = bundledCorpus as Corpus;
const suggestions = [{ text: 'What is the attendance policy?', icon: 'calendar' }, { text: 'What are the school rules?', icon: 'shield' }, { text: 'What are my responsibilities?', icon: 'users' }] as const;
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
function Brand({ compact = false }: { compact?: boolean }) {
  return <View style={compact ? s.brandCompact : s.brand}><Emblem small={compact} /><View><Text style={compact ? s.compactName : s.name}>LC:<Text style={{ color: colors.blue }}>Guide</Text></Text>{!compact && <Text style={s.tagline}>Your Laguna College Handbook Companion</Text>}</View></View>;
}

function Guide() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [corpus, setCorpus] = useState(initialCorpus);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reader, setReader] = useState<{ source?: Source } | null>(null);
  const db = useRef<SQLiteDatabase | null>(null);
  const submitting = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const compact = width < 600;
  const isDemo = corpus.pages.every(p => p.isDemo);
  const init = async () => {
    setError('');
    try {
      db.current = await openStore(initialCorpus);
      const loaded = await Promise.all([loadCorpus(db.current, initialCorpus), loadMessages(db.current)]);
      setCorpus(loaded[0]); setMessages(loaded[1]); setReady(true);
    } catch { setError('The handbook couldn’t open. Tap Retry to try again.'); }
  };
  useEffect(() => { void init(); }, []);
  const ask = async (value: string) => {
    const clean = value.trim();
    if (!clean || !db.current || submitting.current) return;
    if (clean.length > 1000) { setError('Keep your question under 1,000 characters.'); return; }
    submitting.current = true; setBusy(true); setError(''); Keyboard.dismiss();
    try {
      const previousTopic = [...messages].reverse().find(m => m.role === 'guide')?.topic;
      const answer = answerQuestion(clean, corpus, previousTopic);
      const student: Message = { id: id(), role: 'student', text: clean };
      const guide: Message = { id: id(), role: 'guide', text: answer.text, source: answer.source, topic: answer.topic, isDemo: answer.isDemo };
      await saveExchange(db.current, student, guide, answer);
      setMessages(old => [...old, student, guide]); setQuestion('');
    } catch { setError('Your question couldn’t be saved. Please try again.'); }
    finally { submitting.current = false; setBusy(false); }
  };
  const openBook = (source?: Source) => {
    Keyboard.dismiss();
    if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
    setReader({ source });
  };
  const hasConversation = messages.length > 0;
  return <View style={s.screen}>
    <StatusBar style="dark" />
    <LinearGradient colors={['#EEF3FF', '#F9FBFF', '#EFF4FD']} locations={[0, 0.47, 1]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[s.corner, { left: -170, top: -230 }]} /><View pointerEvents="none" style={[s.corner, { right: -220, bottom: -245, width: 430, height: 430 }]} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 14) }}>
      <View style={[s.topbar, { paddingHorizontal: compact ? 23 : 42 }]}><Text style={s.topLabel}>LAGUNA COLLEGE <Text style={{ color: '#BCC7DB' }}> / </Text> SAN PABLO CITY</Text><View style={s.offline}><View style={s.onlineDot} /><Text style={s.offlineText}>Available offline</Text></View></View>
      {hasConversation && <View style={s.chatHeader}><Brand compact /><Button onPress={() => openBook()} style={s.browseMini} accessibilityLabel="Browse student handbook"><Feather name="book-open" size={16} color={colors.ink} /><Text style={s.browseMiniText}>Handbook</Text></Button></View>}
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={[s.scrollContent, { paddingHorizontal: compact ? 24 : 40 }, !hasConversation && { flexGrow: 1, justifyContent: 'center' }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} onContentSizeChange={() => { if (hasConversation) scroll.current?.scrollToEnd({ animated: !reduced }); }}>
        {!hasConversation ? <Animated.View entering={reduced ? undefined : FadeInDown.duration(650)} style={s.welcome}>
          <Brand /><View style={s.bookDivider}><View style={s.dividerLine} /><Feather name="book-open" size={15} color={colors.blue} /><View style={s.dividerLine} /></View>
          <Text style={[s.heading, compact && { fontSize: 31, lineHeight: 39 }]}>How can I help you{compact ? '\n' : ' '}today?</Text><Text style={s.intro}>A little guidance for college life.{'\n'}Ask a question, or find your page in the handbook.</Text>
          <View style={s.suggestions}><Text style={s.suggestionLabel}>A GOOD PLACE TO START</Text>{suggestions.map((item, i) => <Animated.View key={item.text} entering={reduced ? undefined : FadeInDown.delay(160 + i * 70).duration(450)}><Button disabled={!ready || busy} onPress={() => void ask(item.text)} style={s.suggestion} accessibilityLabel={item.text}><View style={s.suggestionIcon}><Feather name={item.icon} size={17} color={colors.blue} /></View><Text style={s.suggestionText}>{item.text}</Text><Feather name="arrow-up-right" size={17} color={colors.blue} /></Button></Animated.View>)}</View>
        </Animated.View> : <View style={s.conversation}>
          <Text style={s.conversationLabel}>YOUR HANDBOOK, IN CONVERSATION</Text>
          {messages.map(message => message.role === 'student' ? <View key={message.id} style={s.studentBubble}><Text style={s.studentText}>{message.text}</Text></View> : <Animated.View key={message.id} entering={reduced ? undefined : FadeInDown.duration(350)} style={s.answer}>
            <View style={s.answerIdentity}><Feather name="book-open" size={15} color={colors.blue} /><Text style={s.answerName}>LC:Guide</Text>{message.isDemo && <Text style={s.demoAnswer}>DEMO PASSAGE</Text>}</View><Text selectable style={s.answerText}>{message.text}</Text>
            {message.source && resolveSource(corpus, message.source) && <Button onPress={() => openBook(message.source)} style={s.sourceButton} accessibilityLabel={`View source on handbook page ${resolveSource(corpus, message.source)!.page.label}`}><Feather name="book-open" size={13} color={colors.blue} /><Text style={s.sourceText}>Source <Text style={{ color: colors.muted }}>· p. {resolveSource(corpus, message.source)!.page.label}</Text></Text><Feather name="arrow-up-right" size={12} color={colors.blue} /></Button>}
          </Animated.View>)}
          {busy && <ActivityIndicator size="small" color={colors.blue} />}<View style={{ height: 20 }} />
        </View>}
      </ScrollView>
      <View style={[s.bottomArea, { paddingHorizontal: compact ? 18 : 40 }]}>
        {!!error && <View style={s.errorRow}><Text accessibilityRole="alert" style={s.error}>{error}</Text>{!ready && <Button onPress={() => void init()} accessibilityLabel="Retry opening handbook"><Text style={s.retry}>Retry</Text></Button>}</View>}
        <Animated.View entering={reduced ? undefined : FadeIn.delay(350).duration(650)} style={s.composerCard}>
          <View style={s.inputRow}><Feather name="message-circle" size={20} color="#90A0BC" /><TextInput style={s.input} placeholder={ready ? 'Ask about your handbook…' : 'Opening your handbook…'} placeholderTextColor="#96A4BB" accessibilityLabel="Ask LC Guide a question" value={question} onChangeText={setQuestion} onSubmitEditing={() => void ask(question)} editable={ready && !busy} maxLength={1000} returnKeyType="send" /><Button style={s.send} disabled={!ready || busy || !question.trim()} onPress={() => void ask(question)} accessibilityLabel="Send question">{busy ? <ActivityIndicator color={colors.white} size="small" /> : <Feather name="arrow-right" size={21} color={colors.white} />}</Button></View>
          {!hasConversation && <View style={s.or}><View style={s.orLine} /><Text style={s.orText}>or take a look inside</Text><View style={s.orLine} /></View>}
          {!hasConversation && <Button style={s.browse} onPress={() => openBook()} disabled={!ready} accessibilityLabel="Browse student handbook"><Feather name="book-open" size={21} color={colors.ink} /><Text style={s.browseText}>Browse student handbook</Text><Feather name="chevron-right" size={18} color={colors.ink} /></Button>}
        </Animated.View>
        <Text style={s.disclaimer}>{isDemo ? 'Demo edition · official handbook pages coming soon' : `Revised 2023 · ${corpus.pages.length} digitized pages`}</Text>
      </View>
    </KeyboardAvoidingView>
    {reader && <HandbookReader corpus={corpus} source={reader.source} onClose={() => setReader(null)} />}
  </View>;
}

export default function App() {
  const [loaded, fontError] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, Lora_400Regular, Lora_600SemiBold });
  if (!loaded && !fontError) return <View style={s.loading}><ActivityIndicator color={colors.blue} /><Text style={s.loadingText}>Opening LC:Guide…</Text></View>;
  return <SafeAreaProvider><Guide /></SafeAreaProvider>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, overflow: 'hidden' }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, gap: 15 }, loadingText: { color: colors.muted, fontSize: 13 }, corner: { width: 350, height: 350, borderRadius: 220, backgroundColor: '#E2EBFC77', position: 'absolute' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 20 }, topLabel: { fontFamily: fonts.medium, fontSize: 8, letterSpacing: 1.1, color: '#8291AF', flexShrink: 1 }, offline: { flexDirection: 'row', alignItems: 'center', gap: 5 }, onlineDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#86A69E' }, offlineText: { fontFamily: fonts.regular, fontSize: 9, color: '#8795AB' },
  scrollContent: { alignItems: 'center', paddingVertical: 18 }, welcome: { width: '100%', maxWidth: 530, alignItems: 'center', paddingBottom: 12 }, brand: { alignItems: 'center', gap: 17, marginBottom: 2 }, name: { fontFamily: fonts.bold, fontSize: 48, letterSpacing: -2, color: colors.ink, textAlign: 'center' }, tagline: { fontFamily: fonts.regular, fontSize: 12, color: '#6D80A6', textAlign: 'center', marginTop: 5 },
  bookDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26, marginBottom: 25 }, dividerLine: { height: 1, width: 33, backgroundColor: '#CFDAEF' }, heading: { fontFamily: fonts.bold, fontSize: 36, lineHeight: 45, letterSpacing: -1.2, color: colors.ink, textAlign: 'center' }, intro: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 23, textAlign: 'center', color: colors.muted, marginTop: 12 },
  suggestions: { width: '100%', marginTop: 32, maxWidth: 420, gap: 10 }, suggestionLabel: { fontFamily: fonts.medium, fontSize: 8, letterSpacing: 1.8, color: '#91A0BA', marginBottom: 2, paddingLeft: 3 }, suggestion: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF0FBCC', paddingVertical: 13, paddingHorizontal: 14, borderRadius: 13, gap: 13, borderWidth: 1, borderColor: '#E6EDFA' }, suggestionIcon: { width: 27, alignItems: 'center' }, suggestionText: { fontFamily: fonts.medium, fontSize: 12, color: '#40567F', flex: 1 },
  bottomArea: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingTop: 7 }, composerCard: { borderRadius: 23, backgroundColor: '#FFFFFFE8', padding: 14, boxShadow: '0 8px 36px #2F5FCB0D', borderWidth: 1, borderColor: '#FFFFFF' }, inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 28, paddingLeft: 17, paddingRight: 5, paddingVertical: 5, gap: 11 }, input: { fontFamily: fonts.regular, color: colors.ink, fontSize: 13, flex: 1, paddingVertical: 10, outlineWidth: 0 }, send: { backgroundColor: colors.blue, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 8px #3F65D826' },
  or: { flexDirection: 'row', alignItems: 'center', gap: 13, marginVertical: 16 }, orLine: { height: 1, backgroundColor: colors.line, flex: 1 }, orText: { fontFamily: fonts.regular, fontSize: 10, color: '#96A1B6' }, browse: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, backgroundColor: '#F0F4FD', borderRadius: 15, gap: 14 }, browseText: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink, flex: 1 }, disclaimer: { fontFamily: fonts.regular, color: '#96A3BA', fontSize: 9, textAlign: 'center', marginTop: 13 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 620, paddingHorizontal: 24, paddingVertical: 10, alignSelf: 'center' }, brandCompact: { flexDirection: 'row', alignItems: 'center', gap: 10 }, compactName: { fontFamily: fonts.bold, fontSize: 23, letterSpacing: -0.8, color: colors.ink }, browseMini: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.white, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: colors.line }, browseMiniText: { fontFamily: fonts.medium, fontSize: 11, color: colors.ink },
  conversation: { width: '100%', maxWidth: 550, gap: 23, paddingTop: 10 }, conversationLabel: { fontFamily: fonts.medium, fontSize: 8, letterSpacing: 1.7, color: '#96A3BA', textAlign: 'center', marginBottom: 4 }, studentBubble: { backgroundColor: '#E6EDFC', borderRadius: 18, borderBottomRightRadius: 5, paddingHorizontal: 17, paddingVertical: 13, alignSelf: 'flex-end', maxWidth: '88%' }, studentText: { fontFamily: fonts.medium, color: colors.ink, fontSize: 13, lineHeight: 21 },
  answer: { alignSelf: 'stretch', paddingHorizontal: 3 }, answerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }, answerName: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink }, demoAnswer: { fontFamily: fonts.medium, color: '#8996AC', fontSize: 7, letterSpacing: 1.1, marginLeft: 6 }, answerText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 25, color: '#43516A' }, sourceButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#EAF0FA', borderRadius: 8, marginTop: 14, borderWidth: 1, borderColor: '#DDE6F6' }, sourceText: { fontFamily: fonts.medium, fontSize: 10, color: colors.blue },
  errorRow: { flexDirection: 'row', gap: 12, paddingBottom: 10, paddingHorizontal: 9, alignItems: 'center' }, error: { fontFamily: fonts.regular, fontSize: 11, color: '#A3574A', flex: 1 }, retry: { fontFamily: fonts.bold, fontSize: 12, color: colors.blue },
});
