# Preparing the original handbook scans

The app reader rebuilds each page as native text. Original photographs are preserved as authoring references. The forty checked page transcriptions live in `handbook-data/digitized/`; run `npm run handbook:digitize` to regenerate the app corpus. This is the final build step after any legacy photo import.

The builder straightens OCR line placement, retains checked line ordering and indentation, and typesets on a 776 × 1110 reference sheet. Covers, contents, and page 3 use explicit coordinates. Page 10 uses explicit table columns. Page 3 follows the user's clean reference, including the board roster's dotted leaders and indented course majors.

Reviewed question-answer passages live in `handbook-data/review/`. The builder checks each selected quotation against the digitized lines and computes new highlight coordinates; photo-coordinate boxes are never reused on typeset pages. Twenty-two complete passages currently supply answers. A digitized page may be browsed and searched even when it has no selected answer passages.

The remaining sections document the reference import and OCR utilities. Running the importer alone generates reference records; run the digitization builder afterward to restore the native text reader corpus.

## Page order and printed labels

Keep the original files in a folder. If filenames are page numbers, natural sorting handles `page-1.png`, `page-2.png`, and `page-10.png`. Downloaded random filenames require an explicit `handbook-index.json` in that folder. Do not guess printed page numbers from the image index: covers and front matter can make them different.

```json
{
  "edition": "Laguna College Student Handbook Revised 2023",
  "pages": [
    { "file": "cover.png", "label": "cover", "title": "Student handbook", "chapter": "Cover" },
    { "file": "scan-a.png", "label": "i", "title": "Contents", "chapter": "Front matter" },
    { "file": "scan-b.png", "label": "1", "title": "Verified heading from this page", "chapter": "Verified chapter" }
  ]
}
```

The index must list every PNG/JPG exactly once with unique labels. Confirm the actual edition from the scans before using the example edition above.

## Local OCR

On macOS, the included Vision script extracts text without an external service:

```sh
swift scripts/ocr-handbook.swift /absolute/path/to/png-folder tmp/handbook-review
```

It creates one JSON sidecar per PNG/JPG. Existing sidecars are preserved to protect review work. OCR output is a draft, and its lines are ordered geometrically. Columns, tables, numbered clauses, hyphenated lines, and references need careful review. Merge lines into complete self-contained paragraphs so a retrieved quotation includes any conditions or exceptions. Store the union of those lines' boxes as the paragraph's box.

The box uses normalized coordinates with a top-left origin. For an image with width W and height H: x = left/W, y = top/H, width = passage-width/W, height = passage-height/H. The importer rejects out-of-bounds boxes and sidecars whose image hash does not match.

```json
{
  "imageSha256": "the exact SHA256 emitted by the OCR script",
  "file": "scan-b.png",
  "passages": [
    {
      "text": "Exact text transcribed and checked against the original image.",
      "verified": true,
      "box": { "x": 0.10, "y": 0.30, "width": 0.78, "height": 0.12 }
    }
  ]
}
```

Mark `verified: true` only after checking the text, policy numbers, negations, conditions, page attribution, and highlight location against the scan. Raw OCR is excluded from answers. The reader displays the checked digitized transcription.

## Import

```sh
npm run handbook:import -- /absolute/path/to/png-folder
# Author and check matching digitized sidecars before this final build:
npm run handbook:digitize
.venv/bin/python scripts/build-lexicon.py
```

Use `--review /absolute/path/to/review-folder` if sidecars are elsewhere. The importer copies PNG/JPGs unchanged into `assets/handbook/` and generates `src/data/handbook.json` and `src/data/pageImages.ts`. It prints the resulting file order and page labels for inspection. Restart Expo after importing assets if Fast Refresh does not pick them up.

Import replaces the demo corpus. When the corpus version changes, SQLite reseeds the pages and clears previous conversation/query records because their citations belong to the old edition. It keeps records across normal restarts when the edition is unchanged. Assets from previous imports are retained for recovery; remove unused assets only after confirming the active corpus.

## Final verification with real scans

Check all 40 images for missing pages, duplicates, rotation, legibility, correct printed labels, and passage boxes. Test source links near the top and bottom of pages, zoom and panning, and long policy paragraphs. Use a separate evaluation set with English and supported Filipino questions, paraphrases, follow-ups, and unanswerable requests. Tune the retrieval threshold using development questions, then measure source-page accuracy and false answers on held-out questions.
