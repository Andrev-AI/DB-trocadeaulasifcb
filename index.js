require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

// API handlers
module.exports = async (req, res) => {
  const { method } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Routes for Materias
    if (req.url.startsWith('/api/materias')) {
      switch (method) {
        case 'GET':
          const { rows: materias } = await pool.query('SELECT * FROM materias');
          return res.json(materias);

        case 'POST':
          const { professor, materia } = req.body;
          const materiasResult = await pool.query(
            'INSERT INTO materias (professor, materia) VALUES ($1, $2) RETURNING *',
            [professor, materia]
          );
          return res.json(materiasResult.rows[0]);
      }
    }

    // Routes for Aulas
    if (req.url.startsWith('/api/aulas')) {
      switch (method) {
        case 'GET':
          const { rows: aulas } = await pool.query('SELECT * FROM aulas');
          return res.json(aulas);

        case 'POST':
          const { data, horario, professor, turma } = req.body;
          const aulasResult = await pool.query(
            'INSERT INTO aulas (data, horario, professor, turma) VALUES ($1, $2, $3, $4) RETURNING *',
            [data, horario, professor, turma]
          );
          return res.json(aulasResult.rows[0]);
      }
    }

    return res.status(404).json({ error: 'Route not found' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};