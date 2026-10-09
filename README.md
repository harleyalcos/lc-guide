# LC:Guide

An offline Expo student handbook companion for Laguna College. Students ask on the home screen or browse the handbook. Each supported answer quotes a reviewed passage and has a small Source button that opens the corresponding digitized handbook page.

All **40 Revised 2023 handbook pages are digitized as native text on white paper**, including covers, contents, printed pages 1–36, Awit ng Laguna College, and The Laguna College Hymn. Headings, list labels, table columns, dotted leaders, indented majors, hymns, and printed page numbers are rebuilt from the originals. Page 3 follows the supplied clean-page reference. Photographs remain unchanged as development references and are not used as reader backgrounds.

Twenty-two complete passages on pages 3, 9, 25, 27, and 28 currently supply answers. Digitizing a page and selecting complete, evaluated answer passages are separate steps; the remaining raw OCR cannot supply answers.

## Run

```sh
npm install
npm start
```

Scan the QR code with a compatible Expo Go app, or use `npm run android` / `npm run ios`. For the browser preview, run `npm run web`. The browser version uses the same SQLite storage; Metro supplies its required isolation headers. A deployed web version also needs those headers, as described in [Expo SQLite documentation](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/).

### Physical iPhone

Install or update [Expo Go](https://apps.apple.com/app/expo-go/id982107779) on the iPhone. The current App Store release supports this project's SDK 57. Keep the Mac and iPhone on the same Wi-Fi network.

Expo Go on a physical iPhone requires the same Expo account on the phone and in Expo CLI. Run these commands from this project in your own terminal; Expo handles credential entry directly:

```sh
npx expo login
npm run iphone
```

Sign in to Expo Go with that same account, then scan the terminal's QR code with the iPhone Camera app and tap the Expo Go banner. Allow local-network access when prompted. Keep the terminal running while testing. The `iphone` command uses port 8082 so the browser preview on port 8081 can remain open. See [Expo's device instructions](https://docs.expo.dev/get-started/start-developing/).

For a quick device check, ask about attendance, tap Source to open printed page 9, turn pages, zoom, return to the conversation, and reload to check SQLite persistence.

## What is implemented

- A welcoming screen based on the supplied navy and pale-blue visual direction, question suggestions, and a handbook button.
- An inline conversation with original passage quotations, source page references, and basic follow-up context.
- A clean fade into the reader, delayed passage highlight, smooth forward/backward paper flips, and return to the conversation. Reduced motion preferences are respected.
- A reader with contents search, printed-page jumps, previous/next navigation, native text page layouts, and 2× zoom with horizontal panning.
- Local SQLite tables for pages, passages, conversations, and query analysis. There are no accounts, remote services, API keys, settings screens, or Python server.
- A real NLTK/WordNet build step and a lightweight TypeScript retrieval engine. See [lesson mapping](docs/lesson-mapping.md).
- An image importer that preserves image bytes, source photographs and page labels. The digitization builder maps reviewed quotations to their matching native text lines. See [scan preparation](docs/handbook-import.md).

## Checks

```sh
npm test
npm run typecheck
npx expo-doctor
npm run export:web
npx expo export --platform ios --platform android --output-dir tmp/native-export
```

Browser interaction checks cover asking, source navigation/highlighting, page turns, contents search, returning to chat, and persistence after reload. Native exports verify bundling; physical-device performance, the software keyboard, and accessibility still need testing on a phone.

## NLP build

Python is a development tool only. The generated lexical data ships with the Expo app.

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/build-lexicon.py
```

The first build downloads WordNet. The student app works offline afterward. `docs/nltk-lab-results.json` includes actual WordNet examples and Porter/Lancaster/Regexp/Snowball comparisons from the lectures.

This is lexical semantic retrieval and extractive question answering. It is not a generative LLM, neural semantic search, or trained chatbot. A suitable formal project title is **LC:Guide An NLP Based Question Answering System for Laguna College Student Handbook Information**.

## Editing digitized pages

Page authoring data lives in `handbook-data/digitized/`. Ordinary pages contain checked text rows; covers, contents, and page 3 have explicit print coordinates; page 10 has an explicit three-column table transcription. Edit these files and run:

```sh
npm run handbook:digitize
.venv/bin/python scripts/build-lexicon.py
npm test
```

Reload Expo Go after regenerating the corpus. The builder checks photograph hashes and requires every reviewed answer to match the digitized text before generating a highlight. Changing the corpus version reseeds SQLite and clears conversations tied to the previous corpus.

Remaining work is selecting and evaluating more complete answer passages and testing the app on a physical iPhone. The demo is retained only as a test fixture; passing tests is not an accuracy estimate for the whole handbook. Filipino support remains a small, curated set of topic aliases.
# lc-guide
