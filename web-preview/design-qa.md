# Design QA — forest writing studio

final result: passed

## Comparison target and evidence

- Source visual truth: `design/selected-studio.png`, the third displayed design selected by the user.
- Implementation: `http://127.0.0.1:5178/?v=3#/hanzi`.
- Viewport: 1487 × 1058 CSS px; source and implementation both 1487 × 1058 pixels; deviceScaleFactor 1. No density rescaling.
- State: 汉字练习, 日月水火, 10 mm cells, 2 mm row gap, normal font, 68%, default colors, auxiliary rows off.
- Initial full-view paired evidence: `../output/playwright/studio-v3-comparison-first.png`.
- Final full-view paired evidence: `../output/playwright/studio-v3-comparison-final.png`.
- Focused setting-ribbon paired evidence: `../output/playwright/studio-v3-ribbon-comparison.png`.
- Desktop screenshot: `../output/playwright/studio-v3-editor-final.png`.
- Responsive evidence: `../output/playwright/studio-v3-mobile-final.png`, `studio-v3-home-mobile.png`, `studio-v3-home-desktop.png` in the same folder.

Source and rendered screenshots were opened and inspected together in the paired images. The focused comparison verifies field labels, typography, spacing, setting controls and action placement.

## Comparison history and fixes

1. [P2] Preview caption below desktop fold. Initial `.preview-bottom` began at y=1046 and extended to y=1084 in the 1058px viewport. Converted desktop shell/editor to flex columns with a flexible scrollable preview stage and a nonshrinking caption. Final caption is y=1020–1058, fully visible.
2. [P2] Parameter labels too small. Initial 10px basic labels reduced readability relative to the reference. Increased desktop labels to 12px, numeric/select values to 13px and group headings to 14px. Final focused comparison confirms improved hierarchy without truncating core fields.
3. [P1] Pattern selection prematurely closed its new dialog. Buttons inherited the containing form's submit behavior. Set `type="button"`; verified successive clicks on W and 1 both append patterns while the dialog stays open, then “选好了” closes it.

No actionable P0/P1/P2 findings remain after the final paired comparison and interaction checks.

## Required fidelity surfaces

- Fonts and typography: interface uses system Chinese sans-serif, with forest headings and clear section hierarchy. Typography and field rhythm match the selected direction. Actual worksheet fonts and rendering logic remain unchanged.
- Spacing/layout: forest left rail, horizontal ten-type strip, three-column ribbon, bottom auxiliary controls, wide centered paper and header export actions follow the chosen composition. Mobile switches to a compact top navigation and responsive settings grid. No horizontal document overflow at 375, 390, 768 or 1024px.
- Colors/tokens: forest #285a4b, mint #edf5f0, ivory active navigation, white paper, subdued borders and shadows. Source's subtle background shading is simplified to a solid mint surface.
- Assets: official Tabler outline icons for leaf/navigation/actions, with license retained. Paper is the real unchanged worksheet canvas. No rasterized UI or placeholder illustration.
- Copy/content: independent homepage and workshop copy replace the earlier reference-like marketing wording. All ten input types, editing labels and existing capabilities remain available.

## Intentional differences required by scope

- Preserve real A4 portrait geometry and all generated grid rows. The concept image depicted a wide cropped paper; the implementation scrolls the true A4 page rather than changing printable output.
- Page margin values remain px, consistent with existing behavior, correcting the concept's misleading mm labels.
- Do not add concept-only zoom, page-turn, bookmarking, extra paper colors or new font-management features. Existing settings/save/export are the requested scope.
- Source's decorative plant silhouette becomes an official outline plant icon; selected leaf motif and rail placement are retained.

## Functional verification

- All ten type pages load with no page script exceptions.
- Engine tests pass; engine.js and data.js SHA-256 hashes exactly match the pre-redesign baseline.
- Verified content editing, pinyin/bishun toggles, advanced bold/offset settings, state restoration after reload.
- Downloaded PDF and PNG; inspected PDF as standard A4 and PNG as 1584 × 2237 pixels.
- 100 characters produce five pages; downloaded PDF contains exactly five A4 pages.
- Verified stroke selection, example editing, adding/removing rows, tone insertion, uppercase/lowercase pairing, local font upload, pinyin correction and page margins.
- Verified 32 pattern buttons and multi-selection with the dialog remaining open.
- Print action produces the dedicated iframe containing the worksheet image and invokes printing. The test stubs the print function; physical printer and OS print dialog remain untested.
- Browser console checked for errors. Responsive homepage and editor screenshots inspected.

## Follow-up polish

- [P3] On narrow screens the four-margin summary is abbreviated; full values remain editable in the margin dialog.
- [P3] Worksheet preview remains portrait and scrollable instead of the concept's shortened page; continue tuning preview density if desired without altering exports.

## Implementation checklist

- [x] Selected visual target saved locally.
- [x] Desktop and mobile UI implemented.
- [x] Full-view and focused paired visual comparisons inspected.
- [x] P1/P2 defects fixed and rechecked.
- [x] Existing functionality and actual exports verified.
- [x] Local preview kept running for review.
