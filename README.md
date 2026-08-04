# Nasser Lodge Website

**"Where luxury feels like home"** — Mongu, Western Province, Zambia

A responsive, brand-aligned marketing website built per the Nasser Lodge 3D Website PRD (v1.0, August 2026).

---

## Quick Start

Open `index.html` in a browser, or serve locally:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then visit `http://localhost:8000`

---

## File Structure

```
nasser-lodge/
├── index.html              # Main landing page
├── pages/
│   ├── gallery.html        # Photo gallery
│   ├── about.html          # About page
│   └── book.html           # Booking page with mobile money payments
├── api/                    # Vercel serverless functions
│   ├── bookings.js         # Booking CRUD + payment initiation
│   ├── payments.js         # Payment verification (polling)
│   ├── admin.js            # Admin dashboard API
│   ├── _africastalking.js  # Africa's Talking payments integration
│   ├── _sms.js             # SMS notifications via Africa's Talking
│   └── _db.js              # Database helpers (Upstash Redis)
├── css/
│   └── style.css           # Global stylesheet
├── js/
│   └── main.js             # Navigation, animations
├── images/                 # Lodge photography
└── data/
    └── bookings.json       # Booking data store
```

---

## Key Features (Current)

- Scroll-driven narrative chapters matching the PRD story arc
- Mobile-responsive with hamburger navigation
- Scroll-triggered animations (Intersection Observer)
- Room cards with rates, amenities, and glass-tag styling
- Enquiry form with WhatsApp fallback submission
- Direct WhatsApp, Call, and Email CTAs
- Social proof section (Google 4.2, guest testimonials)
- Location/culture section (Kuomboka, Liuwa Plain, Barotse Floodplain)
- Structured data (Schema.org LodgingBusiness) for SEO
- Open Graph meta tags
- Booking page with mobile money deposits (Airtel Money, MTN MoMo, Zamtel Kwacha)
- Africa's Talking Payments integration (mobile checkout / C2B)
- SMS admin notifications via Africa's Talking (booking alerts + payment confirmations)
- Admin dashboard for managing bookings

---

## Environment Variables (Vercel)

### Africa's Talking — SMS Notifications
| Variable | Description |
|---|---|
| `AFRICAS_TALKING_USERNAME` | Your AT app username (`sandbox` for dev) |
| `AFRICAS_TALKING_API_KEY` | Your AT API key |
| `ADMIN_PHONE` | Admin phone for alerts (e.g. `+260978176195`) |
| `SMS_SENDER_ID` | Registered sender ID or shortcode (default: `NASSER`) |

### Africa's Talking — Payments (Mobile Checkout)
| Variable | Description |
|---|---|
| `AT_API_KEY` | Your AT API key (same as SMS key) |
| `AT_USERNAME` | Your AT app username (same as SMS username) |
| `AT_PRODUCT_NAME` | Your payment product name (e.g. `NasserLodgeDeposits`) |
| `AT_PROVIDER_CHANNEL` | Provider channel (e.g. `1212` for sandbox) |

### Database (Upstash Redis)
| Variable | Description |
|---|---|
| `KV_REST_API_URL` | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Upstash Redis REST token |

### Admin
| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Password for admin dashboard (default: `nasser2026`) |

---

## Contact

- **Phone/WhatsApp**: +260 978 176 195
- **Email**: nasserlodges49@gmail.com
- **Address**: P4HQ+W93, Lusaka Road, Mongu, Western Province, Zambia
- **Facebook**: [facebook.com/nasserlodge](https://facebook.com/nasserlodge)

---

*Built as a living document — designed to evolve with the lodge's needs.*
