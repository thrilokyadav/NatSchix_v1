-- Define custom ENUM types
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer-not-to-say');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- User registration data
CREATE TABLE registrations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) UNIQUE,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender gender_type NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) NOT NULL,
    education VARCHAR(50) NOT NULL,
    institution VARCHAR(100),
    field_of_study VARCHAR(100),
    experience VARCHAR(20),
    hear_about_us VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Question bank
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    question_image_url TEXT,
    option_a VARCHAR(255) NOT NULL,
    option_a_image_url TEXT,
    option_b VARCHAR(255) NOT NULL,
    option_b_image_url TEXT,
    option_c VARCHAR(255) NOT NULL,
    option_c_image_url TEXT,
    option_d VARCHAR(255) NOT NULL,
    option_d_image_url TEXT,
    correct_answer INT NOT NULL,
    difficulty difficulty_level NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Test results (admin-only access)
CREATE TABLE test_results (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    test_time TIMESTAMPTZ NOT NULL,
    subject VARCHAR(50) NOT NULL,
    questions JSON NOT NULL,
    answers JSON NOT NULL,
    score INT NOT NULL,
    duration_seconds INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled assessments
CREATE TABLE scheduled_assessments (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    scheduled_time TIMESTAMPTZ NOT NULL,
    notification_method VARCHAR(10) NOT NULL DEFAULT 'email',
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
