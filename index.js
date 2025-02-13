js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes for Materias
app.get('/api/materias', async (req, res) => {
  try {
    const { rows: materias } = await pool.query('SELECT * FROM materias');
    res.json(materias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/materias', async (req, res) => {
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
app.get('/api/aulas', async (req, res) => {
  try {
    const { rows: aulas } = await pool.query('SELECT * FROM aulas');
    res.json(aulas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/aulas', async (req, res) => {
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

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});