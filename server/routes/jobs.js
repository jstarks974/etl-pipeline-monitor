
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Return all jobs optionally filtered by pipeline_id or status
router.get('/', (req, res) => {
    const {pipeline_id, status} = req.query;

    let query = `
    SELECT
        j.id,
        j.pipeline_id,
        p.name AS pipeline_name,
        j.name,
        j.stage,
        j.status,
        j.started_at,
        j.finished_at
    FROM jobs j
    JOIN pipelines p ON j.pipeline_id = p.id
    WHERE 1=1
    `;

    const params = [];

    if (pipeline_id) {
        query += ' AND j.pipeline_id = ?';
        params.push(pipeline_id);
    }

    if (status) {
        query += ' AND j.status = ?';
        params.push(status.toUpperCase());
    }

    query += ' ORDER BY j.started_at DESC';

    try {
        const jobs = db.prepare(query).all(...params);
        res.json(jobs);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Return a single job with logs and metrics
router.get('/:id', (req, res) => {
    const {id} = req.params;

    try {
        const job = db.prepare(`
            SELECT
                j.id,
                j.pipeline_id,
                p.name AS pipeline_name,
                j.name,
                j.stage,
                j.status,
                j.started_at,
                j.finished_at
            FROM jobs j
            JOIN pipelines p ON j.pipeline_id = p.id
            WHERE j.id = ?
            `).get(id);

            if (!job) return res.status(404).json({error: 'Job not found'});

            const logs = db.prepare(`
                SELECT leve, message, logged_at
                FROM job_logs
                WHERE job_id = ?
                ORDER BY logged_at ASC
                `).all(id);

            const metrics = db.prepare(`
                SELECT rows_processed, rows_failed, duration_ms, recorded_at
                FROM job_metrics
                WHERE job_id = ?
                `).get(id);

                res.json({...job, logs, metrics: metrics || null });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
});

module.exports = router;