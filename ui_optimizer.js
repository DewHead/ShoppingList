import puppeteer from 'puppeteer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION ---
const TARGET_URL = 'http://localhost:5173';
// Use provided key if env var is missing
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB9CWs4un6991jfEOUVI_22RAUcEDKrtyA'; 
const MODEL_NAME = 'gemini-2.0-flash-exp'; 

const ROUTE_MAP = [
  { route: '/', file: 'client/src/pages/ShoppingListPage.tsx', name: 'Shopping List' },
  { route: '/comparison', file: 'client/src/pages/ComparisonPage.tsx', name: 'Comparison' },
  { route: '/settings', file: 'client/src/pages/SettingsPage.tsx', name: 'Settings' }
];

const MAX_ITERATIONS = 5;

if (!GEMINI_API_KEY) {
  console.error(chalk.red('Error: GEMINI_API_KEY is missing.'));
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: `
Role: Lead Designer for a high-performance SaaS (Style Reference: Linear, Todoist).
Goal: Refactor the UI to match the "Daily Driver" aesthetic.

Design Mandates (The Standard):
- Borders > Shadows: Kill drop shadows. Use crisp 1px borders (borderColor: 'divider' or #e5e7eb).
- Density: Pack data tightly. Use horizontal lists with separators. Reduce padding (p={2}).
- Navigation: Use Sidebar Navigation (Left Panel) for Settings.
- Status: Use explicit, small Chips/Badges for status (Green="Winner", Red="Error").
- MUI: Use <Paper variant="outlined"> instead of elevation.

Scoring & Action: Rate the UI 0-100.
IF SCORE < 99: Rewrite the code to fix the flaws. Return ONLY the code.
IF SCORE >= 99: Return the string "SATISFIED" (signals the loop to stop).

CRITICAL Constraints:
- I18n Integrity: NEVER hardcode text. Preserve t('key') hooks.
- Logic Safety: Keep all event handlers, state, effects, and socket listeners EXACTLY as is.
- Output: Either valid .tsx code OR the string "SATISFIED".
`
});

async function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function captureState(page) {
    try {
        const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
        return screenshot;
    } catch (e) {
        console.error(chalk.red("Screenshot failed"), e);
        return null;
    }
}

async function checkHealth(page) {
    const errors = [];
    
    const errorListener = msg => {
        if (msg.type() === 'error') errors.push(`Console Error: ${msg.text()}`);
    };
    const pageErrorListener = err => {
        errors.push(`Page Error: ${err.toString()}`);
    };

    page.on('console', errorListener);
    page.on('pageerror', pageErrorListener);

    const isRootEmpty = await page.evaluate(() => {
        const root = document.getElementById('root');
        return !root || root.innerHTML.trim() === '' || root.clientHeight === 0;
    });

    if (isRootEmpty) errors.push('Root element is empty or has 0 height');

    // Wait a bit to catch immediate render errors
    await delay(1000);

    page.off('console', errorListener);
    page.off('pageerror', pageErrorListener);

    return { healthy: errors.length === 0, errors };
}

