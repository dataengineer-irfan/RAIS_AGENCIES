# RAIS Agencies Mobile App Release

### Latest Build: `RAIS_Agencies.apk`
- **File Size:** ~3.73 MB
- **Target OS:** Android 8.0+ (API 26+)
- **Backend API:** `https://rais-backend.onrender.com`
- **Signatures:** Android Schema v1, v2, and v3 verified

---

### What's New in this Release:
1. **Executive Financial Hero Canvas (Home Tab):**
   - Live Rayachoty Depot revenue summary with real-time order count and depot status indicator.
   - 3 clean financial sub-metrics (`Receivables`, `Overdue`, `Active Outlets`).
   - Dual one-tap operational buttons (`+ Invoice`, `Payment`).
   - Monthly run-rate and pacing tracker (`Day 3/30`).
   - Smooth vertical thumb scrolling through recent invoices and fast-moving SKUs without viewport clipping.

2. **Floating Action Button (FAB) Speed-Dial:**
   - Thumb-anchored action button with expandable speed-dial options:
     - `+ New Invoice`
     - `+ New Order`
     - `+ New Customer`
     - `✨ Ask AI Co-Pilot`

3. **5-Tab Ergonomic Bottom Navigation:**
   - Streamlined 5 tabs (`Home`, `Outlets`, `Catalogue`, `Inventory`, `Billing`) with touch-friendly 48px targets and active glowing pill indicators.

4. **Swipeable Horizontal Filter Chips:**
   - Outlets page: Instant filter chips (`All Outlets`, `🚨 Balance Due`, `Rayachoty Town`, `Madanapalle Rd`).
   - Catalogue page: Category chips (`All SKUs`, `Chicken Items`, `Veg Items`, `Cheese & Slices`, etc.).

5. **Desktop Web Preservation:**
   - 100% responsive design preserving the full multi-slicer Power BI desktop experience on larger screens.

---

### Installation via ADB:
```bash
adb install -r -d -g release/RAIS_Agencies.apk
```
