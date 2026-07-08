# 時事市場方案 3：Design QA

## Comparison Target

- Source visual truth: `/Users/eagleaby/.codex/generated_images/019f3f42-96fc-78c1-ba95-d2407f36ab94/exec-f1e0fec6-48fe-4475-a369-de6d72fac8cd.png`
- Desktop viewport: 1440 x 1024
- Mobile viewport: 390 x 844
- State: current affairs detail `current-event-001`, logged out

## Acceptance Scope

- A1: 事件摘要
- A2: 資料來源與更新時間
- B1: YES / NO 機率走勢圖
- B2: YES / NO 目前機率與 24H 漲跌
- Preserve the existing trade panel and settlement flow.
- Use static deterministic history only; do not connect a new backend API yet.

## Full-view Comparison Evidence

- The implementation preserves the existing UcMarket black, gold, green, and red visual system.
- The selected option 3 hierarchy is present: hero, event title, summary/source row, probability metrics, and full-width chart.
- The existing trade panel remains in the desktop dashboard's right-side 420 px column.
- Desktop measurements: content width 833.30 px, panel width 420 px, and document scroll width equals client width.
- Mobile measurements: main width 352 px, card content width 318 px, and document scroll width equals client width.

## Focused Region Comparison Evidence

- Summary and source/update metadata occupy the left side of the desktop overview.
- YES and NO probability blocks occupy the right side and retain semantic green/red colors.
- At 390 px, the overview and probability blocks collapse to one 318 px column.
- The chart toolbar remains a four-button row and the chart height reduces from 300 px to 250 px.
- The source link remains visually identifiable and opens in a new tab.

## Interaction Verification

- Range controls expose `1日`, `1週`, `1月`, and `全部`.
- Clicking `1週` changes its `aria-pressed` state to `true` and redraws the chart.
- The selected range uses the existing gold active-state token.
- No browser console errors or warnings were observed during desktop verification.

## Findings

- P0: none.
- P1: none after fixing the mobile intrinsic-width overflow.
- P2: none for the selected option 3 scope.
- Typography: existing Inter/system typography and weight hierarchy are retained.
- Spacing: desktop uses a two-column overview; mobile uses a single-column reading order.
- Color: source gold, YES green, and NO red match the existing design tokens.
- Copy: all four requested information groups are visible without changing settlement copy.
- Asset fidelity: the existing current-affairs GIF remains unchanged.

## Patches Made During QA

- Added `min-width: 0` to the current-affairs main column at the mobile breakpoint.
- Reduced current-affairs card padding to 20 px on mobile.
- Confirmed mobile document width is 384 px with no horizontal overflow.

## Build and File Verification

- `npm run build`: passed with Vite 8.1.0; 113 modules transformed.
- `git diff --check`: passed.
- Modified source files were read back after writing.
- Existing Vite chunk-size warning remains informational and outside this design scope.

final result: passed
