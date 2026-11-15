/**
 * StudySpot Cafe - Database Configuration
 * Configures SQLite database connection, enables foreign keys,
 * initializes tables, provides transaction helpers and seed data.
 */

const path = require('path');
const fs = require('fs');

// Path to SQLite database file
const dbDir = path.resolve(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbFilePath = process.env.NODE_ENV === 'test'
  ? path.join(dbDir, 'studyspot_test.db')
  : path.join(dbDir, 'studyspot.db');

// SQLite connection setup using node:sqlite (native Node 22+) with fallback to better-sqlite3
let dbInstance = null;

function getDatabase(customPath) {
  const targetPath = customPath || dbFilePath;
  
  try {
    // Attempt node:sqlite first (zero-dependency native engine in modern Node)
    const { DatabaseSync } = require('node:sqlite');
    const rawDb = new DatabaseSync(targetPath);
    
    // Wrap to provide standardized, bulletproof interface
    const wrapper = {
      raw: rawDb,
      exec(sql) {
        return rawDb.exec(sql);
      },
      prepare(sql) {
        const stmt = rawDb.prepare(sql);
        return {
          run(...params) {
            return stmt.run(...params);
          },
          get(...params) {
            return stmt.get(...params);
          },
          all(...params) {
            return stmt.all(...params);
          }
        };
      },
      transaction(fn) {
        return (...args) => {
          rawDb.exec('BEGIN IMMEDIATE;');
          try {
            const result = fn(...args);
            rawDb.exec('COMMIT;');
            return result;
          } catch (error) {
            rawDb.exec('ROLLBACK;');
            throw error;
          }
        };
      },
      close() {
        if (typeof rawDb.close === 'function') {
          rawDb.close();
        }
      }
    };
    return wrapper;
  } catch (err) {
    // Fallback to better-sqlite3 if node:sqlite is unavailable
    const Database = require('better-sqlite3');
    const rawDb = new Database(targetPath);
    return {
      raw: rawDb,
      exec(sql) {
        return rawDb.exec(sql);
      },
      prepare(sql) {
        const stmt = rawDb.prepare(sql);
        return {
          run(...params) {
            return stmt.run(...params);
          },
          get(...params) {
            return stmt.get(...params);
          },
          all(...params) {
            return stmt.all(...params);
          }
        };
      },
      transaction(fn) {
        return rawDb.transaction(fn);
      },
      close() {
        return rawDb.close();
      }
    };
  }
}

const db = getDatabase();

// Enable foreign key constraints
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initialize all database tables according to specifications:
 * 1. Students: id, name, email (UNIQUE)
 * 2. Carrels: id, name, zone, status (Available or Booked)
 * 3. Bookings: id, student_id (FK), carrel_id (FK), booking_date, status (Active or Returned)
 */
function initializeTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS carrels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      zone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available', 'Booked'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      carrel_id INTEGER NOT NULL REFERENCES carrels(id) ON DELETE CASCADE,
      booking_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Returned'))
    );
  `);
}

/**
 * Seed initial sample data including:
 * - Student Asha
 * - Student Ravi
 * - Carrel 4 (and additional carrels for zones A, B, C)
 */
function seedDatabase() {
  initializeTables();

  const countStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  if (countStudents === 0) {
    const insertStudent = db.prepare('INSERT INTO students (name, email) VALUES (?, ?)');
    insertStudent.run('Asha', 'asha@studyspot.com');
    insertStudent.run('Ravi', 'ravi@studyspot.com');
    insertStudent.run('Maya', 'maya@studyspot.com');
    insertStudent.run('Dev', 'dev@studyspot.com');
  }

  const countCarrels = db.prepare('SELECT COUNT(*) as count FROM carrels').get().count;
  if (countCarrels === 0) {
    const insertCarrel = db.prepare('INSERT INTO carrels (name, zone, status) VALUES (?, ?, ?)');
    insertCarrel.run('Carrel 1', 'A', 'Available');
    insertCarrel.run('Carrel 2', 'A', 'Available');
    insertCarrel.run('Carrel 3', 'B', 'Available');
    insertCarrel.run('Carrel 4', 'B', 'Available');
    insertCarrel.run('Carrel 5', 'C', 'Available');
  }
}

/**
 * Reset database to clean initial state (used in automated testing)
 */
function resetDatabase() {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DROP TABLE IF EXISTS bookings;');
  db.exec('DROP TABLE IF EXISTS carrels;');
  db.exec('DROP TABLE IF EXISTS students;');
  db.exec('PRAGMA foreign_keys = ON;');
  seedDatabase();
}

// Ensure tables exist on boot
initializeTables();

module.exports = {
  db,
  getDatabase,
  initializeTables,
  seedDatabase,
  resetDatabase
};

