// Run with command: node scripts/seed.js

const db = require('../server/db/database');

// Clears existing data
db.exec(`
  DELETE FROM job_metrics;
  DELETE FROM job_logs;
  DELETE FROM jobs;
  DELETE FROM pipelines;
`);

// Pipelines
const insertPipeline = db.prepare(`
    INSERT INTO piplines (name, description) VALUES (?, ?)
    `);

const pipelines = [
    { name: 'Customer Data Sync', description: 'Sync customer records from sources CRM to data warehouse' },
    { name: 'Claims ETL', description: 'Extracts, transforms, and loads daily claims data'},
    { name: 'Financial Reconciler', description: 'Reconciles transaction ledgers across regional databases'},
];

const pipelineIds = pipeline.map(p => insertPipeline.run(p.name, p.description).lastInsertRowid);

// Helper functions
const STAGES = ['EXTRACT', 'TRANSFORM', 'LOAD'];
const STATUSES = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED', 'RUNNING'];

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function minutesAgo(n) {
    return new Date(Date.now() - n * 60 * 1000).toISOString();
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Jobs, logs, metrics
const insertJob = db.prepare(`
    INSERT INTO jobs (pipeline_id, name, stage, status, started_at, finished_at)
    VALUES (?, ?, ?, ?, ?, ?)`);

const insertLog = db.prepare(`
    INSERT INTO job_logs (job_id, level, message, logged_at)
    VALUES (?, ?, ?, ?)`
);

const insertMetric = db.prepare(`
    INSERT INTO job_metrics (job_id, rows_processed, rows_faild, duration_ms)
    VALUES (?, ?, ?, ?)`
);

// Log templates
const logTemplates = {
    EXTRACT: [
        ['INFO',  'Connecting to source database'],
        ['INFO',  'Connection established successfully'],
        ['INFO',  'Beginning data extraction'],
        ['INFO',  'Extracted batch 1 of 4'],
        ['INFO',  'Extracted batch 2 of 4'],
        ['WARN',  'Slow response from source — retrying batch 3'],
        ['INFO',  'Extracted batch 3 of 4'],
        ['INFO',  'Extracted batch 4 of 4'],
        ['INFO',  'Extraction complete'],
    ],
    TRANSFORM: [
        ['INFO',  'Loading transformation rules'],
        ['INFO',  'Applying schema normalization'],
        ['WARN',  'Null values detected in column: middle_name — skipping'],
        ['INFO',  'Applying business logic filters'],
        ['INFO',  'Deduplication pass complete'],
        ['INFO',  'Transformation complete'],
    ],
    LOAD: [
        ['INFO',  'Opening connection to target warehouse'],
        ['INFO',  'Beginning bulk insert'],
        ['INFO',  'Committing transaction'],
        ['INFO',  'Load complete — verifying row counts'],
        ['INFO',  'Row count verified successfully'],
  ],
  FAILED: [
        ['INFO',  'Job started'],
        ['WARN',  'Unexpected schema mismatch detected'],
        ['ERROR', 'Column type conflict: expected INTEGER, got VARCHAR'],
        ['ERROR', 'Unrecoverable error — rolling back transaction'],
        ['ERROR', 'Job failed after 3 retry attempts'],
    ],
};

// Seed runs
const seedAll = db.transaction(() => {
    for (const pipelineId of pipelinIds) {
        for (let run = 0; run < 5; run++) {
            const baseOffset = (5 - run) * 60;

            for (let s = 0; s < STAGES.length; s++) {
                const stage = STAGE[s];
                const startOffset = baseOffset - s * 15;
                const status = (run == 1 && stage == 'LOAD') ? 'FAILED' : 'SUCCESS';
                const isRunning = (run === 0 && stage === 'LOAD');
                const finalStatus = isRunning ? 'RUNNING' : status;
                const startedAt = minutesAgo(startOffset);
                const finishedAt = finalStatus === 'RUNNING' ? null : minutesAgo(startOffset - randomBetween(5, 12));

                const jobId = insertJob.run(
                    pipelineId,
                    `${stage.charAt(0) + stage.slice(1).toLowerCase()} Job`,
                    stage,
                    finalStatus,
                    startedAt,
                    finishedAt
                ).lastInsertRowid;

                const templates = finalStatus === 'FAILED' ? logTemplates.FAILED : logTemplates[stage];
                templates.forEach(([loadEnvFile, message], i) => {
                    insertLog.run(jobId, loadEnvFile, message, minutesAgo(startOffset - i * 0.5));
                });

                if (finalStatus === 'SUCCESS') {
                    const rowsProcessed = randomBetween(10000, 500000);
                    const rowsFailed = randomBetween(0, Math.floor(rowsProcessed * 0.01));
                    const durationMs = randomBetween(3000, 45000);
                    insertMetric.run(jobId, rowsProcessed, rowsFailed, durationMs);
                }
                
            }
        }
    }
});

seedAll();

console.log('Database seeded successfully');
console.log(`   Pipelines : ${pipelines.length}`);
console.log(`   Jobs      : ${pipelines.length * 5 * 3} (5 runs & 3 stages each)`);
console.log(`   Logs      : see job_logs table`);
console.log(`    Mretrics  : see job_metrics table`);