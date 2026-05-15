const express = require('express');
const router = express.Router();
const db = require('../db/database');
 
// Returns all pipelines with summary of last ran status
router.get('/', (req, res) => {
  try {
    const pipelines = db.prepare(`
      SELECT
        p.id,
        p.name,
        p.description,
        p.created_at,
        COUNT(j.id)                                         AS total_jobs,
        SUM(CASE WHEN j.status = 'SUCCESS' THEN 1 ELSE 0 END) AS successful_jobs,
        SUM(CASE WHEN j.status = 'FAILED'  THEN 1 ELSE 0 END) AS failed_jobs,
        SUM(CASE WHEN j.status = 'RUNNING' THEN 1 ELSE 0 END) AS running_jobs
      FROM pipelines p
      LEFT JOIN jobs j ON j.pipeline_id = p.id
      GROUP BY p.id
      ORDER BY p.name ASC
    `).all();
 
    res.json(pipelines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 

// Returns a single pipeline with all its jobs
router.get('/:id', (req, res) => {
  const { id } = req.params;
 
  try {
    const pipeline = db.prepare(`
      SELECT * FROM pipelines WHERE id = ?
    `).get(id);
 
    if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });
 
    const jobs = db.prepare(`
      SELECT id, name, stage, status, started_at, finished_at
      FROM jobs
      WHERE pipeline_id = ?
      ORDER BY started_at DESC
    `).all(id);
 
    res.json({ ...pipeline, jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 

// Aggregate stats for the dashboard overview cards
router.get('/stats/summary', (req, res) => {
  try {
    const totals = db.prepare(`
      SELECT
        COUNT(*)                                              AS total_jobs,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) AS successful_jobs,
        SUM(CASE WHEN status = 'FAILED'  THEN 1 ELSE 0 END) AS failed_jobs,
        SUM(CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END) AS running_jobs
      FROM jobs
    `).get();
 
    const throughput = db.prepare(`
      SELECT
        SUM(rows_processed) AS total_rows_processed,
        SUM(rows_failed)    AS total_rows_failed,
        AVG(duration_ms)    AS avg_duration_ms
      FROM job_metrics
    `).get();
 
    res.json({ ...totals, ...throughput });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
module.exports = router;
 