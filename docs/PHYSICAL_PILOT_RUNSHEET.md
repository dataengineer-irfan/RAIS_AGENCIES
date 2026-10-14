# RAIS Frozen Foods — 50-Scenario Physical Warehouse Pilot Runsheet

**Location:** RAIS Agencies Depot, Near Reddies Colony, Rayachoty, Andhra Pradesh - 516269  
**Target Environment:** Staging Isolated Backend (`https://rais-backend-staging.onrender.com`)  
**Target Build:** Staging Debug APK (`RAIS_Agencies_STAGING_DEBUG.apk`)  
**Production Release Status:** **STRICTLY ON HOLD** — Zero live production mutations permitted  
**Date of Execution:** _______________________  
**Auditor / QA Lead:** Independent QA Auditor & Systems Architect  

---

## 1. Safety Rules & Pre-Pilot Verification

> [!CAUTION]
> ### MANDATORY SAFETY RESTRICTIONS
> 1. **DO NOT USE PRODUCTION:** Verify that the installed APK is `RAIS_Agencies_STAGING_DEBUG.apk`. Confirm that the app displays the orange/amber **STAGING** banner at the top of the screen.
> 2. **NO REAL INVOICES OR MONEY:** Under no circumstances should real commercial invoices or customer payments be processed against live production accounts during this pilot.
> 3. **DO NOT DEPLOY:** Production release remains strictly on hold. This run sheet is exclusively for staging validation.

### Pre-Pilot Device Setup Checklist
- [ ] Android device connected to warehouse Wi-Fi or local mobile network.
- [ ] `RAIS_Agencies_STAGING_DEBUG.apk` installed via ADB or Direct Sideload:
  ```bash
  adb install -r -d -g RAIS_Agencies_STAGING_DEBUG.apk
  ```
- [ ] On first tap of the microphone button, Android prompt appeared: *"Allow RAIS to record audio?"* $\to$ Selected **"While using the app"**.
- [ ] Staging database verified seeded with 38 official SKUs and registered Rayachoty outlets.
- [ ] Warehouse ambient noise noted: [ ] Quiet [ ] Active Refrigeration Compressor Hum [ ] Moving Vehicle / Unloading [ ] High Echo.

---

## 2. Operator Execution Procedure

For each scenario in the matrix below:
1. **Navigate:** Open the **Billing** screen or tap the **Floating Action Button (+)** $\to$ select **"✨ Ask AI Co-Pilot"** or tap the **Microphone** icon on the invoice builder.
2. **Speak:** Hold device 15–30 cm from face. Speak the utterance naturally at conversational speed in the indicated language/dialect.
3. **Inspect Real-Time Staging Modal:**
   - Verify speech transcribed cleanly.
   - Verify customer is correctly selected.
   - Verify products, quantities, and pricing match expectation.
   - If **Disambiguation Chips** appear (e.g., `[6MM]` vs `[9MM]`), tap the intended chip.
4. **Issue / Save:** Tap **"Issue Invoice"** or **"Save Draft"**.
5. **Verify:** Confirm the sequential invoice number (e.g., `INV-202610-00001`) and UPI QR code are generated. Verify that warehouse stock reflects the deduction without negative overselling.
6. **Log:** Mark the result columns: **Transcription (T)**, **Entity Match (M)**, **Modal / Draft (D)**, **Ledger Pass (L)**, and note any acoustic defects.

---

## 3. The 50-Scenario Warehouse Pilot Test Matrix

