# 🎨 Design Specifications - Kelly Yu Wen Wen Global Updates Hub

## 📱 Mobile-First Responsive Design Strategy

### **Responsive Breakpoints:**
```
📱 Mobile (320-768px) - PRIMARY FOCUS
💻 Tablet (768-1024px) - Enhanced experience  
🖥️ Desktop (1024px+) - Multi-column layout
```

---

## 🎨 Visual Identity & Platform Colors

### **Platform Visual Identity:**
```
📱 Weibo    → Red accent (#E60012)
🎵 Douyin   → Black accent (#000000)  
📺 Sohu     → Blue accent (#0078D4)
🌹 RED      → Pink accent (#FF2442)
📷 Instagram→ Gradient (#E1306C → #F77737)
```

### **Brand Colors:**
- **Primary**: Kelly's signature colors (to be defined)
- **Background**: Clean white/dark mode support
- **Text**: High contrast for accessibility
- **Accents**: Platform-specific colors for visual distinction

---

## 📐 Layout Specifications

### **📱 Mobile Layout (320-768px) - PRIMARY**
```
┌─────────────────────┐
│    🎵 Kelly Hub     │ ← Header (60px fixed)
├─────────────────────┤
│ [🔄][🎨][📱] Filter │ ← Platform filters (48px)
├─────────────────────┤
│  ┌───────────────┐  │
│  │ 📷 Weibo Post │  │ ← Single column cards
│  │ Kelly's text  │  │
│  │ [Image/Video] │  │
│  │ 2h ago • 🔗   │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ 🎵 Douyin Vid │  │
│  │ [Video Player]│  │
│  │ 1h ago • 🔗   │  │
│  └───────────────┘  │
│        ⋮             │ ← Infinite scroll
└─────────────────────┘
```

### **💻 Tablet Layout (768-1024px)**
```
┌─────────────────────────────┐
│       🎵 Kelly Hub          │
├─────────────────────────────┤
│ [🔄][🎨][📱] Filter Bar     │
├──────────────┬──────────────┤
│ ┌──────────┐ │ ┌──────────┐ │ ← 2-column grid
│ │ Post 1   │ │ │ Post 2   │ │
│ │ [Media]  │ │ │ [Media]  │ │
│ └──────────┘ │ └──────────┘ │
│ ┌──────────┐ │ ┌──────────┐ │
│ │ Post 3   │ │ │ Post 4   │ │
└──────────────┴──────────────┘
```

### **🖥️ Desktop Layout (1024px+)**
```
┌─────────────────────────────────────────┐
│            🎵 Kelly Yu Hub              │
├─────────────────────────────────────────┤
│        [🔄][🎨][📱] Filter Bar          │
├─────────────┬─────────────┬─────────────┤
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ← 3-column grid
│ │ Post 1  │ │ │ Post 2  │ │ │ Post 3  │ │
│ │ [Media] │ │ │ [Media] │ │ │ [Media] │ │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │
└─────────────┴─────────────┴─────────────┘
```

---

## 🃏 Feed Card Component Design

### **Mobile Card Anatomy (Primary Focus):**
```
┌─────────────────────────────────┐
│ 📱 12px padding all sides      │
│ ┌─────────────────────────────┐ │
│ │ [📱] Platform • 2h ago      │ │ ← 14px text, platform icon
│ │                             │ │
│ │ Kelly's post content text   │ │ ← 16px, max 3 lines
│ │ goes here with proper...    │ │
│ │                             │ │
│ │ ┌─────────────────────────┐ │ │
│ │ │                         │ │ │
│ │ │    [IMAGE/VIDEO]        │ │ │ ← Full width, 16:9 ratio
│ │ │      CLICKABLE          │ │ │ ← Click to enlarge
│ │ │                         │ │ │
│ │ └─────────────────────────┘ │ │
│ │                             │ │
│ │        [View Original] 🔗   │ │ ← 14px link, right aligned
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### **Card Specifications:**
- **Border radius**: 12px for modern look
- **Shadow**: Subtle elevation (0 2px 8px rgba(0,0,0,0.1))
- **Spacing**: 16px between cards
- **Typography**: 
  - Title: 16px medium weight
  - Content: 14px regular
  - Meta: 12px regular, secondary color

---

## 🖼️ Media Lightbox Design

### **📱 Mobile Lightbox Design:**
```
┌─────────────────────────┐
│ ╱ ✕                    │ ← Close button (top-right)
│                         │
│    ┌─────────────────┐  │
│    │                 │  │
│    │   ENLARGED      │  │ ← Full viewport media
│    │   IMAGE/VIDEO   │  │
│    │                 │  │
│    └─────────────────┘  │
│                         │
│ Kelly's caption text... │ ← Optional caption overlay
│ ● ○ ○                   │ ← Media indicators (if multiple)
│                         │
│ Tap to zoom • Swipe nav │ ← Touch instructions
└─────────────────────────┘
```

### **Lightbox Features:**
- **Full-screen overlay**: 95% opacity black backdrop
- **Media scaling**: 
  - Fit to screen by default
  - Original size toggle (1:1 button)
  - Zoom controls (desktop)
- **Navigation**:
  - Touch gestures (mobile): swipe left/right
  - Keyboard shortcuts: arrow keys, escape
  - Gallery indicators for multiple media
- **Controls**:
  - Close button (top-right)
  - Zoom in/out (desktop only)
  - Original size toggle
  - Media counter (1/3)

---

## 🎯 Mobile Optimization Features

### **Touch-Friendly Design:**
- **44px minimum touch targets**
- **Gesture support**: 
  - Swipe to navigate media
  - Pinch to zoom (images)
  - Pull to refresh
- **Performance optimizations**:
  - Progressive image loading
  - Lazy loading below fold
  - 60fps smooth scrolling
  - Momentum-based infinite scroll

### **Responsive Behavior:**
```css
/* Mobile First Breakpoints */
.card {
  /* Mobile: 320-768px */
  @apply w-full px-3 py-4;
}

@media (min-width: 768px) {
  /* Tablet: 768-1024px */
  .card {
    @apply w-1/2 px-4 py-6;
  }
}

@media (min-width: 1024px) {
  /* Desktop: 1024px+ */
  .card {
    @apply w-1/3 px-6 py-8;
  }
}
```

---

## 🎨 Animation & Micro-Interactions

### **Loading States:**
- **Skeleton loading** for cards
- **Progressive image loading** with blur-up effect
- **Smooth transitions** between states

### **Interactive Elements:**
- **Hover effects** (desktop): subtle scale and shadow
- **Touch feedback** (mobile): brief opacity change
- **Loading indicators**: platform-themed spinners

### **Framer Motion Animations:**
```javascript
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

const lightboxVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
}
```

---

## 📊 Accessibility & Performance

### **Accessibility:**
- **WCAG 2.1 AA compliance**
- **Keyboard navigation** support
- **Screen reader** optimized
- **High contrast** text ratios
- **Focus indicators** visible
- **Alt text** for all images

### **Performance Targets:**
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

---

## 🌙 Dark Mode Support

### **Color Scheme:**
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #1a202c;
  --text-secondary: #4a5568;
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
}
```

### **Toggle Implementation:**
- System preference detection
- Manual toggle in header
- Smooth transitions between modes
- Persistent user preference storage