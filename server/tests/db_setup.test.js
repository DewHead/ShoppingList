const { initDb } = require('../db');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const TEST_DB = path.join(__dirname, 'test_database.sqlite');

describe('Database Setup and Seeding', () => {
    let db;

    beforeAll(async () => {
        // Ensure clean start
        if (fs.existsSync(TEST_DB)) {
            fs.unlinkSync(TEST_DB);
        }
    });

    afterAll(async () => {
        if (db) {
            await db.close();
        }
        if (fs.existsSync(TEST_DB)) {
            fs.unlinkSync(TEST_DB);
        }
    });

    it('should NOT contain Tayo and SHOULD contain Tiv Taam after initialization', async () => {
        db = await initDb('test_database.sqlite');
        
        const supermarkets = await db.all('SELECT name FROM supermarkets');
        const names = supermarkets.map(s => s.name);

        expect(names).not.toContain('טאיו (חיים יחיל)');
        expect(names).toContain('טיב טעם');
    });

    it('should remove existing Tayo entry during migration', async () => {
        // Create a DB with Tayo
        const tempDbFile = 'migration_test.sqlite';
        const tempDbPath = path.join(__dirname, tempDbFile);
        if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);

        const tempDb = await open({
            filename: tempDbPath,
            driver: sqlite3.Database
        });

        await tempDb.exec('CREATE TABLE supermarkets (id INTEGER PRIMARY KEY, name TEXT, url TEXT)');
        await tempDb.run('INSERT INTO supermarkets (name, url) VALUES (?, ?)', ['טאיו (חיים יחיל)', 'https://tayo.co.il/']);
        await tempDb.close();

        // Run initDb which should trigger migration
        const migratedDb = await initDb(tempDbFile);
        const count = await migratedDb.get('SELECT COUNT(*) as count FROM supermarkets WHERE name LIKE ?', ['%טאיו%']);
        
        expect(count.count).toBe(0);
        await migratedDb.close();
        if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    });
});
