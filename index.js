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

// Logging middleware with timestamp
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Requisição recebida:`, {
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

// Matérias Routes
app.get('/materias', (req, res) => {
  try {
    const db = readDB();
    res.json(db.materias);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar matérias' });
  }
});

app.get('/materias/:id', (req, res) => {
  try {
    const db = readDB();
    const materiaId = parseInt(req.params.id, 10);
    const materia = db.materias.find(m => m.id === materiaId);
    
    if (!materia) {
      return res.status(404).json({ error: 'Matéria não encontrada' });
    }
    
    res.json(materia);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar matéria' });
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
      nome,
      createdAt: new Date().toISOString()
    };
    db.materias.push(novaMateria);
    writeDB(db);
    return res.status(201).json(novaMateria);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar matéria' });
  }
});

app.put('/materias/:id', (req, res) => {
  try {
    const db = readDB();
    const materiaId = parseInt(req.params.id, 10);
    const { nome } = req.body;
    const materiaIndex = db.materias.findIndex(m => m.id === materiaId);
    
    if (materiaIndex === -1) {
      return res.status(404).json({ error: 'Matéria não encontrada' });
    }
    
    db.materias[materiaIndex] = {
      ...db.materias[materiaIndex],
      nome: nome || db.materias[materiaIndex].nome,
      updatedAt: new Date().toISOString()
    };
    
    writeDB(db);
    res.json(db.materias[materiaIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar matéria' });
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
    
    // Verificar se há professores vinculados
    const professorComMateria = db.professores.some(p => p.materias.includes(materiaId));
    if (professorComMateria) {
      return res.status(400).json({ 
        error: 'Não é possível remover matéria que possui professores vinculados' 
      });
    }
    
    db.materias = db.materias.filter(m => m.id !== materiaId);
    writeDB(db);
    res.json({ 
      message: 'Matéria removida com sucesso',
      removed: materia 
    });
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

app.get('/professores/:id', (req, res) => {
  try {
    const db = readDB();
    const professorId = parseInt(req.params.id, 10);
    const professor = db.professores.find(p => p.id === professorId);
    
    if (!professor) {
      return res.status(404).json({ error: 'Professor não encontrado' });
    }
    
    // Adicionar matérias detalhadas ao professor
    const professorComMaterias = {
      ...professor,
      materias: professor.materias.map(materiaId => {
        return db.materias.find(m => m.id === materiaId);
      }).filter(Boolean)
    };
    
    res.json(professorComMaterias);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar professor' });
  }
});

app.post('/professores', (req, res) => {
  try {
    const db = readDB();
    const { nome, materiaIds } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    // Validar se todas as matérias existem
    if (materiaIds) {
      const materiasExistem = materiaIds.every(id => 
        db.materias.some(m => m.id === id)
      );
      if (!materiasExistem) {
        return res.status(400).json({ error: 'Uma ou mais matérias não existem' });
      }
    }
    
    const novoProfessor = { 
      id: db.professores.length + 1, 
      nome, 
      materias: materiaIds || [],
      createdAt: new Date().toISOString()
    };
    
    db.professores.push(novoProfessor);
    writeDB(db);
    return res.status(201).json(novoProfessor);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar professor' });
  }
});

app.delete('/professores/:id', (req, res) => {
  try {
    const db = readDB();
    const professorId = parseInt(req.params.id, 10);
    const professor = db.professores.find(p => p.id === professorId);
    
    if (!professor) {
      return res.status(404).json({ error: 'Professor não encontrado' });
    }
    
    // Verificar se há aulas agendadas
    const temAulas = db.aulas.some(aula => aula.professorId === professorId);
    if (temAulas) {
      return res.status(400).json({ 
        error: 'Não é possível remover professor com aulas agendadas' 
      });
    }
    
    db.professores = db.professores.filter(p => p.id !== professorId);
    writeDB(db);
    res.json({ 
      message: 'Professor removido com sucesso',
      removed: professor 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover professor' });
  }
});

// Aulas Routes
app.get('/aulas', (req, res) => {
  try {
    const db = readDB();
    // Adicionar detalhes do professor a cada aula
    const aulasDetalhadas = db.aulas.map(aula => {
      const professor = db.professores.find(p => p.id === aula.professorId);
      return {
        ...aula,
        professor: professor ? { 
          id: professor.id, 
          nome: professor.nome 
        } : null
      };
    });
    res.json(aulasDetalhadas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar aulas' });
  }
});

app.post('/aulas', (req, res) => {
  try {
    const db = readDB();
    const { data, horario, professorId, turma } = req.body;
    
    // Validações
    if (!data || !horario || !professorId || !turma) {
      return res.status(400).json({ 
        error: 'Todos os campos são obrigatórios' 
      });
    }
    
    // Verificar se professor existe
    const professor = db.professores.find(p => p.id === professorId);
    if (!professor) {
      return res.status(400).json({ error: 'Professor não encontrado' });
    }
    
    // Verificar conflito de horários
    const temConflito = db.aulas.some(aula => 
      aula.data === data && 
      aula.horario === horario && 
      (aula.professorId === professorId || aula.turma === turma)
    );
    
    if (temConflito) {
      return res.status(400).json({ 
        error: 'Já existe uma aula neste horário para este professor ou turma' 
      });
    }
    
    const novaAula = {
      id: db.aulas.length + 1,
      data,
      horario,
      professorId,
      turma,
      createdAt: new Date().toISOString()
    };
    
    db.aulas.push(novaAula);
    writeDB(db);
    res.status(201).json({ 
      message: 'Aula agendada com sucesso', 
      aula: novaAula 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar aula' });
  }
});

app.delete('/aulas/:id', (req, res) => {
  try {
    const db = readDB();
    const aulaId = parseInt(req.params.id, 10);
    const aula = db.aulas.find(a => a.id === aulaId);
    
    if (!aula) {
      return res.status(404).json({ error: 'Aula não encontrada' });
    }
    
    // Verificar se a aula já aconteceu
    const dataAula = new Date(`${aula.data}T${aula.horario}`);
    if (dataAula < new Date()) {
      return res.status(400).json({ 
        error: 'Não é possível remover aulas que já aconteceram' 
      });
    }
    
    db.aulas = db.aulas.filter(a => a.id !== aulaId);
    writeDB(db);
    res.json({ 
      message: 'Aula removida com sucesso',
      removed: aula 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover aula' });
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

app.listen(port, () => {
  console.log(`Servidor rodando na porta http://localhost:${port}`);
});