const express = require('express');
const cors = require('cors');
const path = require('path');
 
const jobRoutes      = require('./routes/jobs');
const pipelineRoutes = require('./routes/pipeline');
const { startSimulator } = require('./simulator/jobRunner');
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/jobs', jobRoutes);
app.use('/api/pipelines', pipelineRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('API endpoints:');
  console.log('  GET /api/pipelines');
  console.log('  GET /api/pipelines/:id');
  console.log('  GET /api/pipelines/stats/summary');
  console.log('  GET /api/jobs');
  console.log('  GET /api/jobs?pipeline_id=1');
  console.log('  GET /api/jobs?status=failed');
  console.log('  GET /api/jobs/:id');
});


