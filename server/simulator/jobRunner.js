// Simulates pipeline jobs running on a schedule
// Required by server/index.js — runs automatically when the server starts

const cron = require('node-cron');
const db = require('../db/database');

// Helpers 
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Weighted random status
  const roll = Math.random();
  if (roll < 0.80) return 'SUCCESS';
  if (roll < 0.95) return 'FAILED';
  return 'SUCCESS'; 
}

// Log Templates 
  EXTRACT: [
    ['INFO',  'Connecting to source database'],
    ['INFO',  'Connection established successfully'],
    ['INFO',  'Beginning data extraction'],
    ['WARN',  'Slow response from source — retrying'],
    ['INFO',  'Extraction complete'],
  ],
  TRANSFORM: [
    ['INFO',  'Loading transformation rules'],
    ['INFO',  'Applying schema normalization'],
    ['WARN',  'Null values detected in column: middle_name — skipping'],
    ['INFO',  'Transformation complete'],
  ],
  LOAD: [
    ['INFO',  'Opening connection to target warehouse'],
    ['INFO',  'Beginning bulk insert'],
    ['INFO',  'Committing transaction'],
    ['INFO',  'Load complete — verifying row counts'],
  ],
  FAILED: [
    ['INFO',  'Job started'],
    ['WARN',  'Unexpected schema mismatch detected'],
    ['ERROR', 'Column type conflict: expected INTEGER, got VARCHAR'],
    ['ERROR', 'Unrecoverable error — rolling back transaction'],
    ['ERROR', 'Job failed after 3 retry attempts'],
  ],
};

// Core Job Runner
async function runJob(pipelineId, stage) {
  const now = new Date().toISOString();

  // Insert job as RUNNING
  const jobId = db.prepare(`
    INSERT INTO jobs (pipeline_id, name, stage, status, started_at)
    VALUES (?, ?, ?, 'RUNNING', ?)
  `).run(pipelineId, `${stage.charAt(0) + stage.slice(1).toLowerCase()} Job`, stage, now).lastInsertRowid;

  console.log(`  [${stage}] job ${jobId} started`);

  // Simulate work taking some time
  const workDuration = randomBetween(2000, 6000);
  await wait(workDuration);

  const finalStatus = pickStatus();
  const templates = finalStatus === 'FAILED' ? logTemplates.FAILED : logTemplates[stage];
  const finishedAt = new Date().toISOString();

  // Write logs
  const insertLog = db.prepare(`
    INSERT INTO job_logs (job_id, level, message) VALUES (?, ?, ?)
  `);
  for (const [level, message] of templates) {
    insertLog.run(jobId, level, message);
  }

  // Write metrics if successful
  if (finalStatus === 'SUCCESS') {
    const rowsProcessed = randomBetween(10000, 500000);
    const rowsFailed = randomBetween(0, Math.floor(rowsProcessed * 0.01));
    db.prepare(`
      INSERT INTO job_metrics (job_id, rows_processed, rows_failed, duration_ms)
      VALUES (?, ?, ?, ?)
    `).run(jobId, rowsProcessed, rowsFailed, workDuration);
  }

  // Update job to final status
  db.prepare(`
    UPDATE jobs SET status = ?, finished_at = ? WHERE id = ?
  `).run(finalStatus, finishedAt, jobId);

  console.log(`  [${stage}] job ${jobId} finished → ${finalStatus}`);
  return finalStatus;
}

// Pipeline Runner 
// Runs all 3 stages in sequence for a given pipeline.
// If EXTRACT or TRANSFORM fails, subsequent stages are skipped.
async function runPipeline(pipelineId, pipelineName) {
  console.log(`\n[Simulator] Starting pipeline: ${pipelineName} (id: ${pipelineId})`);

  for (const stage of ['EXTRACT', 'TRANSFORM', 'LOAD']) {
    const status = await runJob(pipelineId, stage);
    if (status === 'FAILED') {
      console.log(`  Pipeline ${pipelineName} halted at ${stage} due to failure.`);
      break;
    }
    // Small pause between stages
    await wait(randomBetween(500, 1500));
  }

  console.log(`[Simulator] Pipeline ${pipelineName} run complete.\n`);
}

// Scheduler 
// Fetches all pipelines and schedules each one to run every 5 minutes,
// offset slightly so they don't all fire at once.
function startSimulator() {
  const pipelines = db.prepare('SELECT id, name FROM pipelines').all();

  if (pipelines.length === 0) {
    console.warn('[Simulator] No pipelines found — run `node scripts/seed.js` first.');
    return;
  }

  pipelines.forEach((pipeline, i) => {
    // Stagger start times: pipeline 0 at minute 0, pipeline 1 at minute 2, etc.
    const offsetMinutes = i * 2;
    const cronExpression = `${offsetMinutes}/5 * * * *`; // every 5 min, offset by i*2

    cron.schedule(cronExpression, () => {
      runPipeline(pipeline.id, pipeline.name).catch(err => {
        console.error(`[Simulator] Error in pipeline ${pipeline.name}:`, err.message);
      });
    });

    console.log(`[Simulator] Scheduled "${pipeline.name}" — cron: "${cronExpression}"`);
  });

  console.log('[Simulator] All pipelines scheduled. Jobs will appear every ~5 minutes.\n');
}

module.exports = { startSimulator };