| ID | Spoken Utterance | Category & Dialect | Expected Customer | Expected Items & Qty | Expected Total | T | M | D | L | Operator Notes |
|:---|:---|:---|:---|:---|:---|:---:|:---:|:---:|:---:|:---|
| **P-01** | *"bill to hot burger 5 packets veg momos"* | Ordinary English | `HOT BURGER` (`CUST-0024`) | 5 × `I.T.C VEG MOMOS` (`RAIS-VEG-03`) | ₹825.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-02** | *"invoice for kfc kalakada 10 packets chicken nuggets"* | Ordinary English | `KFC - KALAKADA AFROSE` (`CUST-0014`) | 10 × `ITC CHICKEN NUGGETS` (`RAIS-CHK-05`) | ₹3,550.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-03** | *"bill for pizza king 4 packets milky mist cheese slice"* | Ordinary English | `PIZZA KING` (`CUST-0016`) | 4 × `MILKY MIST CHEESE SLICE` (`RAIS-CHS-03`) | ₹1,760.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-04** | *"invoice yfc 2 bottles lime and mint"* | Product with "and" | `YFC` (`CUST-0021`) | 2 × `LIME AND MINT` (`RAIS-MOJ-01`) | ₹720.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-05** | *"bill for jfc 3 packets chicken popcorn ball"* | Acronym Customer | `J F C` (`CUST-0022`) | 3 × `NUTRICH CHICKEN POPCORN BALL` (`RAIS-CHK-03`) | ₹990.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-06** | *"create invoice royal fast food 6 packets signature tortillah 8 inches"* | Ordinary English | `Royal Fast Food & Burgers` (`CUST-0001`) | 6 × `SIGNATURE TORTILLAH 8 INCHES` (`RAIS-CHK-01`) | ₹510.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-07** | *"bill cafe delight 2 boxes plain pizza box 8 inch"* | Dimension Matching | `Cafe Delight Family Restaurant` (`CUST-0002`) | 2 × `PIZZA BOX 8"x8" PLAIN` (`RAIS-BOX-01`) | ₹1,200.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-08** | *"invoice al madina 5 packets chicken burger patty"* | Ordinary English | `Al-Madina Fried Chicken & Momos` (`CUST-0003`) | 5 × `NUTRICH CHICKEN BURGER PATTY` (`RAIS-CHK-06`) | ₹1,625.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-09** | *"bill green park 3 packets foodrite tomato ketchup"* | Brand Match | `Green Park Pizza & Bakery` (`CUST-0004`) | 3 × `FOODRITE TOMATO KETCHUP` (`RAIS-SAU-02`) | ₹225.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-10** | *"invoice hot burger 1 packet oregano"* | Single Item | `HOT BURGER` (`CUST-0024`) | 1 × `OREGANO` (`RAIS-BRD-04`) | ₹230.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-11** | *"hot burger ki rendu packets chicken nuggets bill cheyyi"* | Telugu Dialect (*rendu*) | `HOT BURGER` (`CUST-0024`) | 2 × `ITC CHICKEN NUGGETS` (`RAIS-CHK-05`) | ₹710.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-12** | *"kfc kalakada ki moodu packets veg momos"* | Telugu Dialect (*moodu*) | `KFC - KALAKADA AFROSE` (`CUST-0014`) | 3 × `I.T.C VEG MOMOS` (`RAIS-VEG-03`) | ₹495.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-13** | *"pizza king ki nalugu packets cheese slice ivvali"* | Telugu Dialect (*nalugu*) | `PIZZA KING` (`CUST-0016`) | 4 × `MILKY MIST CHEESE SLICE` (`RAIS-CHS-03`) | ₹1,760.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-14** | *"yfc ki aidu packets burger patty"* | Telugu Dialect (*aidu*) | `YFC` (`CUST-0021`) | 5 × `NUTRICH CHICKEN BURGER PATTY` (`RAIS-CHK-06`) | ₹1,625.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-15** | *"jfc ki padi packets peri peri powder bill"* | Telugu Dialect (*padi*) | `J F C` (`CUST-0022`) | 10 × `VKL PERI PERI POWDER` (`RAIS-BRD-03`) | ₹1,650.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-16** | *"royal fast food ki oka packet chilly powder"* | Telugu Dialect (*oka*) | `Royal Fast Food & Burgers` (`CUST-0001`) | 1 × `CHILLY POWDER` (`RAIS-SPC-02`) | ₹280.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-17** | *"cafe delight ki aaru packets pizza base"* | Telugu Dialect (*aaru*) | `Cafe Delight Family Restaurant` (`CUST-0002`) | 6 × `PIZZA BASE 8 INCH` (`RAIS-VEG-PIZZ`) | ₹210.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-18** | *"al madina ki rendu bottles bluecurco mojito"* | Telugu Dialect (*rendu*) | `Al-Madina Fried Chicken & Momos` (`CUST-0003`) | 2 × `BLUECURCO` (`RAIS-MOJ-02`) | ₹700.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-19** | *"green park ki iravai boxes printed burger box"* | Telugu Dialect (*iravai*) | `Green Park Pizza & Bakery` (`CUST-0004`) | 20 × `BURGER BOX 4"x4" PRINTED` (`RAIS-BOX-04`) | ₹9,000.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-20** | *"hot burger ki muppai packets tortillah 8.5 inches"* | Telugu Dialect (*muppai*) | `HOT BURGER` (`CUST-0024`) | 30 × `SIGNATURE TORTILLAH 8.5 INCHES` (`RAIS-CHK-02`) | ₹2,700.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-21** | *"bill hot burger 5 packets french fries"* | Disambiguation (6mm vs 9mm) | `HOT BURGER` (`CUST-0024`) | Prompt: Choose 9MM or 6MM chip | ₹1,550.00 (or ₹1,600) | [ ] | [ ] | [ ] | [ ] | |
| **P-22** | *"invoice kfc kalakada 10 packets fries"* | Disambiguation (Fries Cut) | `KFC - KALAKADA AFROSE` (`CUST-0014`) | Prompt: Choose 9MM or 6MM chip | ₹3,100.00 (or ₹3,200) | [ ] | [ ] | [ ] | [ ] | |
| **P-23** | *"bill pizza king 2 packets milky mist cheese"* | Disambiguation (Pack Size) | `PIZZA KING` (`CUST-0016`) | Prompt: Choose 1KG, 2KG, or Slices | Varies by selection | [ ] | [ ] | [ ] | [ ] | |
| **P-24** | *"invoice yfc 3 packets momos"* | Disambiguation (Veg vs Nonveg) | `YFC` (`CUST-0021`) | Prompt: Choose Veg or Chicken | Varies by selection | [ ] | [ ] | [ ] | [ ] | |
| **P-25** | *"bill jfc 5 packets tortillah"* | Disambiguation (8" vs 8.5") | `J F C` (`CUST-0022`) | Prompt: Choose 8 Inch or 8.5 Inch | Varies by selection | [ ] | [ ] | [ ] | [ ] | |
| **P-26** | *"create bill royal fast food 2 packets delmonte ketchup"* | Disambiguation (Bottle vs Pkt) | `Royal Fast Food & Burgers` (`CUST-0001`) | Prompt: Choose 1.1KG or 8g sachets | Varies by selection | [ ] | [ ] | [ ] | [ ] | |
| **P-27** | *"invoice cafe delight 5 boxes pizza box"* | Disambiguation (Plain vs Print) | `Cafe Delight Family Restaurant` (`CUST-0002`) | Prompt: Choose Plain or Printed | Varies by selection | [ ] | [ ] | [ ] | [ ] | |
| **P-28** | *"bill al madina 4 boxes burger box"* | Disambiguation (Size & Print) | `Al-Madina Fried Chicken & Momos` (`CUST-0003`) | Prompt: Choose 4x4 Plain/Printed/5x5 | Varies by selection | [ ] | [ ] | [ ] | [ ] | |
| **P-29** | *"bill hot burger one hundred and twenty packets veg momos"* | Spoken Compound (120) | `HOT BURGER` (`CUST-0024`) | 120 × `I.T.C VEG MOMOS` (`RAIS-VEG-03`) | ₹19,800.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-30** | *"invoice kfc kalakada two hundred and fifty packets chicken nuggets"* | Spoken Compound (250) | `KFC - KALAKADA AFROSE` (`CUST-0014`) | 250 × `ITC CHICKEN NUGGETS` (`RAIS-CHK-05`) | ₹88,750.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-31** | *"bill pizza king two and a half kg sweet corn"* | Fractional Quantity (2.5) | `PIZZA KING` (`CUST-0016`) | 2.5 × `SWEET CORN` (`RAIS-VEG-08`) | ₹225.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-32** | *"invoice yfc five point five kg paneer cubes"* | Decimal Quantity (5.5) | `YFC` (`CUST-0021`) | 5.5 × `MILKY MIST PANEER (DICED CUBES)` | ₹2,530.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-33** | *"bill jfc seventy five packets tortillah 8 inches"* | Spoken Compound (75) | `J F C` (`CUST-0022`) | 75 × `SIGNATURE TORTILLAH 8 INCHES` | ₹6,375.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-34** | *"invoice royal fast food one thousand packets tomato sauce 8 gram"* | Wholesale Scale (1000) | `Royal Fast Food & Burgers` (`CUST-0001`) | 1000 × `DELMONTE KETCHUP (8 GRAM PKT)` | ₹80,000.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-35** | *"bill hot burger 10 packets veg momos no wait make it 5"* | Spoken Self-Correction | `HOT BURGER` (`CUST-0024`) | 5 × `I.T.C VEG MOMOS` (Discards 10) | ₹825.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-36** | *"invoice kfc kalakada 20 nuggets instead of 15"* | Forward Replacement | `KFC - KALAKADA AFROSE` (`CUST-0014`) | 20 × `ITC CHICKEN NUGGETS` (Discards 15) | ₹7,100.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-37** | *"bill pizza king 5 packets cheese slice not 8"* | Negation Stripping | `PIZZA KING` (`CUST-0016`) | 5 × `MILKY MIST CHEESE SLICE` (Ignores 8) | ₹2,200.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-38** | *"cancel bill for yfc do not create invoice"* | Full Negation / Abort | `YFC` (`CUST-0021`) | **Zero items staged; modal dismisses cleanly** | ₹0.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-39** | *"discard invoice for jfc cancel order"* | Action Reversal | `J F C` (`CUST-0022`) | **Zero items staged; zero database records** | ₹0.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-40** | *"bill for kalakada store 5 packets veg momos"* | Colloquial Customer Alias | `KFC - KALAKADA AFROSE` (`CUST-0014`) | 5 × `I.T.C VEG MOMOS` (`RAIS-VEG-03`) | ₹825.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-41** | *"bill for burger shop 10 packets chicken burger patty"* | Ambiguous Customer | Needs Operator Clarification | 10 × `NUTRICH CHICKEN BURGER PATTY` | ₹3,250.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-42** | *"invoice for pizza center 3 packets cheese slice"* | Ambiguous Customer | Needs Operator Clarification | 3 × `MILKY MIST CHEESE SLICE` | ₹1,320.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-43** | *"bill for unknown dhabha 5 packets fries"* | Unregistered Outlet | Flagged Red / Missing Customer | 5 × `HUP HUP FRENCH FRIES 9MM` | ₹1,550.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-44** | *"bill hot burger 10 packets veg momos discount of 150 rupees"* | Authorized Lump Discount | `HOT BURGER` (`CUST-0024`) | 10 × `I.T.C VEG MOMOS`, Disc: ₹150 | ₹1,500.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-45** | *"invoice kfc kalakada 5 nuggets at 340 rupees"* | Negotiated Rate Override | `KFC - KALAKADA AFROSE` (`CUST-0014`) | 5 × `ITC CHICKEN NUGGETS` @ ₹340 (Base ₹355) | ₹1,700.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-46** | *"bill pizza king 2 cheese slice 100 discount"* | Cash Discount | `PIZZA KING` (`CUST-0016`) | 2 × `MILKY MIST CHEESE SLICE`, Disc: ₹100 | ₹780.00 | [ ] | [ ] | [ ] | [ ] | |
| **P-47** | *"bill hot burger 9999 packets veg momos"* | Warehouse Oversell Shield | `HOT BURGER` (`CUST-0024`) | 9999 × `I.T.C VEG MOMOS` | **REJECTED** | [ ] | [ ] | [ ] | [ ] | |
| **P-48** | *"invoice kfc kalakada 500 packets chicken nuggets"* | Over-Stock Rejection | `KFC - KALAKADA AFROSE` (`CUST-0014`) | 500 × `ITC CHICKEN NUGGETS` | **REJECTED** | [ ] | [ ] | [ ] | [ ] | |
| **P-49** | *(Taps mic, speaks 2 mumbled words under engine noise)* | Noise / Clipping Cutoff | Unknown / Partial | Prompt: *"Could not understand audio, please tap to retry"* | N/A | [ ] | [ ] | [ ] | [ ] | |
| **P-50** | *(Silence / 5 seconds background compressor noise)* | Silence Timeout | None | Prompt: *"No speech detected"* | N/A | [ ] | [ ] | [ ] | [ ] | |

---

## 4. Pilot Stop Conditions & Fallback Protocol

> [!WARNING]
> ### STOP PILOT IMMEDIATELY IF:
> 1. Any invoice is generated against a **live production** endpoint or database.
> 2. Warehouse inventory for an SKU drops below `0.00` (Negative overselling bug).
> 3. An invoice is created with grand total `< ₹0.00` or negative unit price.
> 4. The application crashes to the Android home screen (`FATAL EXCEPTION`).
> 5. A cancel/discard utterance creates an invoice draft in the backend database.

### Fallback Procedure
If the voice engine is blocked by acoustic noise or network drop:
1. Tap the **Manual Keyboard / Search** toggle icon in the invoice modal.
2. Type or select the outlet from the searchable dropdown.
3. Select items via the catalogue picker.
4. Save as Draft or Issue Invoice manually.

---

## 5. Post-Pilot Sign-off & Defect Capture

- **Total Scenarios Attempted:** _____ / 50
- **Total Accurately Transcribed:** _____ / 50
- **Total Correct Invoices Generated:** _____ / 50
- **Total Backend Invariant Passes:** _____ / 50
- **Warehouse Operator Signature:** ___________________________________
- **Lead QA Engineer Signature:** ___________________________________
