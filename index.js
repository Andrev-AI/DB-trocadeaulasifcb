const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middleware Configuration
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

// Logging middleware
app.use((req, res, next) => {
  console.log('Requisição recebida:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers,
  });
  next();
});

// Database Configuration
const dbPath = '/tmp/database.json';
const initialDB = {
  materias: [],
  professores: [],
  aulas: [],
  trocas: []
};

// Database Functions
function initializeDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(initialDB));
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    return initialDB;
  }
}

function readDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      initializeDB();
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(data);
    return {
      materias: db.materias || [],
      professores: db.professores || [],
      aulas: db.aulas || [],
      trocas: db.trocas || []
    };
  } catch (error) {
    console.error('Error reading database:', error);
    return initialDB;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing to database:', error);
    throw error;
  }
}

// Initialize database on startup
initializeDB();

// Routes Configuration
// Matérias Routes
app.get('/materias', (req, res) => {
  try {
    const db = readDB();
    res.json(db.materias);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar matérias' });
  }
});

app.post('/materias', (req, res) => {
  try {
    const db = readDB();
    const { nome } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    const novaMateria = { 
      id: db.materias.length + 1, 
      nome 
    };
    db.materias.push(novaMateria);
    writeDB(db);
    return res.status(201).json(novaMateria);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar matéria' });
  }
});

app.delete('/materias/:id', (req, res) => {
  try {
    const db = readDB();
    const materiaId = parseInt(req.params.id, 10);
    const materia = db.materias.find(m => m.id === materiaId);
    
    if (!materia) {
      return res.status(404).json({ error: 'Matéria não encontrada' });
    }
    
    db.materias = db.materias.filter(m => m.id !== materiaId);
    writeDB(db);
    res.json({ message: 'Matéria removida com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover matéria' });
  }
});

// Professores Routes
app.get('/professores', (req, res) => {
  try {
    const db = readDB();
    res.json(db.professores);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar professores' });
  }
});

app.post('/professores', (req, res) => {
  try {
    const db = readDB();
    const { nome, materiaIds } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    const novoProfessor = { 
      id: db.professores.length + 1, 
      nome, 
      materias: materiaIds || []  
    };
    db.professores.push(novoProfessor);
    writeDB(db);
    return res.status(201).json(novoProfessor);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar professor' });
  }
});

app.put('/professores/:id', (req, res) => {
  try {
    const db = readDB();
    const professorId = parseInt(req.params.id);
    const { nome, materiaIds } = req.body;
    const professorIndex = db.professores.findIndex(p => p.id === professorId);
    
    if (professorIndex === -1) {
      return res.status(404).json({ error: 'Professor não encontrado' });
    }
    
    if (nome) db.professores[professorIndex].nome = nome;
    if (materiaIds) db.professores[professorIndex].materias = materiaIds;
    
    writeDB(db);
    return res.json(db.professores[professorIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar professor' });
  }
});

// Aulas Routes
app.get('/aulas', (req, res) => {
  try {
    const db = readDB();
    res.json(db.aulas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar aulas' });
  }
});

app.post('/aulas', (req, res) => {
  try {
    const db = readDB();
    const { data, horario, professorId, turma } = req.body;
    const novaAula = {
      id: db.aulas.length + 1,
      data,
      horario,
      professorId,
      turma
    };
    db.aulas.push(novaAula);
    writeDB(db);
    res.status(201).json({ message: 'Aula agendada com sucesso', aula: novaAula });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar aula' });
  }
});

// Trocas Routes
app.get('/trocas', (req, res) => {
  try {
    const db = readDB();
    res.json(db.trocas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar trocas' });
  }
});

app.post('/trocas', (req, res) => {
  try {
    const db = readDB();
    const novaTroca = {
      id: Date.now(),
      ...req.body
    };
    db.trocas.push(novaTroca);
    writeDB(db);
    res.status(201).json(novaTroca);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar troca' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Start server
app.listen(port, () => {
  console.log(`Servidor rodando na porta http://localhost:${port}`);
});