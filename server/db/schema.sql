-- db schema

-- Represents a pipline
CREATE TABLE IF NOT EXISTS pipelines (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    description     TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Jobs within a pipeline
CREATE TABLE IF NOT EXISTS jobs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_id     INTEGER NOT NUL REFERENCES pipelines(id),
    name            TEXT NOT NULL,
    stage           TEXT NOT NULL CHECK(stage IN ('EXTRACT', 'TRANSFORM', 'LOAD')),
    status          TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK(status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED')),
    started_at      DATETIME,
    finished_at     DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Log of lines during run
CREATE TABLE IF NOT EXISTS job_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id          INTEGER NOT NULL REFERENCES jobs(id),
    level           TEXT NOT NULL CHECK(level IN ('INFO', 'WARN', 'ERROR')),
    message         TEXT NOT NULL,
    logged_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics for each job
CREATE TABLE IF NOT EXISTS job_metrics (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id          INTEGER NOT NULL REFERENCES jobs(id),
    rows_processed  INTEGER DEFAULT 0,
    rows_failed     INTEGER DEFAULT 0,
    duration_ms     INTEGER,
    recorded_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);