-- Create materias table
CREATE TABLE materias (
    id SERIAL PRIMARY KEY,
    professor VARCHAR(100) NOT NULL,
    materia VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create aulas table
CREATE TABLE aulas (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    horario TIME NOT NULL,
    professor VARCHAR(100) NOT NULL,
    turma VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);