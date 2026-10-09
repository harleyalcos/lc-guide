"""Compile real NLTK/WordNet data for an offline Expo runtime. No Python server."""
import json
import re
from pathlib import Path
import nltk
from nltk.corpus import wordnet as wn
from nltk.stem import PorterStemmer, LancasterStemmer, RegexpStemmer, SnowballStemmer, WordNetLemmatizer

ROOT = Path(__file__).resolve().parents[1]
nltk.download('wordnet', quiet=True)
corpus = json.loads((ROOT / 'src/data/handbook.json').read_text())
seed = '''attendance absence absent conduct behavior behaviour responsibility obligation duty library book rule regulation policy class student instructor teacher sanction penalty late tardy permission allowed prohibited permitted forbid ban return borrow enrollment tuition scholarship exam examination grade grading honest honesty respect property uniform dress complaint appeal harassment bullying payment fee graduation hello hi good evil bad dog writing eating eating eats eaten believes believe better children books classes absences responsibilities requirements enrollment requirements enroll attending attended attend absent missing missed miss unexcused excused fail failure fees penalties rules policies schedules schedule lateness tardiness maximum minimum percent percentage day days hours deadline how many much limits need not never no can may number allowed permit prohibit library libraries violation violations misconduct school schools faculty staff work study studying studied studies resource resources regulations duty duties obligation obligations punishment punishments discipline disciplinary behave behavior rights right academic academics learn learning honest honestly permitted prohibited permission return returns returned borrowing borrowed worn wear wearing uniform uniforms dress dresses cost costs pay payments tuition scholarships grades grading graduation graduate graduated students instructor instructors teacher teachers requirements require required completing completed complete announcement announcements announce rooms room late later overdue fine fines sanctions smoking smoke cigarette cigarettes vape vaping alcohol drinking drink food eat foods illness sick illness health sick sickness sick leave absent absence attendance punctuality punctual punctuality unjust excuse excuses punishment punished disrespect disrespectful ask question questions what when where how why which who about more else that it those this patakaran tuntunin pagliban estudyante responsibilidad aklat paaralan bawal puwede pwede pinapayagan hindi klase alituntunin tungkulin asal'''
text = ' '.join(p['text'] for page in corpus['pages'] for p in page['passages'])
fixture_path = ROOT / 'tests/fixtures/demo-handbook.json'
if fixture_path.exists():
    fixture = json.loads(fixture_path.read_text())
    text += ' ' + ' '.join(p['text'] for page in fixture['pages'] for p in page['passages'])
tokens = set(re.findall(r'[a-z]+', (seed + ' ' + text).lower()))
# Curated senses prevent unrelated meanings such as "class" as a social rank.
groups = [
 ('attendance', 'attendance.n.01', ['attendance','attend','presence']),
 ('absence', 'absence.n.01', ['absence','absent','miss']),
 ('conduct', 'behavior.n.01', ['conduct','behavior','behaviour','behave']),
 ('responsibility', 'duty.n.01', ['responsibility','obligation','duty']),
 ('rule', 'rule.n.01', ['rule','regulation']),
 ('book', 'book.n.01', ['book']),
 ('teacher', 'teacher.n.01', ['teacher','instructor']),
 ('penalty', 'punishment.n.01', ['penalty','sanction','punishment']),
]
concepts = []
for label, name, domain_terms in groups:
    syn = wn.synset(name)
    synonyms = sorted({lemma.name().lower() for lemma in syn.lemmas() if '_' not in lemma.name()})
    # Antonyms are recorded for inspection, never added as search synonyms.
    antonyms = sorted({a.name() for lemma in syn.lemmas() for a in lemma.antonyms()})
    terms = sorted(set(synonyms + domain_terms))
    tokens.update(terms)
    concepts.append(dict(label=label, synset=syn.name(), pos=syn.pos(), definition=syn.definition(), examples=syn.examples(), terms=terms, wordnetSynonyms=synonyms, domainAliases=domain_terms, antonyms=antonyms, hypernyms=[s.name() for s in syn.hypernyms()], hyponyms=[s.name() for s in syn.hyponyms()], roots=[s.name() for s in syn.root_hypernyms()]))
porter, lancaster, regexp, snowball, lemmatizer = PorterStemmer(), LancasterStemmer(), RegexpStemmer(r'ing$|ed$|s$', min=4), SnowballStemmer('english'), WordNetLemmatizer()
lemma_overrides = {'absent': 'absence', 'attending': 'attendance', 'attended': 'attendance', 'attend': 'attendance', 'tardiness': 'late', 'tardy': 'late', 'lateness': 'late', 'responsible': 'responsibility'}
entries = {}
for word in sorted(tokens):
    noun = lemmatizer.lemmatize(word, 'n')
    verb = lemmatizer.lemmatize(word, 'v')
    # Favor noun lemmas for handbook topics, verb lemmas for inflected actions.
    lemma = lemma_overrides.get(word, noun if noun != word else verb)
    entries[word] = dict(lemma=lemma, porter=porter.stem(word), lancaster=lancaster.stem(word), regexp=regexp.stem(word), snowball=snowball.stem(word))
for lemma in list({e['lemma'] for e in entries.values()}):
    if lemma not in entries:
        entries[lemma] = dict(lemma=lemma, porter=porter.stem(lemma), lancaster=lancaster.stem(lemma), regexp=regexp.stem(lemma), snowball=snowball.stem(lemma))
output = {'provenance': 'Generated using NLTK and Princeton WordNet; domain aliases are explicitly labeled.', 'words': entries, 'concepts': concepts}
(ROOT / 'src/data/lexicon.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
comparison_words = ['writing','eating','eats','eaten','believes','books','classes','responsibilities']
report = {'stemmers': ['Porter','Lancaster','Regexp','Snowball English'], 'snowballLanguages': list(SnowballStemmer.languages), 'comparison': {w: entries[w] for w in comparison_words}, 'wordnetExample': {'dog': {'synset': wn.synset('dog.n.01').name(), 'definition': wn.synset('dog.n.01').definition(), 'examples': wn.synset('dog.n.01').examples(), 'lemmas': [l.name() for l in wn.synset('dog.n.01').lemmas()], 'hypernyms': [s.name() for s in wn.synset('dog.n.01').hypernyms()], 'hyponyms': [s.name() for s in wn.synset('dog.n.01').hyponyms()], 'roots': [s.name() for s in wn.synset('dog.n.01').root_hypernyms()]}, 'antonyms': {name: [a.name() for l in wn.synset(name).lemmas() for a in l.antonyms()] for name in ('good.n.02','good.a.01')}}}
(ROOT / 'docs/nltk-lab-results.json').write_text(json.dumps(report, indent=2) + '\n')
print(f'Built {len(entries)} word forms and {len(concepts)} WordNet concepts.')
