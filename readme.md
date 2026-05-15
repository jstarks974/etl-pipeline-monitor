# ETL Pipeline Monitor

Real-time dashboard for tracking enterprise data pipeline jobs: status, log output, and throughput metrics. Uses REST API design, relational database modeling, job scheduling, and operational monitoring UI.

---

## Features

- Live dashboard showing pipeline health across Extract, Transform, and Load stages
- Per-job log viewer with INFO / WARN / ERROR severity levels
- Throughput chart tracking rows processed across recent successful jobs
- Background job simulator that runs pipelines on a cron schedule
- Filter jobs by status (Success / Failed / Running) or by pipeline
- Auto-refreshes every 30 seconds

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Web framework | Express.js |
| Database | SQLite (via better-sqlite3) |
| Job scheduling | node-cron |
| Frontend | Vanilla JavaScript, Chart.js |
| Environment | Linux / Unix (RHEL-compatible) |
| Version control | Git / GitHub |

---

## Getting started

### Prerequisites

- Node.js v18 or higher — [nodejs.org](https://nodejs.org)
- Git
- A Unix-compatible terminal (Linux, macOS, or WSL2 on Windows)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/etl-pipeline-monitor.git
cd etl-pipeline-monitor

# 2. Run the setup script (installs dependencies and seeds the database)
bash scripts/setup.sh

# 3. Start the server
node server/index.js
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Re-seeding the database

To reset all data back to the seeded state:

```bash
node scripts/seed.js
```

---

## Project structure

```
etl-pipeline-monitor/
├── server/
│   ├── index.js              # Express app entry point, starts simulator
│   ├── routes/
│   │   ├── jobs.js           # GET /api/jobs, GET /api/jobs/:id
│   │   └── pipeline.js       # GET /api/pipelines, /stats/summary
│   ├── db/
│   │   ├── schema.sql        # Table definitions with constraints
│   │   └── database.js       # SQLite connection, schema init
│   └── simulator/
│       └── jobRunner.js      # Cron-scheduled pipeline job simulator
├── public/
│   └── index.html            # Dashboard (HTML + CSS + JS, single file)
├── scripts/
│   ├── setup.sh              # One-time environment setup
│   └── seed.js               # Populates DB with realistic sample data
└── README.md
```

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pipelines` | All pipelines with job status counts |
| GET | `/api/pipelines/:id` | Single pipeline with all its jobs |
| GET | `/api/pipelines/stats/summary` | Aggregate stats for dashboard cards |
| GET | `/api/jobs` | All jobs (supports `?status=` and `?pipeline_id=` filters) |
| GET | `/api/jobs/:id` | Single job with logs and metrics |

### Example responses

**GET /api/pipelines**
```json
[
  {
    "id": 1,
    "name": "Customer Data Sync",
    "description": "Syncs customer records from source CRM to data warehouse",
    "total_jobs": 15,
    "successful_jobs": 13,
    "failed_jobs": 1,
    "running_jobs": 1
  }
]
```

**GET /api/jobs/:id**
```json
{
  "id": 12,
  "pipeline_name": "Claims ETL",
  "stage": "TRANSFORM",
  "status": "SUCCESS",
  "started_at": "2024-01-15T10:32:00.000Z",
  "finished_at": "2024-01-15T10:32:08.000Z",
  "logs": [
    { "level": "INFO", "message": "Loading transformation rules", "logged_at": "..." },
    { "level": "WARN", "message": "Null values detected in column: middle_name — skipping", "logged_at": "..." }
  ],
  "metrics": {
    "rows_processed": 284710,
    "rows_failed": 412,
    "duration_ms": 7840
  }
}
```

---

## How the simulator works

When the server starts, `jobRunner.js` schedules each pipeline to run every 5 minutes using `node-cron`, with 2-minute staggers between each one to avoid write contention.

Each run:
1. Inserts a job row with `status = RUNNING`
2. Simulates work with a randomized delay
3. Writes log lines to `job_logs`
4. On success, writes throughput metrics to `job_metrics`
5. Updates the job row to `SUCCESS` or `FAILED`

Failures occur  roughly 15% of the time and halt the remaining stages in that run, with goal of being consistent with how dependency-aware ETL tools handle stage failures.

---

## Development notes

- All SQL queries use prepared statements to prevent injection
- Foreign key constraints are explicitly enabled on every SQLite connection
- Database seeding uses a transaction — all inserts succeed or none do
- The simulator's two-phase job write (RUNNING → SUCCESS/FAILED) makes in-progress jobs visible to the dashboard in real time
