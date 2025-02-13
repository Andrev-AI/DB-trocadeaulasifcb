const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  console.log('Requisição recebida:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers,
  });
  next();
});


app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());
app.use((req, res, next) => {
  res.type('application/json');
  next();
});

const initialDB = {
    materias: [],
    professores: [],
    aulas: [],
    trocas: []
};

// Estrutura inicial do banco de dados já foi declarada acima

if (!fs.existsSync('./tmp/database.json')) {
  fs.writeFileSync('./tmp/database.json', JSON.stringify(initialDB));
}

function readDB() {
  let db = JSON.parse(fs.readFileSync('./tmp/database.json'));
  // Garante que todas as "tabelas" existem
  db.materias = db.materias || [];
  db.professores = db.professores || [];
  db.aulas = db.aulas || [];
  db.trocas = db.trocas || [];
  return db;
}

function writeDB(data) {
  fs.writeFileSync('./tmp/database.json', JSON.stringify(data, null, 2));
}

// Rotas para matérias
app.get('/materias', (req, res) => {
  const db = readDB();
  res.json(db.materias);
});

app.post('/materias', (req, res) => {
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
});
app.delete('/materias/:id', (req, res) => {
  const db = readDB();
  const materiaId = parseInt(req.params.id, 10);
  const materia = db.materias.find(m => m.id === materiaId);
  
  if (!materia) {
    return res.status(404).json({ error: 'Matéria não encontrada' });
  }
  
  db.materias = db.materias.filter(m => m.id !== materiaId);
  writeDB(db);
  
  res.json({ message: 'Matéria removida com sucesso' });
});

// Rotas para professores
app.get('/professores', (req, res) => {
  const db = readDB();
  res.json(db.professores);
});

app.post('/professores', (req, res) => {
  const db = readDB();
  const { nome, materiaIds } = req.body;
  if (!nome) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  // Armazena os IDs enviados na propriedade "materias"
  const novoProfessor = { 
    id: db.professores.length + 1, 
    nome, 
    materias: materiaIds || []  
  };
  db.professores.push(novoProfessor);
  writeDB(db);
  return res.status(201).json(novoProfessor);
});

// Endpoint para atualizar um professor (ex: para alterar as matérias)
app.put('/professores/:id', (req, res) => {
  const db = readDB();
  const professorId = parseInt(req.params.id);
  const { nome, materiaIds } = req.body;
  const professorIndex = db.professores.findIndex(p => p.id === professorId);
  if (professorIndex === -1) {
    return res.status(404).json({ error: 'Professor não encontrado' });
  }
  if (nome) {
    db.professores[professorIndex].nome = nome;
  }
  if (materiaIds) {
    // Atualiza as matérias associadas ao professor
    db.professores[professorIndex].materias = materiaIds;
  }
  writeDB(db);
  return res.json(db.professores[professorIndex]);
});

app.delete('/professores/:id', (req, res) => {
  const db = readDB();
  const professorId = parseInt(req.params.id);
  const professoresFiltrados = db.professores.filter(p => p.id !== professorId);
  db.professores = professoresFiltrados;
  writeDB(db);
  res.json({ message: 'Professor removido com sucesso' });
});

// Rotas para aulas
app.get('/aulas', (req, res) => {
  const db = readDB();
  res.json(db.aulas);
});

app.post('/aulas', (req, res) => {
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
});
 
  // Endpoint para trocas
app.get('/trocas', (req, res) => {
    const db = readDB();
    res.json(db.trocas);
});
  
app.post('/trocas', (req, res) => {
    const db = readDB();
    const novaTroca = {
      id: Date.now(),
      ...req.body
    };
    db.trocas.push(novaTroca);
    writeDB(db);
    res.status(201).json(novaTroca);
});
  
app.delete('/trocas/:id', (req, res) => {
    const db = readDB();
    const trocaId = parseInt(req.params.id);
    db.trocas = db.trocas.filter(t => t.id !== trocaId);
    writeDB(db);
    res.json({ message: 'Troca removida com sucesso' });
  });

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta http://localhost:${port}`);
});