# Design Unification Specification
**Project**: Financial Event API
**Version**: 3.0
**Last Updated**: 2025-12-03
**Status**: 🔄 IN PROGRESS

---

## 📋 Executive Summary

This document defines the complete design unification specification for the Financial Event API project. The goal is to unify all pages to match the apiGuide design system while maintaining 100% of existing functionality.

### Current Status
- ✅ **Phase 1 Complete**: Top navigation bar added to all pages
- ✅ **Phase 2 Complete**: Home page created and routing updated
- 🔄 **Phase 3 In Progress**: Design system unification
- ⏳ **Phase 4 Pending**: Global status widget implementation

---

## 🎯 Project Goals

### Primary Objectives
1. **Visual Consistency**: All pages must use identical design system
2. **Functional Preservation**: Zero loss of existing features or content
3. **Navigation Enhancement**: Unified top navigation with Home button
4. **Status Monitoring**: Global status widget in all sidebars
5. **Responsive Design**: Mobile-friendly across all pages

### Success Criteria
- [ ] All pages use apiGuide color palette
- [ ] All content boxes have identical border styles
- [ ] All fonts and spacing are consistent
- [ ] Home button appears on far right of nav bar
- [ ] Status widget appears in all page sidebars
- [ ] No functionality is broken or removed

---

## 📁 Project Structure

### Routes (Current)
```
GET /                    → home.js (NEW - Phase 2 ✅)
GET /apiguide            → apiGuide.js (MOVED from / - Phase 2 ✅)
GET /control             → control.js (has sidebar + content)
GET /tracker             → tracker.js (needs redesign)
GET /proceeding          → proceeding.js (needs redesign)
GET /dashboard           → dashboard.js (has sidebar, needs redesign)
GET /pattern             → pattern.js (has sidebar, needs redesign)
```

### File Locations
```
src/
├── index.js                              # Main server file
├── api/endpoints/
│   ├── home.js                           # ✅ NEW - Landing page
│   ├── apiGuide.js                       # ✅ REFERENCE - Design source
│   ├── control.js                        # ✅ REFERENCE - Similar design
│   ├── tracker.js                        # 🔄 NEEDS REDESIGN
│   ├── proceeding.js                     # 🔄 NEEDS REDESIGN
│   ├── dashboard.js                      # 🔄 NEEDS REDESIGN
│   └── pattern.js                        # 🔄 NEEDS REDESIGN
```

---

## 🎨 Design System (Reference: apiGuide.js)

### Color Palette
```css
/* Background Colors */
--bg-page: #999999;              /* Main page background (grey) */
--bg-content: #ffffff;           /* Content boxes (white) */
--bg-sidebar: #2b2b2b;          /* Sidebar background (dark) */
--bg-sidebar-item: #1a1a1a;    /* Sidebar hover/active */

/* Text Colors */
--text-primary: #111111;        /* Main text (black) */
--text-secondary: #666666;      /* Secondary text (grey) */
--text-muted: #888888;          /* Muted text (light grey) */
--text-sidebar: #e0e0e0;        /* Sidebar text (light) */

/* Border Colors */
--border-default: #dddddd;      /* Standard borders */
--border-light: #eeeeee;        /* Light dividers */
--border-dark: #cccccc;         /* Emphasized borders */
--border-sidebar: #3a3a3a;      /* Sidebar borders */

/* Accent Colors */
--accent-blue: #0066cc;         /* Primary actions, links */
--accent-blue-hover: #0052a3;   /* Hover state */
--accent-success: #2e7d32;      /* Success states */
--accent-error: #c62828;        /* Error states */
--accent-warning: #f57f17;      /* Warning states */

/* Top Navigation (consistent across all pages) */
--nav-bg: #2b2b2b;              /* Top nav background */
--nav-border: #1a1a1a;          /* Top nav border */
--nav-text: #c0c0c0;            /* Nav link text */
--nav-text-hover: #ffffff;      /* Nav link hover */
--nav-active: #0066cc;          /* Active nav link */
```

### Typography
```css
/* Font Family */
font-family: 'Noto Sans KR', 'Noto Sans', sans-serif;

/* Font Sizes */
--font-size-h1: 1.8rem;         /* Page title */
--font-size-h2: 1.3rem;         /* Section title */
--font-size-h3: 1.1rem;         /* Subsection title */
--font-size-body: 0.95rem;      /* Body text */
--font-size-small: 0.85rem;     /* Small text */
--font-size-code: 0.88rem;      /* Code blocks */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line Heights */
--line-height-normal: 1.7;
--line-height-tight: 1.4;
```

### Spacing System
```css
/* Padding */
--padding-xs: 4px;
--padding-sm: 8px;
--padding-md: 12px;
--padding-lg: 16px;
--padding-xl: 20px;
--padding-2xl: 24px;
--padding-3xl: 32px;

/* Margins */
--margin-sm: 8px;
--margin-md: 16px;
--margin-lg: 24px;
--margin-xl: 32px;

/* Border Radius */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
```

---

## 📐 Layout Consistency Standards

### Purpose
모든 페이지에서 일관된 폭, 여백, 패딩을 사용하여 시각적 통일성을 제공합니다.

### Layout Types

