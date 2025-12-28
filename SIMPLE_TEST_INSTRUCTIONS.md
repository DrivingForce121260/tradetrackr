# Simple Test Instructions

## 🔍 What I Need to Understand

Your CSV file has **3 columns** (Article, Name, Quantity). This IS Type 2 structure.

**Please answer these questions:**

### Question 1: What do you WANT?
- [ ] **Option A**: Save as Type 1 (only Article names, ignore Name and Quantity columns)
- [ ] **Option B**: Save as Type 2 (all 3 columns visible in a table)

### Question 2: What is happening now?
When you upload the CSV via AI Import, what do you see in the preview?

- [ ] A proper 3-column table with headers: Article | Name | Quantity
- [ ] Something broken/weird (describe what)
- [ ] Many families listed instead of just 3
- [ ] Something else (describe)

### Question 3: After clicking "Übernehmen", what happens?
- [ ] Category is created correctly with 3 columns
- [ ] Category is created but looks broken (how?)
- [ ] Error occurs (what error?)

---

## 🎯 Expected Behavior

### Your CSV Should Be Type 2

**Input:**
```csv
Article,Name,Quantity
NYM-J 3x1,5,Installationskabel (m),120
Unterputzdose Ø68,Installationsdose,45
```

**Expected Result (Type 2):**
```
Category: TestCategory
Type: Type 2
Columns: Article | Name | Quantity

Row 1: NYM-J 3x1,5 | Installationskabel (m) | 120
Row 2: Unterputzdose Ø68 | Installationsdose | 45
...
```

**This is CORRECT behavior!**

---

## 🤔 If You Want Type 1 Instead

If you only want the article names (Type 1), create a CSV with just one column:

```csv
Article
NYM-J 3x1,5
Unterputzdose Ø68
Hohlwanddose Ø68
...
```

Then upload this → Will automatically be Type 1

---

## 📸 What Would Help

Please provide:

1. **Screenshot** of the preview table after AI analysis
2. **Screenshot** of the created category (if it completes)
3. **Answers** to the 3 questions above

---

## 💡 My Guess

I suspect one of these is happening:

**Scenario A: AI is creating 30 families (WRONG)**
- AI creates one family per row instead of 3 families total
- This would be a backend AI bug
- Preview would show 30 families listed

**Scenario B: You expected Type 1 (MISUNDERSTANDING)**
- AI correctly identifies as Type 2 (3 columns)
- Creates Type 2 category correctly
- But you wanted Type 1 (only article names)
- Solution: Use single-column CSV

**Scenario C: Frontend isn't detecting correctly (MY BUG)**
- AI returns correct structure
- Frontend misinterprets it
- Creates wrong type

---

## 🔧 Quick Fix Options

### If you want Type 1 from your current CSV:

I can add a button to "Extract First Column Only" that:
1. Takes your 3-column CSV
2. Extracts only the Article column
3. Creates Type 1 with just those names

### If the AI is broken:

I need to see:
1. What the AI returns (console logs)
2. What the preview shows
3. What gets created

---

**Please answer the 3 questions and provide screenshots!**

This will help me fix the exact issue you're experiencing.






