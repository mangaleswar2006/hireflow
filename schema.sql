-- ===================================================================
-- HireFlow Enterprise Relational Schema (schema.sql)
-- Target DBMS: MySQL 8.0+ / MariaDB / Relational Standard
-- ===================================================================

CREATE DATABASE IF NOT EXISTS hireflow_db;
USE hireflow_db;

-- 1. Users Table (Base polymorphic table)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'RECRUITER', 'JOB_SEEKER') NOT NULL,
    company_name VARCHAR(120),
    active BOOLEAN DEFAULT TRUE,
    created_at DATE NOT NULL
);

-- 2. Seeker Profiles Table (1-to-1 composition for JobSeeker)
CREATE TABLE IF NOT EXISTS seeker_profiles (
    user_id VARCHAR(36) PRIMARY KEY,
    phone VARCHAR(30),
    education VARCHAR(150),
    experience VARCHAR(100),
    skills_csv TEXT,
    summary TEXT,
    resume_text LONGTEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Jobs Table (Job listings posted by Recruiters)
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    company VARCHAR(120) NOT NULL,
    recruiter_id VARCHAR(36) NOT NULL,
    location VARCHAR(120) NOT NULL,
    job_type ENUM('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'REMOTE') NOT NULL,
    salary VARCHAR(80) NOT NULL,
    deadline DATE NOT NULL,
    description TEXT NOT NULL,
    min_education VARCHAR(120),
    min_experience VARCHAR(100),
    required_skills_csv TEXT,
    created_at DATE NOT NULL,
    FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Job Applications Table (Application pipeline linking seeker to job)
CREATE TABLE IF NOT EXISTS job_applications (
    id VARCHAR(36) PRIMARY KEY,
    job_id VARCHAR(36) NOT NULL,
    seeker_id VARCHAR(36) NOT NULL,
    applied_at DATE NOT NULL,
    status ENUM('PENDING', 'REVIEWED', 'SHORTLISTED', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
    skill_match_score INT DEFAULT 0,
    UNIQUE KEY uk_job_seeker (job_id, seeker_id),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (seeker_id) REFERENCES users(id) ON DELETE CASCADE
);