#### Type A: Sidebar Layout (apiGuide, control, dashboard, pattern)
사이드바가 있는 페이지의 표준 레이아웃

```css
/* Sidebar - 고정 위치, 일관된 너비 */
.toc-sidebar, .sidebar {
  width: 280px;
  position: fixed;
  top: 60px;
  left: 0;
  height: calc(100vh - 60px);
  padding: 24px 16px;
  overflow-y: auto;
}

/* Main Content Area - 사이드바 너비만큼 여백 */
.content-wrapper, .main-content {
  margin-left: 280px;
  padding: 32px;
  min-height: calc(100vh - 60px);
}

/* Optional: 콘텐츠 최대 너비 제한 */
.content-wrapper .container {
  max-width: 1200px;
  margin: 0 auto;
}
```

#### Type B: Full Width Layout (home, tracker, proceeding)
사이드바가 없는 페이지의 표준 레이아웃

```css
/* Container - 중앙 정렬, 최대 너비 제한 */
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 48px 24px;
}

/* Note: tracker와 proceeding은 추후 사이드바 추가 예정 */
```

### Component Spacing Standards

#### Content Boxes
모든 카드와 섹션 블록은 동일한 스타일 사용

```css
/* 기본 콘텐츠 박스 */
.section-block, .card {
  background: #ffffff;
  border: 1px solid #dddddd;
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 24px;
}

/* 카드 헤더 (있는 경우) */
.card-header {
  padding: 20px 24px;
  border-bottom: 1px solid #dddddd;
  margin: -20px -20px 20px -20px; /* 부모 padding 상쇄 */
}

/* 카드 바디 (헤더가 있는 경우) */
.card-body {
  padding: 24px;
}

/* 헤더 없이 바디만 있는 경우 */
.card:has(.card-body:only-child) {
  padding: 0;
}
```

#### Page Headers
페이지 상단 제목 영역의 일관된 여백

```css
.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.page-description {
  font-size: 0.95rem;
  color: #666666;
  line-height: 1.6;
}
```

#### Section Spacing
섹션 간 일관된 간격

```css
/* 섹션 제목 */
h2.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-top: 48px;
  margin-bottom: 16px;
}

h3.subsection-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 32px;
  margin-bottom: 12px;
}

/* 첫 번째 섹션은 상단 여백 없음 */
h2.section-title:first-of-type,
h3.subsection-title:first-of-type {
  margin-top: 0;
}
```

#### Form Elements
입력 폼 요소들의 일관된 여백

```css
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 0.9rem;
}

.form-input, .form-select, .form-textarea {
  padding: 10px 12px;
  border: 1px solid #dddddd;
  border-radius: 6px;
  font-size: 0.95rem;
}
```

#### Button Spacing
버튼 그룹의 일관된 간격

```css
.button-group {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.button {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
}
```

### Responsive Breakpoints

```css
/* 태블릿 (1024px 이하) */
@media (max-width: 1024px) {
  .content-wrapper, .main-content {
    padding: 24px;
  }
  
  .container {
    padding: 32px 20px;
  }
}

/* 모바일 (768px 이하) */
@media (max-width: 768px) {
  .content-wrapper, .main-content {
    margin-left: 0;
    padding: 20px 16px;
  }
  
  .container {
    padding: 24px 16px;
  }
  
  .section-block, .card {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .card-header, .card-body {
    padding: 16px;
  }
}

/* 소형 모바일 (480px 이하) */
@media (max-width: 480px) {
  .content-wrapper, .main-content {
    padding: 16px 12px;
  }
  
  .container {
    padding: 20px 12px;
  }
}
```

### Grid Systems

#### Stats Grid (대시보드 통계 카드)
```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

#### Cards Grid (홈 페이지 카드 레이아웃)
```css
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

### Verification Checklist

레이아웃 표준화 완료 후 각 페이지에서 확인:

#### Sidebar Pages (apiGuide, control, dashboard, pattern)
- [ ] Sidebar width is exactly 280px
- [ ] Sidebar top position is 60px (below nav)
- [ ] Sidebar padding is 24px 16px
- [ ] Main content margin-left is 280px
- [ ] Main content padding is 32px
- [ ] All cards have padding: 20px
- [ ] All cards have margin-bottom: 24px
- [ ] Card borders are 1px solid #dddddd
- [ ] Card border-radius is 6px
- [ ] Page header margin-bottom is 32px

#### Full Width Pages (home)
- [ ] Container max-width is 1400px
- [ ] Container padding is 48px 24px
- [ ] Container is centered (margin: 0 auto)
- [ ] All cards follow same spacing rules
- [ ] Responsive breakpoints work correctly

#### Common Elements (All Pages)
- [ ] Page titles have margin-bottom: 12px
- [ ] Section titles have margin-top: 48px, margin-bottom: 16px
- [ ] Form groups have margin-bottom: 20px
- [ ] Button groups have gap: 12px
- [ ] Mobile view adjusts padding correctly

### Implementation Priority

