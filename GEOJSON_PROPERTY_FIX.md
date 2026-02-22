# GeoJSON Property Name Fix + District Filter Fix

## Issues Fixed

### Issue 1: Division Map Showing "Unknown, Violations: 0" ✅

**Root Cause**: Division GeoJSON uses different property names than expected.

**GeoJSON Property Names**:
- **Division GeoJSON** (`bangladesh_divisions_8.geojson`): Uses `NAME_1` property (e.g., "Chattagram", "Dhaka")
- **District GeoJSON** (`bgd_districts.geojson`): Uses `shapeName` property (e.g., "Bagerhat")

**The Bug**: Code was looking for `shapeName` in division GeoJSON, but it doesn't exist! Only `NAME_1` exists.

```json
// Division GeoJSON structure:
{
  "type": "Feature",
  "properties": {
    "ISO": "BD-B",
    "NAME_1": "Chattagram"  ← This is the name property!
  }
}
```

### Issue 2: District Dropdown Not Filtering by Selected Division ✅

**Root Cause**: District extraction was using wrong column AND not filtering by selected division.

**Card 80 Structure**: `[Division, District, Avg Download, ...]`
- Column 0 = Division name
- Column 1 = District name

**The Bug**: Code was extracting column 0 (Divisions) instead of column 1 (Districts), and not filtering by selected division!

```javascript
// OLD CODE (WRONG):
const districts = districtData?.rows
  ? [...new Set(districtData.rows.map((row) => row[0]))].sort()  // ← Column 0 is Division!
  : [];
```

## Solutions Applied

### Fix 1: Use Correct GeoJSON Property Names

**Files Modified**:
1. `src/pages/RegionalAnalysis.jsx` - Changed division map to use `NAME_1`
2. `src/components/maps/ChoroplethMap.jsx` - Added `NAME_1` to property name fallback chain

**RegionalAnalysis.jsx (Line 210)**:
```javascript
// BEFORE:
const result = transformToGeoJSON(mappedRows, divisionGeoJSON, 'shapeName', 0, 1);

// AFTER:
const result = transformToGeoJSON(mappedRows, divisionGeoJSON, 'NAME_1', 0, 1);
//                                                               ^^^^^^^^ Use NAME_1!
```

**ChoroplethMap.jsx (Line 184)**:
```javascript
// BEFORE:
const name = feature.properties.shapeName || feature.properties.name || 'Unknown';

// AFTER:
const name = feature.properties.shapeName || feature.properties.NAME_1 || feature.properties.name || 'Unknown';
//                                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Check NAME_1 too!
```

**handleDivisionClick (Line 278)**:
```javascript
// BEFORE:
const divisionName = feature.properties.shapeName || feature.properties.name;

// AFTER:
const divisionName = feature.properties.NAME_1 || feature.properties.shapeName || feature.properties.name;
//                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Check NAME_1 first!
```

### Fix 2: Filter Districts by Selected Division

**RegionalAnalysis.jsx (Lines 246-260)**:
```javascript
// NEW CODE:
const districts = React.useMemo(() => {
  if (!districtData?.rows) return [];

  let filteredRows = districtData.rows;

  // Filter by selected division (Card 80: row[0] = Division, row[1] = District)
  if (filters.division) {
    filteredRows = filteredRows.filter((row) => row[0] === filters.division);
    console.log(`🔍 Filtering districts by division: ${filters.division}, found ${filteredRows.length} districts`);
  }

  // Extract unique district names (column 1, NOT column 0!)
  const uniqueDistricts = [...new Set(filteredRows.map((row) => row[1]))].sort();
  console.log('📊 Available districts:', uniqueDistricts);
  return uniqueDistricts;
}, [districtData, filters.division]);
```

## Expected Results

### Issue 1: Division Map ✅
**Before**:
- Tooltip: "Unknown, Violations: 0"
- No name shown
- All values = 0

**After**:
- Tooltip: "Dhaka, Violations: 42"
- Correct division names shown
- Actual violation counts displayed

