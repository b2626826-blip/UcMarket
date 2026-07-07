**Comparison Target**

- Source visual truth: `C:\Users\b2626\AppData\Local\Temp\codex-clipboard-20f0839f-49dd-4e60-8653-0df2548bf11e.png`
- Source ordering reference: `C:\Users\b2626\AppData\Local\Temp\codex-clipboard-40f3ea87-630d-4b58-a077-e9bc5dfc8f78.png`
- Source layout reference: `C:\Users\b2626\AppData\Local\Temp\codex-clipboard-20321e80-5043-4e6b-8ba2-d70b68a1b0ab.png`
- Implementation screenshots: `C:\Users\b2626\AppData\Local\Temp\qa-current-affairs-revision-top.png`, `qa-current-affairs-revision-info.png`, and `qa-current-affairs-revision-order.png`
- Side-by-side evidence: `C:\Users\b2626\AppData\Local\Temp\qa-current-affairs-revision-comparison.png`
- Final banner comparison: `C:\Users\b2626\AppData\Local\Temp\qa-current-affairs-weather-comparison.png`
- Viewport: 1060 x 800 desktop and 390 x 844 mobile
- State: current affairs detail `current-event-001`, logged out

**Findings**

- No actionable P0, P1, or P2 differences remain for the requested revision.
- Fonts and typography: the new white `時事` label uses the existing Inter family at a display weight; the event title is now the primary heading and the market code is secondary.
- Spacing and layout rhythm: the desktop showcase now follows the weather-page reference with a full-width 970 x 360 banner and an overlaid section label, removing the unexplained side gap. Mobile uses a 220 px banner without horizontal overflow.
- Colors and visual tokens: the existing black, white, gold, green, and border tokens remain unchanged.
- Image quality and asset fidelity: the original GIF is used without cropping or distortion and preserves its 360 x 202 aspect ratio.
- Copy and content: `進行中`, `結算時間`, and `結算規則` are grouped inside the current-affairs market card below `交易量`.
- Information order: measured document positions confirm `trade-market-card` precedes `trade-panel-column`, which precedes `current-affairs-related` on both desktop and mobile.

**Full-view Comparison Evidence**

- The final banner comparison shows the weather-page composition translated into a current-affairs banner: full-width media, overlaid section label, then the event heading and market code.
- The lower comparison shows the trade panel before the other-current-affairs grid.

**Focused Region Comparison Evidence**

- The focused market-card capture confirms the status, settlement time, and settlement rule are directly below the volume row and before the trade panel.

**Patches Made Since Previous QA Pass**

- Reworked the showcase into a responsive full-width media banner matching the weather-page reference.
- Swapped the event title and market code hierarchy.
- Moved status and settlement metadata into the market card below volume.
- Added a below-dashboard content slot so the related markets render after the trade panel.

**Implementation Checklist**

- [x] `時事` appears in the annotated left area.
- [x] GIF is enlarged and preserves its aspect ratio.
- [x] Event title appears before the market code.
- [x] Status and settlement information appear below volume.
- [x] Trade panel appears before other current-affairs markets.
- [x] Desktop and mobile layouts do not overflow.
- [x] Production frontend build passes.

**Follow-up Polish**

- None required for the requested scope.

final result: passed
