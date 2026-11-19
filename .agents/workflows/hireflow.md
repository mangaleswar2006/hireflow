---
name: hireflow
description: Scaffolds, compiles, and verifies the full-stack HireFlow Java Recruitment Portal (HttpServer + OOP + Streams + JDBC DAO + Glassmorphism SPA).
---

# HireFlow — Antigravity Implementation Plan & Full-Stack Blueprint

## 1. Agent Execution Checklist
When executing this workflow in Google Antigravity, complete these steps in order:
- [x] **Step 1:** Create project directory structure (`./` and `./public/`).
- [x] **Step 2:** Write `ARCHITECTURE.md` containing the UML Class Hierarchy and REST API Specification.
- [x] **Step 3:** Write `schema.sql` and `HireFlowJdbcDAO.java` for the relational DBMS/JDBC layer.
- [x] **Step 4:** Write `HireFlowServer.java` (Core Java 17 backend engine using `HttpServer`, OOP Inheritance/Polymorphism, Generic Interfaces, Java Streams, Custom Exceptions, and Disk Serialization).
- [x] **Step 5:** Write `public/index.html`, `public/styles.css`, and `public/app.js` (Dark Glassmorphism SPA).
- [x] **Step 6:** Run `javac HireFlowServer.java HireFlowJdbcDAO.java` in the terminal to verify zero compilation errors.
- [x] **Step 7:** Launch `java HireFlowServer` and verify endpoints on `http://localhost:8080` for Job Seeker, Recruiter, and Admin roles.

---

## 2. Target Workspace File Tree
```text
HireFlow/
├── .agents/
│   └── workflows/
│       └── hireflow.md
├── ARCHITECTURE.md
├── schema.sql
├── HireFlowJdbcDAO.java
├── HireFlowServer.java
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

---

## 3. UML Architecture & REST API Reference (`ARCHITECTURE.md`)

### A. OOP Class Hierarchy
- **`CrudRepository<T, ID>` (Generic Interface)** & **`SearchFilter<T>` (Functional Interface)** -> Implemented via Java Streams (`stream().filter().sorted()`).
- **`User` (Abstract Base Class)** -> Defines `abstract Map<String, Object> getDashboardMetrics(DataStore store)`.
  - **`Admin extends User`** -> Platform-wide metrics and user suspension/deletion controls.
  - **`Recruiter extends User`** -> Adds `company` field and manages posted jobs & applicant status transitions.
  - **`JobSeeker extends User`** -> Composes `SeekerProfile` (`phone`, `education`, `experience`, `List<String> skills`, `summary`, `resume`).
- **`Job`** -> Composes `RequirementCriteria` (`minEducation`, `minExperience`, `List<String> requiredSkills`) and calculates candidate skill-match percentage in Java.
- **`JobApplication`** -> Links `jobId` and `seekerId` with `ApplicationStatus` enum (`PENDING`, `REVIEWED`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`).
- **Custom Exceptions** -> `InvalidCredentialsException` (401), `UnauthorizedRoleException` (403), `ResourceNotFoundException` (404), `DuplicateApplicationException` (409), `JobDeadlineExpiredException` (400).

### B. REST Endpoints Served by `HireFlowServer` (`http://localhost:8080`)
- `GET /api/state` — Synchronizes full application state (`users`, `jobs`, `applications`).
- `POST /api/auth/login` — Authenticates credentials and checks account active status.
- `POST /api/auth/register` — Instantiates polymorphic `JobSeeker` or `Recruiter`.
- `POST /api/jobs` & `DELETE /api/jobs` — Creates, updates, or deletes job postings.
- `POST /api/applications` & `PUT /api/applications` — Submits applications (with duplicate & deadline validation) or updates status.
- `PUT /api/profile` — Updates `JobSeeker` profile and recalculates skill match percentages.
- `PUT /api/users` & `DELETE /api/users` — Admin controls to suspend/activate or remove users.
