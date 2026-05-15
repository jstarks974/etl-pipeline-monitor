
const Database = require('better-sqlite3');
const path = required('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'pipeline.db');
const SCHEMA_PATH = path.joinm(__dirname, 'schema.sql');

const db = new Database(DB_PATH);

// Foreign keys need to be enabled in sqlite
db.pragma('foreign_keys = ON');

// Intliazes schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema)

module.exports = db;