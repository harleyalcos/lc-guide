# How the NLP lessons apply to LC Guide

The supplied lecture documents are learning references. Their laboratory prompts are not app commands or official handbook policy data. The implementation follows the user's Expo and SQLite constraint and applies the lessons at development time and in the on-device pipeline.

## Chapter 1 Natural language and the NLP lifecycle

| Lesson | Application and evidence |
| --- | --- |
| Problem statement | Students need to find handbook policies in everyday language and verify their source. The home page supports questions and browsing. |
| Collect a corpus | Original handbook PNGs plus reviewed transcriptions, chapter names, printed page labels, and passage locations. Forty original photos are now imported; demonstration content exists only as a test fixture. |
| Analyze corpus quality | Import validates file coverage, unique page labels, image hashes, highlight bounds, and review status. All forty page transcriptions have been checked. Twenty-two complete answer passages are indexed on pages 3, 9, 25, 27, and 28; remaining raw OCR is excluded. Digitization checks every indexed quotation against its native text lines. |
| Preprocess text | `src/nlp/normalize.ts` normalizes case/apostrophes, expands contractions, tokenizes Unicode words, filters stop words while retaining negation, normalizes repeated letters, and applies lemmas. |
| Feature engineering and statistics | Lemmas, Snowball stems, curated lexical concepts, and corpus document frequencies become weighted retrieval features. IDF downweights common terms. Scores are ranking measures, not probabilities. |
| Decide computational techniques | Rule-based normalization and lexical semantic retrieval with extractive answers. These suit the small handbook corpus, local storage, and explainability goal. |
| Apply techniques | `answerQuestion` ranks reviewed passages loaded from SQLite. It quotes original text instead of inventing a policy. |
| Evaluate, tune, repeat | Automated tests check supported topic retrieval, paraphrases, citations, unknown requests, unreviewed OCR, and follow-ups. `RETRIEVAL_THRESHOLD` is explicit. Tests now check real page references and source quotations as well. A separate held-out evaluation and broader answer-passage selection remain pending. |
| NLP applications | Question answering, topic grouping in the contents view, lexical search, and conversational input. Speech recognition, translation, sentiment analysis, robotics, automatic title generation, neural text generation, and the other listed applications are overview examples rather than requirements for this handbook app. |
| Python and NLP tools | `scripts/build-lexicon.py` uses real NLTK and WordNet to compile data for the Expo app. It is a build tool, not a Python backend. |
| Machine learning overview | No machine-learning model is trained or claimed. The lecture's lifecycle explicitly permits rule-based techniques. This choice can be revisited after a real evaluation dataset exists. |

## Chapter 5 WordNet

`scripts/build-lexicon.py` reads actual WordNet synsets. `src/data/lexicon.json` preserves the selected sense's name, POS, definition, examples, lemma names, antonyms, hypernyms, hyponyms, and root hypernyms. WordNet synonyms and manually added handbook aliases are labeled separately. Sense selection is curated to avoid unrelated meanings.

On-device query expansion uses those selected synonym groups, allowing questions such as “What are my duties?” to find student responsibilities. Antonyms are stored for inspection and never treated as interchangeable search synonyms. Hierarchies, definitions, and examples are available in the generated data and reproduced in `docs/nltk-lab-results.json` using the lecture's dog and good/evil/bad examples; unrestricted hypernym expansion is deliberately avoided because it can retrieve unrelated policies.

## Chapter 6 Stemming and lemmatization

The build script runs all four actual NLTK algorithms: PorterStemmer, LancasterStemmer, RegexpStemmer, and SnowballStemmer. Every generated word record includes their outputs. The laboratory report compares `writing`, `eating`, `eats`, `eaten`, `believes`, `books`, `classes`, and `responsibilities` and records the installed Snowball language list.

The app uses the English Snowball stem for ranking and WordNet noun/verb lemmas for topic identity. It does not run four competing stemmers sequentially on the same token. Stem-only similarities have lower weight, and a matching stem cannot independently establish a topic: “response” and “responsibility” can share a stem. Context-specific domain lemma overrides are explicit in the generator. These bounded lookups do not amount to a general POS tagger or unrestricted runtime WordNet lemmatizer.

## Chapter 7 Word replacement

`expandContractions` applies regular-expression replacements before tokenization, including straight and curly apostrophes. “Can’t” becomes “can not”; negation survives stop-word filtering. Pronoun contractions are distinguished from possessives instead of converting every apostrophe-s to “is”.

`removeRepeats` reduces repeated letters until it reaches a known word, following the lecture's dictionary-protected approach. It normalizes “helloooooooo” and “hiiiiiii” while preserving real doubled letters in “class” and “books”. Unknown names are preserved if no known candidate is found. A small, labeled Filipino alias set provides topic normalization; this is not full Filipino translation.

## Source grounding and limits

Every supported response stores the page ID and passage ID that supplied its exact quotation. The reader uses the matching digitized page, its printed page label, and a passage box computed from exact matching text lines. Photographs are authoring references, not page backgrounds. Source taps open the native text page with a clean fade and delayed highlight. Page navigation flips the paper while the reader interface stays stationary.

Unreviewed OCR and unknown topics cannot supply answers. Demo requests for limits, costs, deadlines, or penalties are declined. A real handbook still needs complete, reviewed paragraphs and a measured evaluation set: retrieval may select a relevant passage without answering every nuance of a complex question. The app does not infer new rules from negation or generate policy interpretations.

## Supplied references

- `NLP-Chapter-1.pdf` from `/Users/harleyalcos/Downloads/`
- `ITE-P402-Chapter-5-Lecture-Lab.docx.pdf` from `/Users/harleyalcos/Downloads/`
- `ITE-P402-Chapter-6-Lecture.docx` from `/Users/harleyalcos/Downloads/`
- `ITE-P402-Chapter-7-Lecture.docx` from `/Users/harleyalcos/Downloads/`

Text extraction and the Chapter 1 diagram pages were inspected locally. The source files were not changed.
