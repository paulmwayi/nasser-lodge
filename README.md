# Nasser Lodge Website

**"Where luxury feels like home"** — Mongu, Western Province, Zambia

A responsive, brand-aligned marketing website built per the Nasser Lodge 3D Website PRD (v1.0, August 2026).

---

## 🚀 Quick Start

Open `index.html` in a browser, or serve locally:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .
```

Then visit `http://localhost:8000`

---

## 📁 File Structure

```
nasser-lodge/
├── index.html              # Main landing page (single-page scroll narrative)
├── pages/
│   ├── gallery.html        # Photo gallery (grid layout)
│   └── about.html          # About, directions, story
├── css/
│   └── style.css           # Global stylesheet (design system + responsive)
├── js/
│   └── main.js             # Navigation, animations, form submission
└── images/                 # (Placeholder — add actual photos here)
```

---

## 🎨 Design System

| Attribute | Value |
|---|---|
| **Palette** | Dark charcoal/warm tones — "golden hour over the Zambezi floodplain" |
| **Primary accent** | `#c8944a` (Gold) |
| **Background** | `#0d0d0d` (Deep charcoal) → `#1e1b16` (Warm dark) alternating |
| **Display font** | Playfair Display |
| **Body font** | Inter |
| **Spacing philosophy** | Generous negative space, one idea per section |

### Color Palette Reference
- `--color-bg-deep`: `#0d0d0d`
- `--color-bg-warm`: `#1e1b16`
- `--color-gold`: `#c8944a`
- `--color-gold-light`: `#e2b86b`
- `--color-text-primary`: `#f0ece6`
- `--color-text-secondary`: `#b8b0a4`

---

## 📱 Browser Support

- **Desktop**: Chrome, Safari, Edge, Firefox (last 2 versions)
- **Mobile**: iOS Safari, Android Chrome
- **Reduced motion**: Fully respects `prefers-reduced-motion` — animations disabled, simple fades instead
- **Responsive breakpoints**: 1024px, 768px, 480px

---

## 🔧 Key Features (Current)

- ✅ Scroll-driven narrative chapters matching the PRD story arc
- ✅ Mobile-responsive with hamburger navigation
- ✅ Scroll-triggered animations (Intersection Observer)
- ✅ Room cards with rates, amenities, and glass-tag styling
- ✅ Enquiry form with WhatsApp fallback submission
- ✅ Direct WhatsApp, Call, and Email CTAs
- ✅ Social proof section (Google 4.2★, guest testimonials)
- ✅ Location/culture section (Kuomboka, Liuwa Plain, Barotse Floodplain)
- ✅ Structured data (Schema.org LodgingBusiness) for SEO
- ✅ Open Graph meta tags

---

## 🚧 Roadmap / Next Steps

Based on the PRD sections:

### Phase 1 (Current)
- [x] Responsive 2D landing page
- [x] Room cards with rates and amenities
- [x] Booking enquiry form
- [x] WhatsApp/Call/Email CTAs
- [x] Gallery page structure
- [x] About page with directions

### Phase 1.5 — Enhancements
- [ ] Replace all placeholder images with real photography
- [ ] Add Google Maps embed (P4HQ+W93, Mongu)
- [ ] Add Facebook page feed embed or link
- [ ] Finalize rates and room names with lodge management
- [ ] Add Plausible or GA4 analytics
- [ ] CMS integration (Sanity.io or Contentful)

### Phase 2 — Immersive Upgrades (per PRD)
- [ ] 3D hero experience with Three.js / React Three Fiber
- [ ] 360° room photo spheres as room showcase alternative
- [ ] Scroll-driven camera animation (GSAP + ScrollTrigger)
- [ ] Lite mode with device/bandwidth detection
- [ ] Booking calendar with availability
- [ ] Mobile money deposit (Airtel Money / MTN MoMo)

---

## 📞 Contact

- **Phone/WhatsApp**: +260 976 327 007
- **Email**: nasserlodges49@gmail.com
- **Address**: P4HQ+W93, Lusaka Road, Mongu, Western Province, Zambia
- **Facebook**: [facebook.com/nasserlodge](https://facebook.com/nasserlodge)

---

## 📄 Reference

- [Nasser Lodge 3D Website PRD v1.0](../Nasser_Lodge_3D_Website_PRD.md)

---

*Built as a living document — designed to evolve with the lodge's needs.*