async function runOptimizer() {
  console.log(chalk.blue(`🚀 Starting UI Optimizer (Cowboy Mode - Autonomous)...`));
  
  const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      for (const { route, file, name } of ROUTE_MAP) {
        const fullFilePath = path.join(__dirname, file);
        console.log(chalk.magenta(`\n📂 Processing Route: ${route} (${file})`));

        // Self-Perfection Loop
        for (let i = 1; i <= MAX_ITERATIONS; i++) {
            console.log(chalk.cyan(`\n  ↺ Iteration ${i}/${MAX_ITERATIONS}`));

            // 1. Initialize & Backup
            let previousCode;
            try {
                previousCode = await fs.readFile(fullFilePath, 'utf-8');
            } catch(e) { 
                console.log(chalk.red(`  File not found: ${file}`)); 
                break; // Skip route
            }

            // 2. Browse & Capture
            console.log(chalk.cyan(`  🌐 Navigating to ${TARGET_URL}${route}...`));
            try {
                await page.goto(`${TARGET_URL}${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
            } catch(e) {
                console.log(chalk.yellow(`  Navigation warning: ${e.message}`));
            }

            // Health Check 1 (Pre-Flight)
            const preHealth = await checkHealth(page);
            if (!preHealth.healthy) {
                console.log(chalk.red(`  ⚠️ App unstable (Pre-Flight). Skipping route.`));
                console.log(chalk.gray(preHealth.errors.join('\n')));
                break; // Skip this route if already broken
            }

            // 3. Consult Gemini
            console.log(chalk.yellow(`  🤖 Consulting Gemini (${name})...`));
            const screenshot = await captureState(page);
            if (!screenshot) continue;
            
            try {
                const result = await model.generateContent({
                    contents: [
                        {
                            role: "user", 
                            parts: [
                                { text: `Critique and improve this UI.\n\nSource Code:\n${previousCode}` },
                                { inlineData: { mimeType: "image/png", data: screenshot } }
                            ] 
                        }
                    ]
                });
                
                let responseText = result.response.text().trim();
                let newCode = responseText.replace(/```tsx|```typescript|```/g, '').trim();

                // Loop Decision
                if (responseText.includes("SATISFIED")) {
                    console.log(chalk.green(`  ✨ Gemini is SATISFIED. Stopping loop for this route.`));
                    break;
                }

                // Safety: Code Length Check
                if (newCode.length < previousCode.length * 0.5) {
                    console.log(chalk.red(`  ⚠️ Safety Alert: New code is too short (<50%). Aborting iteration.`));
                    continue;
                }

                // 4. Apply Change
                console.log(chalk.green(`  🎨 Applying changes (Cowboy Mode)...`));
                await fs.writeFile(fullFilePath, newCode);

                // 5. Verify & Heal
                console.log(chalk.blue(`  ⏳ Verifying (Waiting 5s for HMR)...`));
                await delay(5000);

                const postHealth = await checkHealth(page);
                
                if (postHealth.healthy) {
                    console.log(chalk.green(`  ✅ Build is Healthy.`));
                    // Continue to next iteration
                } else {
                    // ENTER REPAIR MODE
                    console.log(chalk.red(`  🚨 Broken build detected! Attempting AI Repair...`));
                    console.log(chalk.gray(postHealth.errors.join('\n')));

                    try {
                        const repairModel = genAI.getGenerativeModel({ model: MODEL_NAME });
                        const repairResult = await repairModel.generateContent({
                            contents: [{ 
                                role: "user", 
                                parts: [{ text: `You broke the build with this error: ${postHealth.errors.join('\n')}. Fix the syntax/logic immediately. Do not change the design. Return ONLY the fixed code.\n\nBroken Code:\n${newCode}` }]
                            }]
                        });
                        
                        const fixedCode = repairResult.response.text().replace(/```tsx|```typescript|```/g, '').trim();
                        await fs.writeFile(fullFilePath, fixedCode);
                        
                        console.log(chalk.blue(`  ⏳ Verifying Repair (5s)...`));
                        await delay(5000);

                        const repairHealth = await checkHealth(page);
                        if (repairHealth.healthy) {
                            console.log(chalk.green(`  ✅ Repair successful.`));
                        } else {
                            throw new Error("Repair failed");
                        }

                    } catch (repairError) {
                        // EMERGENCY ROLLBACK
                        console.log(chalk.red(`  🔥 Repair failed. EMERGENCY ROLLBACK.`));
                        await fs.writeFile(fullFilePath, previousCode);
                        console.log(chalk.gray(`  Restored safe state.`));
                        break; // Stop loop for this route
                    }
                }

            } catch (error) {
                console.error(chalk.red(`  ❌ Error in loop:`), error);
                await fs.writeFile(fullFilePath, previousCode); // Rollback
            }
        }
      }

  } finally {
      await browser.close();
      console.log(chalk.green(`\n🏁 Optimization Complete.`));
  }
}

runOptimizer();