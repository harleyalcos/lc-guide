# Verification recorded on 9 October 2026

The reader uses forty digitized native text pages. The original photographs are preserved as authoring references, and none are included in the exported reader assets. Page 3 follows the supplied clean reference with headings, dotted roster leaders, indented majors, and printed folio 3.

| Check | Result |
| --- | --- |
| TypeScript | `npm run typecheck` passes. |
| Tests | 17 pass: NLP normalization/retrieval, exact quotations, unsupported questions, original byte preservation, bounds for all forty digitized pages, three-column grading tables, and the courses → printed page 3 source mapping. |
| Expo compatibility | Previously passed 21 of 21 Expo Doctor checks; dependencies are unchanged by digitization. |
| Bundling | Android, iOS, and web exports succeed. The exported assets contain fonts, the college seal, and SQLite WASM; no handbook photographs. This does not establish physical-device runtime behavior. |
| Phone-sized browser | Checked at 393 × 852. All forty page layouts were visited; native text line heights checked for accidental wrapping. Grading columns and page 3 were inspected visually. |
| Source flow | Asking about courses returns the checked course text. Source opens printed page 3 and highlights the matching digitized lines after the opening animation. Attendance continues to resolve to printed page 9. |
| Original files | All forty retained photographs still match their original SHA256 hashes. |
| SQLite | The new corpus version replaces old page records. Normal reloads preserve conversations; changing the corpus clears records whose citations refer to the previous version. |

Twenty-two complete answer passages are currently indexed on pages 3, 9, 25, 27, and 28. All forty pages can be browsed and searched, but raw OCR cannot supply answers. More answer-passage selection and a held-out retrieval evaluation remain pending. Tests do not establish an accuracy percentage.

Physical iPhone 16 testing, keyboard behavior, accessibility, and animation performance still require the actual device. The project has an `npm run iphone` command and device instructions in README.
