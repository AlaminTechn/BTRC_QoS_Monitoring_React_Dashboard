# District Name Mapping Fix - Root Cause Analysis

## Problem Identified

**Root Cause**: The `applyNameMapping` function was mapping the wrong column for district data.

### Data Structure
Card 80 (District Ranking) returns:
```
[0] = Division name
[1] = District name  ← This needs mapping!
[2] = Avg Download (Mbps)
[3] = Avg Upload (Mbps)
[4] = Avg Latency (ms)
[5] = Availability (%)
[6] = ISP Count
[7] = PoP Count
```

### The Bug
The original `applyNameMapping` function was hardcoded to map **column 0** (Division names), but for district data, we need to map **column 1** (District names).

```javascript
// OLD CODE (WRONG):
applyNameMapping(districtData.rows, DISTRICT_NAME_MAPPING)
// This mapped column 0 (Division), not column 1 (District)!
```

This caused 23 districts to be unmatched because:
- Database has: "Bogura", "Chattogram", "Coxsbazar", etc.
- GeoJSON has: "Bogra", "Chittagong", "Cox's Bazar", etc.
- The mapping was applied to the wrong column, so districts remained unmapped

## Solution Applied

### 1. Fixed `applyNameMapping` Function
**File**: `src/utils/dataTransform.js`

Added a `nameColumn` parameter:
```javascript
export const applyNameMapping = (rows, mapping, nameColumn = 0) => {
  if (!rows || rows.length === 0) return rows;

  return rows.map((row) => {
    const name = row[nameColumn];
    const mappedName = mapping[name] || name;

    // Replace the name at the specified column
    const newRow = [...row];
    newRow[nameColumn] = mappedName;
    return newRow;
  });
};
```

### 2. Updated District Mapping Call
**File**: `src/pages/RegionalAnalysis.jsx`

Now correctly maps column 1 (District names):
```javascript
// Apply name mapping to column 1 (District names)
const mappedRows = applyNameMapping(districtData.rows, DISTRICT_NAME_MAPPING, 1);
//                                                                            ^ Column 1!
```

### 3. Enhanced Logging
Added comprehensive debug logs to track:
- District names before mapping (column 1)
- District names after mapping
- Division data with values (name + violation count)
- GeoJSON feature values after transformation

## Expected Results

### Before Fix:
- ❌ Only 1/64 districts matched
- ❌ 23 districts showed value = 0
- ❌ Console: "❌ Unmatched: Bogra, Chittagong, Cox's Bazar..." (even though mappings existed!)

### After Fix:
- ✅ Should see 64/64 districts matched (or very close)
- ✅ District map should show correct Avg Download values
- ✅ Console should show successful mappings:
  ```
  📊 District names before mapping: ["Bogura", "Chattogram", "Coxsbazar", ...]
  📊 District names after mapping: ["Bogra", "Chittagong", "Cox's Bazar", ...]
  ✅ Matched: Bogra = 41.34
  ✅ Matched: Chittagong = 39.87
  ```

## Testing Instructions

1. **Refresh the browser** (http://localhost:5173/)
2. **Navigate to Regional Analysis tab**
3. **Open browser console (F12)**
4. **Check console output**:

### Look for District Map Logs:
```
🗺️ DISTRICT MAP: Creating map data
📊 District data sample (first 3 rows): [...]
📊 District names before mapping: ["Dhaka", "Bogura", "Chattogram", ...]
📊 District names after mapping: ["Dhaka", "Bogra", "Chittagong", ...]
🗺️ Matched 64/64 features  ← Should be 64/64 or close!
```

### Look for Division Map Logs:
```
🗺️ DIVISION MAP: Creating map data
📊 Division data (all rows with values):
  [0] Dhaka = 42 violations
  [1] Chattogram = 35 violations
  [2] Rajshahi = 18 violations
  ...
📊 Division data after mapping:
  [0] Dhaka = 42 violations
  [1] Chittagong = 35 violations  ← Name changed!
  [2] Rajshani = 18 violations    ← Name changed!
  ...
🗺️ Division map GeoJSON features with values:
  Dhaka = 42
  Chittagong = 35
  Rajshani = 18
  ...
```

## Remaining Issues to Check

### Division Map Showing "Violations: 0"
**Status**: Need console logs to diagnose

**Possible causes**:
1. Card 87 (violation data) column structure is different than expected
2. Division name mapping not matching GeoJSON shapeName
3. Aggregation logic summing wrong column

**What to check in console**:
- Are the raw violation counts > 0 in "Division data (all rows with values)"?
- Do the division names after mapping match the GeoJSON shapeName?
- Are the GeoJSON feature values > 0?

## Name Mappings Reference

### Division Mappings
```javascript
export const DIVISION_NAME_MAPPING = {
  Chattagram: 'Chittagong',  // BD-B
  Rajshahi: 'Rajshani',      // BD-E
};
```

### District Mappings (All 12)
```javascript
export const DISTRICT_NAME_MAPPING = {
  Bogura: 'Bogra',
  Brahmanbaria: 'Brahamanbaria',
  Chapainawabganj: 'Nawabganj',
  Chattogram: 'Chittagong',
  Coxsbazar: "Cox's Bazar",
  Jashore: 'Jessore',
  Jhalakathi: 'Jhalokati',
  Moulvibazar: 'Maulvibazar',
  Netrokona: 'Netrakona',
  Rajbari: 'Rajbari',      // Identity mapping
  Sirajganj: 'Sirajganj',  // Identity mapping
  Sunamganj: 'Sunamganj',  // Identity mapping
};
```

## Summary

✅ **Fixed**: District name mapping now correctly maps column 1 (District names)
✅ **Enhanced**: Added detailed logging for both division and district maps
⏳ **Pending**: Verify division map shows correct violation counts (need console output)

**Action Required**: Check browser console for the new detailed logs and share output if issues persist.

---

**Last Updated**: 2026-02-16 3:00 PM
**Files Modified**:
- `src/utils/dataTransform.js` - Fixed applyNameMapping to accept nameColumn parameter
- `src/pages/RegionalAnalysis.jsx` - Updated district mapping call + enhanced logging
