/**
 * Test script to verify fixes for Friendly Competition app
 * Run with: node test_fixes.js
 */

const fs = require("fs");
const path = require("path");

console.log("Testing Friendly Competition fixes...\n");

// Test 1: Check useAppData.ts fixes
console.log("1. Testing useAppData.ts...");
const useAppDataPath = path.join(__dirname, "src/hooks/useAppData.ts");
if (fs.existsSync(useAppDataPath)) {
    const content = fs.readFileSync(useAppDataPath, "utf8");
    
    // Check leaderboard fix
    if (content.includes("userMap.get(userData.id)!.racePoints[race.round] = 0;")) {
        console.log("   ✓ Leaderboard calculation bug fixed");
    } else {
        console.log("   ✗ Leaderboard calculation bug NOT fixed");
    }
    
    // Check unused imports removed
    if (!content.includes("getCachedData") && !content.includes("setCachedData")) {
        console.log("   ✓ Unused imports removed");
    } else {
        console.log("   ✗ Unused imports still present");
    }
    
    // Check exports
    if (content.includes("refreshAllData") && 
        content.includes("refreshFromAPI: refreshAllData") && 
        content.includes("refreshSingleRace: refreshAllData")) {
        console.log("   ✓ All required exports present");
    } else {
        console.log("   ✗ Missing exports");
    }
    
    // Check POST changed to GET
    if (content.includes("method: \"GET\",") && !content.includes("method: \"POST\",")) {
        console.log("   ✓ HTTP method changed from POST to GET");
    } else {
        console.log("   ✗ HTTP method not fixed");
    }
} else {
    console.log("   ✗ useAppData.ts not found");
}

// Test 2: Check RaceInfo.tsx fixes
console.log("\n2. Testing RaceInfo.tsx...");
const raceInfoPath = path.join(__dirname, "src/components/RaceInfo.tsx");
if (fs.existsSync(raceInfoPath)) {
    const content = fs.readFileSync(raceInfoPath, "utf8");
    
    // Check interface has onRefreshSingle
    if (content.includes("onRefreshSingle: () => Promise<void>;")) {
        console.log("   ✓ onRefreshSingle prop added to interface");
    } else {
        console.log("   ✗ onRefreshSingle prop missing from interface");
    }
    
    // Check function params
    if (content.includes("onRefreshSingle:")) {
        console.log("   ✓ onRefreshSingle in function parameters");
    } else {
        console.log("   ✗ onRefreshSingle missing from function parameters");
    }
} else {
    console.log("   ✗ RaceInfo.tsx not found");
}

// Test 3: Check CSS classes
console.log("\n3. Testing CSS classes...");
const globalsPath = path.join(__dirname, "src/app/globals.css");
if (fs.existsSync(globalsPath)) {
    const content = fs.readFileSync(globalsPath, "utf8");
    
    if (content.includes(".btn-ghost {")) {
        console.log("   ✓ .btn-ghost class defined");
    } else {
        console.log("   ✗ .btn-ghost class missing");
    }
    
    if (content.includes(".text-muted {")) {
        console.log("   ✓ .text-muted class defined");
    } else {
        console.log("   ✗ .text-muted class missing");
    }
} else {
    console.log("   ✗ globals.css not found");
}

// Test 4: Check API route exists
console.log("\n4. Testing API routes...");
const dataRoutePath = path.join(__dirname, "src/app/api/data/route.ts");
const racesRoutePath = path.join(__dirname, "src/app/api/races/route.ts");

if (fs.existsSync(dataRoutePath)) {
    console.log("   ✓ /api/data route exists");
} else {
    console.log("   ✗ /api/data route missing");
}

if (fs.existsSync(racesRoutePath)) {
    console.log("   ✓ /api/races route exists");
} else {
    console.log("   ✗ /api/races route missing");
}

console.log("\nTesting complete!");
