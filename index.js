const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middleware Configuration
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// Logging middleware com timestamp
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Requisição recebida:`, {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Caminho do banco de dados
const dbPath = path.join('/tmp', 'database.json');
const initialDB = {
  materias: [],
  professores: [],
  aulas: [],
  trocas: []
};

// Funções de acesso ao banco de dados
function initializeDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(initialDB, null, 2));
      console.log('Banco de dados inicializado.');
    }
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
  }
}

function readDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      initializeDB();
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(data);
    // Garante que todas as "tabelas" existem
    return {
      materias: Array.isArray(db.materias) ? db.materias : [],
      professores: Array.isArray(db.professores) ? db.professores : [],
      aulas: Array.isArray(db.aulas) ? db.aulas : [],
      trocas: Array.isArray(db.trocas) ? db.trocas : []
    };
  } catch (error) {
    console.error('Erro ao ler banco de dados:', error);
    return { ...initialDB };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao escrever no banco de dados:', error);
    throw error;
  }
}

// Inicializa o banco de dados
initializeDB();

/* ============================
   Rotas de MATÉRIAS
=============================== */
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
    res.status(201).json(novaMateria);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar matéria' });
  }
});

app.put('/materias/:id', (req, res) => {
  try {
    const db = readDB();
    const materiaId = parseInt(req.params.id, 10);
    const { nome } = req.body;
    const index = db.materias.findIndex(m => m.id === materiaId);
    if (index === -1) {
      return res.status(404).json({ error: 'Matéria não encontrada' });
    }
    db.materias[index] = {
      ...db.materias[index],
      nome: nome || db.materias[index].nome,
      updatedAt: new Date().toISOString()
    };
    writeDB(db);
    res.json(db.materias[index]);
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
    // Verifica se alguma disciplina está vinculada a professores
    const vinculo = db.professores.some(p => p.materias.includes(materiaId));
    if (vinculo) {
      return res.status(400).json({ error: 'Não é possível remover matéria com professores vinculados' });
    }
    db.materias = db.materias.filter(m => m.id !== materiaId);
    writeDB(db);
    res.json({ message: 'Matéria removida com sucesso', removed: materia });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover matéria' });
  }
});

/* ============================
   Rotas de PROFESSORES
=============================== */
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
    // Adiciona detalhes das matérias vinculadas
    const professorDetalhado = {
      ...professor,
      materias: professor.materias.map(id => db.materias.find(m => m.id === id)).filter(Boolean)
    };
    res.json(professorDetalhado);
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
    // Validação: conferir se cada matéria existe
    if (materiaIds && !materiaIds.every(id => db.materias.some(m => m.id === id))) {
      return res.status(400).json({ error: 'Uma ou mais matérias não existem' });
    }
    const novoProfessor = {
      id: db.professores.length + 1,
      nome,
      materias: materiaIds || [],
      createdAt: new Date().toISOString()
    };
    db.professores.push(novoProfessor);
    writeDB(db);
    res.status(201).json(novoProfessor);
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
    // Verifica se há aulas agendadas para o professor
    const possuiAulas = db.aulas.some(a => a.professorId === professorId);
    if (possuiAulas) {
      return res.status(400).json({ error: 'Não é possível remover professor com aulas agendadas' });
    }
    db.professores = db.professores.filter(p => p.id !== professorId);
    writeDB(db);
    res.json({ message: 'Professor removido com sucesso', removed: professor });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover professor' });
  }
});

/* ============================
   Rotas de AULAS
=============================== */
app.get('/aulas', (req, res) => {
  try {
    const db = readDB();
    // Detalha o professor para cada aula
    const aulasDetalhadas = db.aulas.map(aula => {
      const professor = db.professores.find(p => p.id === aula.professorId);
      return {
        ...aula,
        professor: professor ? { id: professor.id, nome: professor.nome } : null
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
    if (!data || !horario || !professorId || !turma) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    // Verifica se o professor existe
    const professor = db.professores.find(p => p.id === professorId);
    if (!professor) {
      return res.status(400).json({ error: 'Professor não encontrado' });
    }
    // Verifica conflito de horário para o mesmo professor ou turma
    const conflito = db.aulas.some(aula =>
      aula.data === data && aula.horario === horario &&
      (aula.professorId === professorId || aula.turma === turma)
    );
    if (conflito) {
      return res.status(400).json({ error: 'Já existe uma aula neste horário para este professor ou turma' });
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
    res.status(201).json({ message: 'Aula agendada com sucesso', aula: novaAula });
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
    // Impede remoção caso a aula já tenha ocorrido
    const dataAula = new Date(`${aula.data}T${aula.horario}`);
    if (dataAula < new Date()) {
      return res.status(400).json({ error: 'Não é possível remover aulas que já aconteceram' });
    }
    db.aulas = db.aulas.filter(a => a.id !== aulaId);
    writeDB(db);
    res.json({ message: 'Aula removida com sucesso', removed: aula });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover aula' });
  }
});

/* ============================
   Rotas de TROCAS (EXCHANGES)
=============================== */
app.get('/trocas', (req, res) => {
  try {
    const db = readDB();
    // Adiciona detalhes de professores e aula para cada troca
    const trocasDetalhadas = db.trocas.map(troca => {
      const professorOriginal = db.professores.find(p => p.id === troca.professorIdOriginal);
      const professorSubstituto = db.professores.find(p => p.id === troca.professorIdSubstituto);
      const aula = db.aulas.find(a => a.id === troca.aulaId);
      return {
        ...troca,
        professorOriginal: professorOriginal ? { id: professorOriginal.id, nome: professorOriginal.nome } : null,
        professorSubstituto: professorSubstituto ? { id: professorSubstituto.id, nome: professorSubstituto.nome } : null,
        aula: aula ? {
          id: aula.id,
          data: aula.data,
          horario: aula.horario,
          turma: aula.turma
        } : null
      };
    });
    res.json(trocasDetalhadas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar trocas' });
  }
});

app.post('/trocas', (req, res) => {
  try {
    const db = readDB();
    const { aulaId, professorIdOriginal, professorIdSubstituto, motivo } = req.body;
    if (!aulaId || !professorIdOriginal || !professorIdSubstituto || !motivo) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    const aula = db.aulas.find(a => a.id === aulaId);
    if (!aula) {
      return res.status(400).json({ error: 'Aula não encontrada' });
    }
    const profOrig = db.professores.find(p => p.id === professorIdOriginal);
    const profSub = db.professores.find(p => p.id === professorIdSubstituto);
    if (!profOrig || !profSub) {
      return res.status(400).json({ error: 'Um ou mais professores não encontrados' });
    }
    if (aula.professorId !== professorIdOriginal) {
      return res.status(400).json({ error: 'O professor original não está designado para esta aula' });
    }
    const novaTroca = {
      id: db.trocas.length + 1,
      aulaId,
      professorIdOriginal,
      professorIdSubstituto,
      motivo,
      status: 'PENDENTE',
      createdAt: new Date().toISOString()
    };
    db.trocas.push(novaTroca);
    writeDB(db);
    res.status(201).json({ message: 'Solicitação de troca criada com sucesso', troca: novaTroca });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar solicitação de troca' });
  }
});

app.put('/trocas/:id', (req, res) => {
  try {
    const db = readDB();
    const trocaId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const index = db.trocas.findIndex(t => t.id === trocaId);
    if (index === -1) {
      return res.status(404).json({ error: 'Troca não encontrada' });
    }
    if (!['APROVADA', 'REJEITADA'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use APROVADA ou REJEITADA' });
    }
    const troca = db.trocas[index];
    // Se aprovada, atualiza o professor da aula
    if (status === 'APROVADA') {
      const aulaIdx = db.aulas.findIndex(a => a.id === troca.aulaId);
      if (aulaIdx !== -1) {
        db.aulas[aulaIdx].professorId = troca.professorIdSubstituto;
      }
    }
    db.trocas[index] = {
      ...troca,
      status,
      updatedAt: new Date().toISOString()
    };
    writeDB(db);
    res.json({ message: `Troca ${status.toLowerCase()} com sucesso`, troca: db.trocas[index] });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar troca' });
  }
});

/* ============================
   Middleware de ERRO e 404
=============================== */
app.use((err, req, res, next) => {
  console.error('Erro interno:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta http://localhost:${port}`);
});