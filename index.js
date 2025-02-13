require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes for Materias
app.get('/materias', async (req, res) => {
  try {
    const { rows: materias } = await pool.query('SELECT * FROM materias');
    res.json(materias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/materias', async (req, res) => {
  try {
    const { professor, materia } = req.body;
    const materiasResult = await pool.query(
      'INSERT INTO materias (professor, materia) VALUES ($1, $2) RETURNING *',
      [professor, materia]
    );
    res.json(materiasResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Routes for Aulas
app.get('/aulas', async (req, res) => {
  try {
    const { rows: aulas } = await pool.query('SELECT * FROM aulas');
    res.json(aulas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/aulas', async (req, res) => {
  try {
    const { data, horario, professor, turma } = req.body;
    const aulasResult = await pool.query(
      'INSERT INTO aulas (data, horario, professor, turma) VALUES ($1, $2, $3, $4) RETURNING *',
      [data, horario, professor, turma]
    );
    res.json(aulasResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// For local development only
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Export for Vercel
module.exports = app;