-- Assessment Platform Database Schema
-- Created: 2025-01-14
-- PostgreSQL compatible version

-- Create enum types
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer-not-to-say');
CREATE TYPE education_type AS ENUM ('high-school', 'associate', 'bachelor', 'master', 'doctorate', 'other');
CREATE TYPE experience_type AS ENUM ('0-1', '2-5', '6-10', '11-15', '15+');
CREATE TYPE hear_about_type AS ENUM ('search-engine', 'social-media', 'friend-referral', 'advertisement', 'institution', 'other');
CREATE TYPE difficulty_type AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE session_status_type AS ENUM ('active', 'completed', 'abandoned', 'expired');
CREATE TYPE data_type_enum AS ENUM ('string', 'integer', 'boolean', 'json');

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_answer INTEGER NOT NULL CHECK (correct_answer IN (0, 1, 2, 3)),
    difficulty difficulty_type DEFAULT 'medium',
    explanation TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Create indexes for questions table
CREATE INDEX IF NOT EXISTS idx_subject_difficulty ON questions(subject_id, difficulty);
CREATE INDEX IF NOT EXISTS idx_active ON questions(is_active);

-- User registrations table
CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL PRIMARY KEY,
    user_id UUID DEFAULT gen_random_uuid() UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender gender_type NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    education education_type NOT NULL,
    institution VARCHAR(255),
    field_of_study VARCHAR(255),
    experience experience_type,
    hear_about_us hear_about_type,
    google_id VARCHAR(255),
    profile_picture_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for registrations table
CREATE INDEX IF NOT EXISTS idx_email ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_created ON registrations(created_at);

-- Test results table
CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    test_time TIMESTAMP NOT NULL,
    subject VARCHAR(50) NOT NULL,
    questions JSONB NOT NULL,
    answers JSONB NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    duration_seconds INTEGER NOT NULL,
    browser_info JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email) REFERENCES registrations(email) ON DELETE CASCADE
);

-- Create indexes for test_results table
CREATE INDEX IF NOT EXISTS idx_email_test ON test_results(email, test_time);
CREATE INDEX IF NOT EXISTS idx_subject_score ON test_results(subject, score);
CREATE INDEX IF NOT EXISTS idx_test_time ON test_results(test_time);

-- Test sessions table (for tracking test attempts)
CREATE TABLE IF NOT EXISTS test_sessions (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status session_status_type DEFAULT 'active',
    questions_assigned JSONB NOT NULL,
    current_question INTEGER DEFAULT 0,
    time_remaining INTEGER DEFAULT 7200, -- 2 hours in seconds
    browser_info JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email) REFERENCES registrations(email) ON DELETE CASCADE
);

-- Create indexes for test_sessions table
CREATE INDEX IF NOT EXISTS idx_email_status ON test_sessions(email, status);
CREATE INDEX IF NOT EXISTS idx_session_token ON test_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_status_time ON test_sessions(status, start_time);

-- System configuration table
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    data_type data_type_enum DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled assessments table (for notifications)
CREATE TABLE IF NOT EXISTS scheduled_assessments (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    notification_method VARCHAR(20) NOT NULL CHECK (notification_method IN ('email', 'calendar', 'both')),
    is_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES registrations(user_id) ON DELETE CASCADE
);

-- Create index for scheduled_assessments table
CREATE INDEX IF NOT EXISTS idx_user_scheduled ON scheduled_assessments(user_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_notification_pending ON scheduled_assessments(is_notified, scheduled_time);

-- Insert default subjects
INSERT INTO subjects (name, description) VALUES
('Math', 'Mathematics including algebra, geometry, calculus, and problem solving'),
('Science', 'General science covering physics, chemistry, biology, and earth science'),
('Reasoning', 'Logical reasoning, analytical thinking, and problem-solving skills')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, data_type, description) VALUES
('test_duration_minutes', '120', 'integer', 'Total test duration in minutes'),
('questions_per_subject', '20', 'integer', 'Number of questions per subject'),
('randomize_questions', 'true', 'boolean', 'Whether to randomize question order'),
('platform_name', 'NatSchix', 'string', 'Name of the assessment platform'),
('contact_email', 'admin@natschix.com', 'string', 'Contact email for support'),
('enable_notifications', 'true', 'boolean', 'Enable email notifications'),
('max_test_attempts', '3', 'integer', 'Maximum number of test attempts per user'),
('passing_score', '70', 'integer', 'Minimum passing score percentage'),
('session_timeout_minutes', '15', 'integer', 'Session timeout in minutes of inactivity')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

-- Sample questions for demonstration
INSERT INTO questions (subject_id, question, option_a, option_b, option_c, option_d, correct_answer, difficulty) VALUES
-- Math Questions
((SELECT id FROM subjects WHERE name = 'Math'), 'What is 15 × 8?', '120', '110', '130', '125', 0, 'easy'),
((SELECT id FROM subjects WHERE name = 'Math'), 'Solve for x: 2x + 5 = 17', '6', '5', '7', '8', 0, 'medium'),
((SELECT id FROM subjects WHERE name = 'Math'), 'What is the area of a circle with radius 5?', '25π', '10π', '50π', '15π', 0, 'medium'),
((SELECT id FROM subjects WHERE name = 'Math'), 'If f(x) = 2x + 3, what is f(4)?', '11', '10', '12', '9', 0, 'easy'),
((SELECT id FROM subjects WHERE name = 'Math'), 'What is the derivative of x²?', '2x', 'x', '2', 'x²', 0, 'medium'),

-- Science Questions
((SELECT id FROM subjects WHERE name = 'Science'), 'What is the chemical symbol for gold?', 'Go', 'Gd', 'Au', 'Ag', 2, 'easy'),
((SELECT id FROM subjects WHERE name = 'Science'), 'Which planet is known as the Red Planet?', 'Venus', 'Mars', 'Jupiter', 'Saturn', 1, 'easy'),
((SELECT id FROM subjects WHERE name = 'Science'), 'What is the powerhouse of the cell?', 'Nucleus', 'Mitochondria', 'Ribosome', 'Cytoplasm', 1, 'medium'),
((SELECT id FROM subjects WHERE name = 'Science'), 'What is the chemical formula for water?', 'H2O', 'CO2', 'NaCl', 'CH4', 0, 'easy'),
((SELECT id FROM subjects WHERE name = 'Science'), 'At what temperature does water boil at sea level?', '90°C', '100°C', '110°C', '120°C', 1, 'easy'),

-- Reasoning Questions
((SELECT id FROM subjects WHERE name = 'Reasoning'), 'If all roses are flowers and some flowers are red, then:', 'All roses are red', 'Some roses are red', 'No roses are red', 'Cannot be determined', 3, 'medium'),
((SELECT id FROM subjects WHERE name = 'Reasoning'), 'What comes next in the sequence: 2, 6, 12, 20, ?', '28', '30', '32', '34', 1, 'medium'),
((SELECT id FROM subjects WHERE name = 'Reasoning'), 'If A > B and B > C, then:', 'A < C', 'A > C', 'A = C', 'Cannot be determined', 1, 'easy'),
((SELECT id FROM subjects WHERE name = 'Reasoning'), 'Complete the analogy: Book : Read :: Music : ?', 'Hear', 'Listen', 'Sound', 'Play', 1, 'medium'),
((SELECT id FROM subjects WHERE name = 'Reasoning'), 'Which number is the odd one out: 2, 4, 6, 9, 12?', '2', '4', '9', '12', 2, 'easy')
ON CONFLICT DO NOTHING;