1. ✅ **SPEC Documentation** - 표준 정의 완료
2. ✅ **apiGuide.js** - 레이아웃 표준 적용 완료
3. ✅ **control.js** - 레이아웃 표준 적용 완료
4. ✅ **dashboard.js** - 레이아웃 표준 적용 완료
5. ✅ **pattern.js** - 레이아웃 표준 적용 완료
6. ✅ **home.js** - 레이아웃 표준 적용 완료
7. ✅ **tracker.js** - 레이아웃 표준 적용 완료 (사이드바 이미 추가됨)
8. ✅ **proceeding.js** - 레이아웃 표준 적용 완료 (사이드바 이미 추가됨)

### Layout Standardization Summary (2025-12-03)

모든 페이지에 다음 표준이 적용되었습니다:

**사이드바 페이지 (apiGuide, control, dashboard, pattern, tracker, proceeding):**
- Sidebar width: 280px
- Sidebar position: top: 60px, height: calc(100vh - 60px)
- Sidebar padding: 24px 16px
- Content margin-left: 280px
- Content padding: 32px
- Card padding: 20px
- Card margin-bottom: 24px
- Border-radius: 6px (모든 카드)

**전체 폭 페이지 (home):**
- Container max-width: 1400px
- Container padding: 48px 24px
- Card border-radius: 6px

**일관성 달성:**
✅ 모든 사이드바 너비 통일 (280px)
✅ 모든 콘텐츠 영역 패딩 통일 (32px)
✅ 모든 카드 패딩 통일 (20px)
✅ 모든 카드 마진 통일 (margin-bottom: 24px)
✅ 모든 border-radius 통일 (6px)

### Content Container Standardization (2025-12-03)

**문제점:**
1. 라우터마다 컨텐츠의 폭이 모두 다름
2. 회색 배경에 직접 텍스트가 있어 가독성 저하
3. apiGuide처럼 div 박스 안에 내용을 담지 않음

**해결책:**
모든 페이지에 일관된 container 구조 적용

```css
.container {
  max-width: 1200px;        /* 모든 페이지 통일 */
  margin: 0 auto;           /* 중앙 정렬 */
  background: #f3f3f3;      /* 밝은 회색 박스 */
  padding: 32px 32px 40px;  /* 일관된 패딩 */
  border-radius: 6px;       /* 둥근 모서리 */
  border: 1px solid #dedede; /* 테두리 */
}
```