### Issue 2: District Dropdown ✅
**Before**:
- Dropdown showed all districts regardless of selected division
- Or showed division names instead of district names

**After**:
- When no division selected: Shows all districts
- When "Dhaka" selected: Shows only Dhaka's districts (Dhaka, Gazipur, Narayanganj, etc.)
- When "Chattogram" selected: Shows only Chattogram's districts

## Testing Instructions

1. **Refresh browser** (http://localhost:5173/)
2. **Navigate to Regional Analysis tab** (Tab R2.2)
3. **Test Division Map**:
   - Hover over divisions → Should show "Dhaka, Violations: 42" (not "Unknown, Violations: 0")
   - Click on "Dhaka" → Should drill down to districts
   - Console should show: `🖱️ Division clicked: Dhaka from feature: {...}`

4. **Test District Dropdown Filter**:
   - **Step 1**: Open Division dropdown, select "Dhaka"
   - **Step 2**: Open District dropdown
   - **Expected**: Should show only Dhaka districts:
     * Dhaka
     * Gazipur
     * Narayanganj
     * Tangail
     * Kishoreganj
     * Manikganj
     * Munshiganj
     * Narsingdi
     * Rajbari
     * Madaripur
     * Gopalganj
     * Faridpur
     * Shariatpur
   - **Console**: `🔍 Filtering districts by division: Dhaka, found 13 districts`

5. **Test District Map (should already be working)**:
   - After selecting division, district map should show
   - Hover over districts → Should show full metrics (Download, Upload, Latency, Availability)
   - All 64 districts should have values (not 0)

## Console Output to Verify

### Division Map Logs:
```
🗺️ DIVISION MAP: Creating map data
📊 Division data (all rows with values):
  [0] Dhaka = 42 violations
  [1] Chattagram = 35 violations
  [2] Rajshahi = 18 violations
  [3] Khulna = 12 violations
  [4] Barishal = 8 violations
  [5] Sylhet = 10 violations
  [6] Rangpur = 15 violations
  [7] Mymensingh = 10 violations
📊 Division data after mapping:
  [0] Dhaka = 42 violations
  [1] Chittagong = 35 violations  ← Name changed!
  [2] Rajshani = 18 violations    ← Name changed!
  ...
🗺️ Division map GeoJSON features with values:
  Dhaka = 42              ← Should show actual values!
  Chittagong = 35
  Rajshani = 18
  ...
```

### District Filter Logs:
```
🔍 Filtering districts by division: Dhaka, found 13 districts
📊 Available districts: [
  "Dhaka", "Gazipur", "Narayanganj", "Tangail", "Kishoreganj",
  "Manikganj", "Munshiganj", "Narsingdi", "Rajbari", "Madaripur",
  "Gopalganj", "Faridpur", "Shariatpur"
]
```

## GeoJSON Property Reference

### Division GeoJSON Properties:
```json
{
  "ISO": "BD-B",        // BD-A to BD-H (division code)
  "NAME_1": "Chattagram" // Division name (use this for matching!)
}
```

### District GeoJSON Properties:
```json
{
  "shapeName": "Bagerhat",  // District name (use this for matching!)
  "shapeISO": "",
  "shapeID": "...",
  "shapeGroup": "BGD",
  "shapeType": "ADM2"
}
```

## Summary

✅ **Fixed**: Division map now uses `NAME_1` property (shows correct names and values)
✅ **Fixed**: District dropdown now filters by selected division
✅ **Fixed**: District extraction now uses column 1 (District names), not column 0 (Division names)
✅ **Enhanced**: Added logging for division clicks and district filtering

**Status**: COMPLETE ✅
**Deployed**: HMR updated 4 times at 3:26 PM
**Ready**: For testing

---

**Last Updated**: 2026-02-16 3:27 PM
**Files Modified**:
- `src/pages/RegionalAnalysis.jsx` - Fixed division map property name + district filtering
- `src/components/maps/ChoroplethMap.jsx` - Added NAME_1 to property name checks
