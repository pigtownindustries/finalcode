# Cash Payment Helper Feature

## 🎯 Overview
Fitur helper untuk kasir menghitung kembalian pembayaran tunai. Cash dan kembalian **ditampilkan lengkap di struk** tapi **tidak disimpan ke database** (hanya helper UI).

## ✅ Features Implemented

### 1. UI Components
- ✅ Input field nominal uang diterima (auto-format Rupiah)
- ✅ Tombol **"PASS BROO!!!"** untuk uang pas (auto-fill exact amount)
- ✅ Display kembalian real-time dengan background hijau
- ✅ Warning merah jika uang kurang (tetap bisa checkout)
- ✅ Conditional: hanya muncul untuk payment method "Tunai"

### 2. Business Logic
- ✅ State: `cashAmount` (formatted string), `changeAmount` (number)
- ✅ Helper: `formatRupiah()`, `parseRupiah()`, `handleCashAmountChange()`
- ✅ NO validation - checkout tanpa input cash = OK
- ✅ Data flow: Input → State → currentTransaction (memory) → Receipt
- ✅ NOT saved to database (cash_amount, change_amount)

### 3. Receipt Templates (ALL UPDATED ✅)
**Semua format struk sudah diupdate untuk menampilkan cash details:**

#### A. HTML Receipt (Browser Print)
```
TOTAL: Rp 50.000
Pembayaran: cash
Uang Diterima: Rp 100.000
Kembalian: Rp 50.000
```

#### B. Bluetooth Thermal Printer
```
TOTAL: Rp 50.000
--------------------------------
Pembayaran: cash
Uang Diterima: Rp 100.000
Kembalian: Rp 50.000
--------------------------------
```

#### C. Receipt Preview Modal
- Display real-time di modal setelah checkout
- Format sama dengan print version

**Conditional Display:** Cash details hanya muncul jika kasir input cash amount (tidak paksa)

### 4. Database
- ✅ **NO migration needed**
- ✅ **NO new columns**
- ✅ Cash data in memory only (lighter & faster)

## 📋 Use Cases

### Scenario 1: Uang Pas dengan "PASS BROO!!!"
```
1. Total: Rp 50.000
2. Klik tombol "PASS BROO!!!"
3. Input auto-fill: "50.000"
4. Kembalian: Rp 0
5. Checkout → Struk:
   Uang Diterima: Rp 50.000
   Kembalian: Rp 0
```

### Scenario 2: Ada Kembalian
```
1. Total: Rp 35.000
2. Customer kasih: Rp 100.000
3. Kasir input: "100.000"
4. System hitung: Kembalian Rp 65.000 (hijau)
5. Checkout → Struk:
   Uang Diterima: Rp 100.000
   Kembalian: Rp 65.000
```

### Scenario 3: Skip Input (Struk Tanpa Cash Details)
```
1. Total: Rp 50.000
2. Kasir skip input (kosong)
3. Checkout langsung
4. Struk: Hanya "Pembayaran: cash" (no cash details)
```

## 🧪 Testing Checklist

### TC1: PASS BROO Button + Full Receipt
- [ ] Total Rp 50.000, klik "PASS BROO!!!"
- [ ] Input auto-fill "50.000", kembalian Rp 0
- [ ] Checkout success
- [ ] Struk tampilkan: Uang Diterima & Kembalian

### TC2: Manual Input dengan Kembalian
- [ ] Total Rp 35.000, input "100.000"
- [ ] Kembalian real-time: Rp 65.000 (background hijau)
- [ ] Checkout success
- [ ] Struk lengkap dengan cash details

### TC3: Input Kosong (No Cash Details)
- [ ] Pilih "Tunai", skip input
- [ ] Checkout tanpa error
- [ ] Struk: "Pembayaran: cash" only

### TC4: Non-Cash Payment
- [ ] Pilih "Kartu Debit" / "QRIS"
- [ ] Input cash tidak muncul
- [ ] Checkout normal

### TC5: HTML Print
- [ ] Cash payment dengan input
- [ ] Klik "Print Struk"
- [ ] Browser print menampilkan cash details

### TC6: Bluetooth Thermal Print
- [ ] Connect bluetooth printer
- [ ] Cash payment dengan input
- [ ] Thermal print tampilkan cash details

## 📁 Files Modified

### `components/pos-system.tsx`
```
Line 1231-1271: "PASS BROO!!!" button + cash input UI
Line 700-702:   Removed cash validation
Line 720-732:   transactionData (no DB save)
Line 817-827:   currentTransaction (with cash for receipt)
Line 383-397:   HTML receipt template (with cash)
Line 553-559:   Bluetooth receipt (with cash)
Line 1457-1468: Preview modal (with cash)
```

## 🎯 Data Flow Architecture

```
┌─────────────┐
│ User Input  │ "100.000"
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ State Management    │
│ - cashAmount        │ formatRupiah → "100.000"
│ - changeAmount      │ calculate   → 50000
└──────┬──────────────┘
       │
       ▼ (Checkout)
┌─────────────────────────────┐
│ currentTransaction (memory) │ ← For receipt display
│ - cash_amount: 100000       │
│ - change_amount: 50000      │
└──────┬──────────────────────┘
       │
       ▼
┌──────────────────┐
│ Receipt Display  │ All formats show cash details
│ - HTML Print     │
│ - Bluetooth      │
│ - Preview Modal  │
└──────────────────┘

❌ NOT SAVED TO DATABASE
```

## 💡 Design Philosophy

### Why Display but Not Save?
1. **Receipt Purpose:** Customer needs proof of exact cash transaction
2. **Database Clean:** No need for permanent cash tracking
3. **Performance:** Lighter transactions, no extra columns
4. **Flexibility:** Optional input, no validation pressure
5. **Compliance:** Receipt shows complete transaction info

### Receipt Template Impact
✅ **SEMUA template struk sudah diupdate:**
- HTML receipt (browser print)
- Bluetooth thermal printer
- Preview modal

✅ **Format konsisten** across all templates
✅ **Conditional display** - hanya muncul jika ada input

## 🚀 Ready to Use
- No database migration required
- All receipt formats updated
- Optional but complete when used
- Professional struk display