**적용 현황:**
- ✅ **apiGuide**: 이미 완벽한 구조 (참조 기준)
- ✅ **control**: max-width 1400px → 1200px 변경, 패딩 통일
- ✅ **tracker**: 배경색, 패딩, 테두리 추가
- ✅ **proceeding**: 배경색, 패딩, 테두리 추가
- ✅ **dashboard**: text-muted 색상 수정 (#999999 → #888888)
- ✅ **pattern**: 카드 기반 레이아웃으로 가독성 양호
- ✅ **home**: 독립적인 레이아웃, 별도 기준 적용

**가독성 개선:**
- 회색 배경(#999999) 위에 밝은 회색 박스(#f3f3f3) 배치
- 박스 안에 검은색 텍스트(#111111)로 명확한 대비
- text-muted 색상을 배경색과 구분되도록 조정
- 모든 콘텐츠가 테두리가 있는 박스 안에 위치

**결과:**
✅ 모든 페이지 컨텐츠 폭 1200px로 통일
✅ 모든 페이지 가독성 개선 (밝은 박스 안에 어두운 텍스트)
✅ 시각적 일관성 확보 (apiGuide 스타일 적용)

### Common Issues

#### Issue: Inconsistent Card Padding
**Problem**: 일부 카드는 padding: 16px, 다른 카드는 padding: 24px
**Solution**: 모든 `.card`와 `.section-block`에 `padding: 20px` 통일

#### Issue: Irregular Margins
**Problem**: 요소 간 margin이 8px, 12px, 16px, 20px 등 제각각
**Solution**: 표준 여백 사용 - margin-bottom: 24px (기본), 48px (섹션 구분)

#### Issue: Content Width Inconsistency
**Problem**: 사이드바가 있는 페이지의 content-wrapper margin-left가 260px, 280px, 300px 등으로 다름
**Solution**: 모든 페이지 `margin-left: 280px`로 통일 (사이드바 width와 일치)

#### Issue: Responsive Breaking
**Problem**: 모바일에서 사이드바와 콘텐츠가 겹침
**Solution**: 768px 이하에서 `margin-left: 0`, 사이드바는 오프캔버스로 전환

### Box Styles
```css
/* Standard Content Box (apiGuide style) */
.section-block {
  background: #ffffff;
  border: 1px solid #dddddd;
  border-radius: 6px;
  padding: 20px;
  margin-top: 30px;
}

/* Card Style */
.card {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 16px;
}

/* Note/Info Box */
.note {
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  background: #fafafa;
  margin: 10px 0 16px;
  font-size: 0.94rem;
}

/* Code Block */
code {
  font-family: ui-monospace, monospace;
  background: #f5f5f5;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.88rem;
}
```

---

## 🧩 Common Components

### 1. Top Navigation Bar

**Location**: Fixed at top of every page
**Height**: 60px
**z-index**: 3000

#### HTML Structure
```html
<nav class="top-nav">
  <a href="/" class="top-nav-brand">📊 Financial API</a>
  <button class="top-nav-toggle" onclick="...">☰</button>
  <div class="top-nav-links">
    <a href="/apiguide" class="top-nav-link [active]">API Guide</a>
    <a href="/control" class="top-nav-link">Control</a>
    <a href="/tracker" class="top-nav-link">Tracker</a>
    <a href="/proceeding" class="top-nav-link">Proceeding</a>
    <a href="/dashboard" class="top-nav-link">Dashboard</a>
    <a href="/pattern" class="top-nav-link">Pattern</a>
    <a href="/" class="top-nav-link" style="margin-left: auto;">🏠 Home</a>
  </div>
</nav>
```

#### Required CSS (identical across all pages)
```css
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #2b2b2b;
  border-bottom: 1px solid #1a1a1a;
  z-index: 3000;
  display: flex;
  align-items: center;
  padding: 0 24px;
}

body {
  padding-top: 60px; /* CRITICAL: Prevents content overlap */
}
```

#### Verification Checklist
- [ ] Top nav is present on every page
- [ ] Home button is on far right (margin-left: auto)
- [ ] Active page has `.active` class
- [ ] API key parameter is preserved in links (where needed)
- [ ] Mobile hamburger menu works (< 900px width)

---

### 2. Sidebar Layout (for pages with sidebars)

**Pages with sidebars**: apiGuide, control, dashboard, pattern

#### Structure
```css
.page-wrapper {
  display: flex;
  min-height: 100vh;
}

.toc-sidebar, .sidebar {
  width: 280px;
  background: #2b2b2b;
  color: #e0e0e0;
  position: fixed;
  top: 60px; /* Below top nav */
  left: 0;
  height: calc(100vh - 60px);
  overflow-y: auto;
  padding: 24px 16px;
  border-right: 1px solid #1a1a1a;
  z-index: 1000;
}

.content-wrapper {
  margin-left: 280px; /* Sidebar width */
  flex: 1;
  background: #999999; /* Page background */
  padding: 32px;
}
```

#### Sidebar Color Rules
```css
/* Sidebar background and text */
background: #2b2b2b;
color: #e0e0e0;

/* Sidebar links */
.nav-item, .toc-link {
  color: #c0c0c0;
}

.nav-item:hover, .toc-link:hover {
  background: #3a3a3a;
  color: #ffffff;
}

.nav-item.active, .toc-link.active {
  background: #0066cc;
  color: #ffffff;
}
```

---

### 3. Global Status Widget (TO BE IMPLEMENTED)

**Requirement**: Add to bottom of all sidebars

#### Location
- Pages with sidebars: Bottom of sidebar (fixed or absolute positioning)
- Pages without sidebars: Create minimal sidebar with status widget

#### Purpose
Display real-time status of any API operation:
- Progress percentage
- Time remaining (ETA)
- Success/Failed/Skipped/Updated counts
- Current operation log
- Action buttons (Proceed/Cancel)

#### Design (based on proceeding.js status panel)
```html
<div class="status-widget">
  <div class="status-header">
    <div class="status-title">
      <div class="spinner" id="statusSpinner" style="display:none;"></div>
      <span id="statusTitle">⏸️ Idle</span>
    </div>
  </div>

  <div class="status-body">
    <!-- Progress Bar -->
    <div class="status-progress">
      <div class="status-progress-bar">
        <div class="status-progress-fill" id="statusProgressFill"></div>
      </div>
      <div class="status-progress-info">
        <span id="statusProgressText">0/0 (0%)</span>
        <span id="statusEta">Ready</span>
      </div>
    </div>

    <!-- Stats -->
    <div class="status-stats">
      <span class="status-stat">✅ Success: <strong id="statSuccess">0</strong></span>
      <span class="status-stat">❌ Failed: <strong id="statFailed">0</strong></span>
      <span class="status-stat">⏭️ Skipped: <strong id="statSkipped">0</strong></span>
      <span class="status-stat">🔄 Updated: <strong id="statUpdated">0</strong></span>
    </div>

    <!-- Log (expandable) -->
    <details class="status-log">
      <summary>View Logs</summary>
      <div class="log-content" id="statusLog">No activity</div>
    </details>
  </div>
</div>
```

#### CSS Styling
```css
.status-widget {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border-top: 1px solid #3a3a3a;
  padding: 16px;
  font-size: 0.85rem;
  max-height: 400px;
  overflow-y: auto;
}

.status-widget.running {
  border-top-color: #0066cc;
}
```

---

## 📄 Page-by-Page Status

### ✅ Home Page (`/`)
**File**: `src/api/endpoints/home.js`
**Status**: ✅ COMPLETE

#### Current State
- Landing page with card grid
- Links to all sections
- Uses apiGuide design system
- Top navigation with Home button active

#### No Further Action Required

---

### ✅ API Guide (`/apiguide`)
**File**: `src/api/endpoints/apiGuide.js`
**Status**: ✅ REFERENCE DESIGN (minimal updates needed)

#### Current State
- Light theme with grey background (#999999)
- White content boxes (#ffffff)
- Left sidebar with table of contents (#2b2b2b)
- Top navigation present with Home button ✅

#### Required Updates
- [ ] Add status widget to bottom of sidebar
- [ ] Ensure all CSS variables match design system

#### Design Elements (Reference)
```css
body {
  background: #999999; /* ✅ Correct */
}

.section-block {
  background: #ffffff; /* ✅ Correct */
  border: 1px solid #dddddd; /* ✅ Correct */
  border-radius: 6px;
  padding: 20px;
}

.toc-sidebar {
  background: #2b2b2b; /* ✅ Correct */
  color: #e0e0e0; /* ✅ Correct */
}
```

---

### ✅ Control Panel (`/control`)
**File**: `src/api/endpoints/control.js`
**Status**: ✅ MOSTLY COMPLETE (minor tweaks needed)

#### Current State
- Very similar to apiGuide design
- Has left sidebar (#2b2b2b) ✅
- Light background ✅
- Top navigation with Home button ✅

#### Minor Issues to Fix
```css
/* Current (slightly off) */
.section-block {
  background: #fff; /* Should be #ffffff (no difference, just consistency) */
  border: 1px solid #ddd; /* Should be #dddddd */
}

.config-card {
  background: #fafafa; /* ✅ Correct */
  border: 1px solid #e0e0e0; /* ✅ Correct */
}
```

#### Required Updates
- [ ] Verify all borders use `#dddddd` (not `#ddd`)
- [ ] Add status widget to bottom of sidebar
- [ ] Ensure API key is preserved in navigation links

---

### 🔄 Tracker (`/tracker`)
**File**: `src/api/endpoints/tracker.js`
**Status**: 🔄 NEEDS MAJOR REDESIGN

#### Current State (INCORRECT)
```css
:root {
  --bg-dark: #0d1117;        /* ❌ Wrong - should be #999999 */
  --bg-card: #161b22;        /* ❌ Wrong - should be #ffffff */
  --bg-input: #0d1117;       /* ❌ Wrong - should be #fafafa or #ffffff */
  --border: #30363d;         /* ❌ Wrong - should be #dddddd */
  --text: #c9d1d9;           /* ❌ Wrong - should be #111111 */
  --text-muted: #8b949e;     /* ❌ Wrong - should be #666666 */
}

body {
  background: var(--bg-dark); /* ❌ Dark theme */
}
```

#### Required Changes
1. **Replace entire color system** with apiGuide palette
2. **Add sidebar** (currently has none) - use apiGuide TOC sidebar style
3. **Move status widget** from proceeding.js to sidebar
4. **Restructure layout** to match apiGuide:
   - Left sidebar (280px fixed)
   - Main content area with 32px padding
   - Grey background (#999999)

#### Target Structure
```html
<body>
  <nav class="top-nav">...</nav>

  <div class="page-wrapper">
    <aside class="toc-sidebar">
      <!-- Navigation items -->
      <div class="toc-title">Price Tracker</div>
      <ul class="toc-list">
        <li><a href="#upload">📁 File Upload</a></li>
        <li><a href="#input">✏️ Direct Input</a></li>
        <li><a href="#preview">👁️ Preview</a></li>
        <li><a href="#results">📊 Results</a></li>
      </ul>

      <!-- Status widget at bottom -->
      <div class="status-widget">...</div>
    </aside>

    <div class="content-wrapper">
      <div class="container">
        <h1>📊 Price Tracker</h1>
        <!-- Existing content in white boxes -->
      </div>
    </div>
  </div>
</body>
```

#### Detailed Color Migration
```css
/* OLD (Dark) → NEW (Light) */
--bg-dark: #0d1117       → #999999 (page background)
--bg-card: #161b22       → #ffffff (content boxes)
--bg-input: #0d1117      → #fafafa (input backgrounds)
--border: #30363d        → #dddddd (borders)
--border-focus: #58a6ff  → #0066cc (focus states)
--text: #c9d1d9          → #111111 (main text)
--text-muted: #8b949e    → #666666 (secondary text)
--text-bright: #f0f6fc   → #111111 (bright text)
--accent: #58a6ff        → #0066cc (accent color)
--success: #3fb950       → #2e7d32 (success color)
--error: #f85149         → #c62828 (error color)
--warning: #d29922       → #f57f17 (warning color)
```

#### Functional Requirements
- ✅ Keep ALL file upload functionality
- ✅ Keep ALL form inputs and validation
- ✅ Keep ALL preview table features
- ✅ Keep ALL result display logic
- ✅ Keep ALL JavaScript functionality
- ❌ Change ONLY visual styling

---

### 🔄 Proceeding (`/proceeding`)
**File**: `src/api/endpoints/proceeding.js`
**Status**: 🔄 NEEDS MAJOR REDESIGN

#### Current State (INCORRECT)
```css
:root {
  --bg-dark: #0d1117;        /* ❌ Wrong */
  --bg-card: #161b22;        /* ❌ Wrong */
  /* Same dark theme as tracker */
}

/* Has status panel in main content area */
.status-panel { /* ❌ Should be in sidebar */ }
```

#### Required Changes
1. **Replace entire color system** with apiGuide palette
2. **Add sidebar** (currently has none)
3. **Move status panel** from main content to sidebar bottom
4. **Restructure layout** to match apiGuide

#### Special Note
This page has the REFERENCE status panel implementation that should be extracted and made into the global status widget.

#### Target Structure
```html
<body>
  <nav class="top-nav">...</nav>

  <div class="page-wrapper">
    <aside class="toc-sidebar">
      <div class="toc-title">Proceeding</div>
      <ul class="toc-list">
        <li><a href="#tracker">📊 Price Tracker</a></li>
        <li><a href="#analyst">⭐ Analyst Operations</a></li>
      </ul>

      <!-- MOVE status panel here -->
      <div class="status-widget">
        <!-- Extract from current status-panel -->
      </div>
    </aside>

    <div class="content-wrapper">
      <!-- Existing content in white boxes -->
    </div>
  </div>
</body>
```

#### Color Migration (same as tracker)

---

### 🔄 Dashboard (`/dashboard`)
**File**: `src/api/endpoints/dashboard.js`
**Status**: 🔄 NEEDS REDESIGN

#### Current State (PARTIALLY CORRECT)
- ✅ Has sidebar (good structure)
- ❌ Dark theme (#0d1117 background)
- ❌ Dark sidebar (#1a1a2e)
- ✅ Top navigation present

#### Current Sidebar Colors (INCORRECT)
```css
.sidebar {
  background: #1a1a2e; /* ❌ Should be #2b2b2b */
  border-right: 1px solid #2d3748; /* ❌ Should be #1a1a1a */
}

.nav-item {
  color: #a0aec0; /* ❌ Should be #c0c0c0 */
}

.nav-item.active {
  background: linear-gradient(...); /* ❌ Should be #0066cc */
}
```

#### Required Changes
1. **Update sidebar colors** to match apiGuide sidebar
2. **Update page background** to #999999
3. **Update main content** to use white boxes (#ffffff)
4. **Update all text colors** to light theme
5. **Add status widget** to sidebar bottom

#### Target Colors
```css
.sidebar {
  background: #2b2b2b; /* Match apiGuide */
  border-right: 1px solid #1a1a1a;
}

body, .main-content {
  background: #999999; /* Match apiGuide */
}

.card, .metric-card {
  background: #ffffff; /* White boxes */
  border: 1px solid #dddddd;
}

.nav-item {
  color: #c0c0c0;
}

.nav-item.active {
  background: #0066cc; /* Simple blue, no gradient */
  color: #ffffff;
}
```

#### Functional Requirements
- ✅ Keep ALL chart functionality
- ✅ Keep ALL data fetching logic
- ✅ Keep ALL view switching (overview, by-model, etc.)
- ✅ Keep ALL metric calculations
- ❌ Change ONLY colors and box styles

---

### 🔄 Pattern (`/pattern`)
**File**: `src/api/endpoints/pattern.js`
**Status**: 🔄 NEEDS REDESIGN

#### Current State (INCORRECT)
```css
:root {
  --bg-primary: #0f0f23;     /* ❌ Dark theme */
  --bg-card: #1a1a3e;        /* ❌ Dark theme */
  --text-primary: #f8f9fa;   /* ❌ Light text on dark */
}

.sidebar {
  background: #1a1a3e;       /* ❌ Should be #2b2b2b */
}
```

#### Required Changes
1. **Update sidebar colors** to #2b2b2b
2. **Update page background** to #999999
3. **Update content cards** to white (#ffffff)
4. **Update all text colors** to dark on light
5. **Add status widget** to sidebar bottom

#### Target Structure (similar to dashboard)
```css
.sidebar {
  background: #2b2b2b;
  border-right: 1px solid #1a1a1a;
}

body {
  background: #999999;
}

.strategy-card, .card {
  background: #ffffff;
  border: 1px solid #dddddd;
}

.card-title, .strategy-title {
  color: #111111; /* Dark text on light background */
}
```

#### Functional Requirements
- ✅ Keep ALL pattern analysis logic
- ✅ Keep ALL statistical calculations
- ✅ Keep ALL view switching (overview, analyst)
- ✅ Keep ALL tables and charts
- ❌ Change ONLY visual styling

---

## 🔍 Verification Procedures

### Visual Consistency Check
Run through each page and verify:

#### Color Verification
```javascript
// Check in browser DevTools
getComputedStyle(document.body).backgroundColor
// Should be: rgb(153, 153, 153) = #999999

getComputedStyle(document.querySelector('.section-block, .card')).backgroundColor
// Should be: rgb(255, 255, 255) = #ffffff

getComputedStyle(document.querySelector('.toc-sidebar, .sidebar')).backgroundColor
// Should be: rgb(43, 43, 43) = #2b2b2b
```

#### Border Verification
```javascript
getComputedStyle(document.querySelector('.section-block, .card')).border
// Should contain: 1px solid rgb(221, 221, 221) = #dddddd
```

#### Navigation Verification
- [ ] Top nav bar is present (height 60px)
- [ ] Home button is on far right
- [ ] All links work correctly
- [ ] Active page has blue background (#0066cc)
- [ ] Mobile menu works (< 900px width)

#### Sidebar Verification (for sidebar pages)
- [ ] Sidebar is 280px wide
- [ ] Sidebar is dark (#2b2b2b)
- [ ] Sidebar text is light (#e0e0e0)
- [ ] Active nav items are blue (#0066cc)
- [ ] Status widget is at bottom
- [ ] Main content has left margin of 280px

#### Content Verification
- [ ] All original content is present
- [ ] All forms work correctly
- [ ] All buttons trigger correct actions
- [ ] All data displays correctly
- [ ] All charts/tables render properly

---

## 🚀 Implementation Order

### Phase 3: Design Unification
1. ✅ **apiGuide** - Add status widget only
2. ✅ **control** - Minor border tweaks + status widget
3. 🔄 **tracker** - MAJOR: Add sidebar, recolor everything, move status widget
4. 🔄 **proceeding** - MAJOR: Add sidebar, recolor everything, extract status panel
5. 🔄 **dashboard** - MEDIUM: Recolor sidebar and content boxes
6. 🔄 **pattern** - MEDIUM: Recolor sidebar and content boxes

### Phase 4: Status Widget Integration
After all pages are visually unified:
1. Create shared status widget component
2. Add to apiGuide sidebar
3. Add to control sidebar
4. Add to tracker sidebar
5. Add to proceeding sidebar
6. Add to dashboard sidebar
7. Add to pattern sidebar
8. Connect to global event emitter for real-time updates

---

## 📐 CSS Architecture

### Required CSS Structure (all pages)

```css
/* ============================================ */
/* 1. RESET & BASE */
/* ============================================ */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  font-family: 'Noto Sans KR', 'Noto Sans', sans-serif;
  line-height: 1.7;
  color: #111111;
  background: #999999; /* KEY: Page background */
  padding: 0;
  margin: 0;
  padding-top: 60px; /* KEY: Top nav offset */
}

/* ============================================ */
/* 2. TOP NAVIGATION (identical across all pages) */
/* ============================================ */
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #2b2b2b;
  border-bottom: 1px solid #1a1a1a;
  z-index: 3000;
  display: flex;
  align-items: center;
  padding: 0 24px;
}

/* ... (rest of top nav styles) ... */

/* ============================================ */
/* 3. LAYOUT (for pages with sidebars) */
/* ============================================ */
.page-wrapper {
  display: flex;
  min-height: 100vh;
}

.toc-sidebar, .sidebar {
  width: 280px;
  background: #2b2b2b;
  color: #e0e0e0;
  position: fixed;
  top: 60px;
  left: 0;
  height: calc(100vh - 60px);
  overflow-y: auto;
  padding: 24px 16px;
  border-right: 1px solid #1a1a1a;
  z-index: 1000;
}

.content-wrapper {
  margin-left: 280px;
  flex: 1;
  background: #999999;
  padding: 32px;
}

/* ============================================ */
/* 4. CONTENT BOXES */
/* ============================================ */
.section-block, .card {
  background: #ffffff;
  border: 1px solid #dddddd;
  border-radius: 6px;
  padding: 20px;
  margin-top: 30px;
}

/* ============================================ */
/* 5. STATUS WIDGET (to be added) */
/* ============================================ */
.status-widget {
  position: sticky;
  bottom: 0;
  background: #1a1a1a;
  border-top: 1px solid #3a3a3a;
  padding: 16px;
  margin-top: auto;
}
```

---

## 🎯 Decision Points

### When to Add Sidebar
**Rule**: If page needs navigation or has multiple sections → add sidebar

#### Pages that NEED sidebars:
- ✅ apiGuide - has TOC
- ✅ control - has configuration sections
- ❌ tracker - needs sidebar (MUST ADD)
- ❌ proceeding - needs sidebar (MUST ADD)
- ✅ dashboard - has view switching
- ✅ pattern - has analysis modes

#### Pages WITHOUT sidebars:
- home - landing page only

### Status Widget Placement
**Rule**: Always in sidebar at bottom (sticky or fixed)

For pages without sidebars:
- Option 1: Add minimal sidebar with only status widget
- Option 2: Fixed position in bottom-right corner

**Recommended**: Add sidebar to all pages for consistency

---

## 📝 Code Review Checklist

Before marking any page as complete, verify:

### Visual Design
- [ ] Page background is `#999999`
- [ ] Content boxes are `#ffffff` with `#dddddd` borders
- [ ] Sidebar (if present) is `#2b2b2b`
- [ ] All text is readable (dark on light)
- [ ] No dark theme CSS remains

### Navigation
- [ ] Top nav bar is present and functional
- [ ] Home button appears on far right
- [ ] All links include api_key parameter (where needed)
- [ ] Active page is highlighted
- [ ] Mobile menu works

### Layout
- [ ] Body has `padding-top: 60px`
- [ ] Sidebar (if present) starts at `top: 60px`
- [ ] Content has proper margins/padding
- [ ] No content is hidden behind nav or sidebar

### Functionality
- [ ] All original features work
- [ ] All forms submit correctly
- [ ] All buttons perform correct actions
- [ ] All data loads and displays
- [ ] No JavaScript errors in console

### Status Widget (Phase 4)
- [ ] Widget is present in sidebar
- [ ] Widget displays current operation
- [ ] Progress bar updates correctly
- [ ] Stats counters update correctly
- [ ] Logs are visible

---

## 🔧 Common Issues & Solutions

### Issue: Content Hidden Behind Nav
**Solution**: Add `padding-top: 60px` to `body`

### Issue: Sidebar Overlaps Top Nav
**Solution**: Sidebar should have `top: 60px` and `height: calc(100vh - 60px)`

### Issue: Dark Theme Remnants
**Solution**: Search and replace all dark color variables:
- `#0d1117` → `#999999`
- `#161b22` → `#ffffff`
- `#1a1a2e` → `#2b2b2b`

### Issue: Text Not Readable
**Solution**: Ensure text color is `#111111` on light backgrounds, `#e0e0e0` on dark backgrounds

### Issue: Borders Not Matching
**Solution**: All borders should be `1px solid #dddddd` (content) or `1px solid #1a1a1a` (sidebar)

---

## 📊 Progress Tracking

### Overall Status
- **Phase 1**: ✅ Navigation bars added (100%)
- **Phase 2**: ✅ Home page and routing (100%)
- **Phase 3**: 🔄 Design unification (33% - 2/6 pages done)
- **Phase 4**: ⏳ Status widget (0%)

### Page Status Matrix
| Page | Route | Nav Bar | Sidebar | Colors | Status Widget | Complete |
|------|-------|---------|---------|--------|---------------|----------|
| Home | `/` | ✅ | N/A | ✅ | N/A | ✅ 100% |
| API Guide | `/apiguide` | ✅ | ✅ | ✅ | ⏳ | 🔄 90% |
| Control | `/control` | ✅ | ✅ | ✅ | ⏳ | 🔄 90% |
| Tracker | `/tracker` | ✅ | ❌ | ❌ | ❌ | 🔄 25% |
| Proceeding | `/proceeding` | ✅ | ❌ | ❌ | ❌ | 🔄 25% |
| Dashboard | `/dashboard` | ✅ | ✅ | ❌ | ❌ | 🔄 50% |
| Pattern | `/pattern` | ✅ | ✅ | ❌ | ❌ | 🔄 50% |

### Next Actions Priority
1. 🔥 **HIGH**: Fix tracker.js colors (major user-facing page)
2. 🔥 **HIGH**: Fix proceeding.js colors and move status panel
3. 🟡 **MEDIUM**: Fix dashboard.js colors
4. 🟡 **MEDIUM**: Fix pattern.js colors
5. 🟢 **LOW**: Add status widget to apiGuide
6. 🟢 **LOW**: Add status widget to control

---

## 🎓 Key Principles

### Design Principles
1. **Consistency Over Creativity**: All pages must look like same product
2. **Light Theme Standard**: Grey background, white boxes (apiGuide reference)
3. **Preserve Functionality**: Never sacrifice features for design
4. **Responsive by Default**: Mobile-first approach

### Development Principles
1. **Read First**: Always read existing code before modifying
2. **Small Changes**: Make incremental, verifiable changes
3. **Test Everything**: Check functionality after every change
4. **Document Changes**: Update this spec when making decisions

### Quality Standards
- **Zero Functionality Loss**: 100% feature preservation
- **Pixel Perfect**: Match reference design exactly
- **Cross-Browser**: Test in Chrome, Firefox, Safari
- **Mobile Ready**: Works on screens 320px and up

---

## 📞 Contact & Support

### For LLM Agents
When working on this project:
1. **Read this spec completely** before making changes
2. **Verify current state** by checking page-by-page status
3. **Follow implementation order** (don't skip phases)
4. **Update progress tracking** after each page
5. **Document any deviations** from this spec

### Questions to Ask
- What phase am I in?
- Which page am I working on?
- Does this page need a sidebar?
- Have I preserved all functionality?
- Do my colors match the design system?

### Red Flags
- ⚠️ Dark background colors on main content
- ⚠️ Removing existing features/content
- ⚠️ Inconsistent border colors
- ⚠️ Missing top navigation
- ⚠️ Overlapping layouts

---

## 📚 Appendices

### Appendix A: Complete Color Reference

```css
/* Official Design System Colors */

/* Backgrounds */
#999999  /* Page background (grey) */
#ffffff  /* Content boxes (white) */
#fafafa  /* Secondary boxes (light grey) */
#f5f5f5  /* Code blocks, inputs */
#2b2b2b  /* Sidebar background (dark) */
#1a1a1a  /* Sidebar items, dark boxes */
#0d1117  /* DEPRECATED - dark theme */
#161b22  /* DEPRECATED - dark theme */

/* Borders */
#dddddd  /* Standard borders */
#eeeeee  /* Light dividers */
#e0e0e0  /* Card borders */
#cccccc  /* Strong borders */
#1a1a1a  /* Sidebar borders */
#3a3a3a  /* Sidebar item borders */

/* Text */
#111111  /* Primary text */
#666666  /* Secondary text */
#888888  /* Muted text */
#e0e0e0  /* Sidebar text (light) */
#c0c0c0  /* Sidebar links */
#c9d1d9  /* DEPRECATED - dark theme */

/* Accents */
#0066cc  /* Primary blue */
#0052a3  /* Blue hover */
#2e7d32  /* Success green */
#c62828  /* Error red */
#f57f17  /* Warning orange */
```

### Appendix B: Font Loading
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600&display=swap" rel="stylesheet">
```

### Appendix C: Responsive Breakpoints
```css
/* Mobile First */
@media (max-width: 480px) { /* Small phones */ }
@media (max-width: 768px) { /* Tablets */ }
@media (max-width: 900px) { /* Navigation breakpoint */ }
@media (max-width: 1024px) { /* Sidebar toggle breakpoint */ }
```

---

**END OF SPECIFICATION**

*This document should be updated whenever design decisions change or new pages are added.*
