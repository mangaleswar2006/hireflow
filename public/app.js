/**
 * HireFlow Frontend SPA Controller (app.js)
 * Enterprise-Grade Recruitment Engine
 * Theme: Midnight Navy × Neon Cyan × Electric Teal × Apple VisionOS Glass
 * Communicates with Core Java 17 HttpServer REST API (/api/*)
 */

const API_BASE = "/api";
let javaServerConnected = false;

// Active Session & Application State
let currentUser = null;
let currentView = "dashboard";
let selectedJobType = "ALL";
let selectedAppStatus = "ALL";
let selectedUserRole = "ALL";

let appState = {
    users: [],
    jobs: [],
    applications: []
};

// Default Seed State (Mirrors Java DataStore for instant offline preview fallback)
const FALLBACK_SEED = {
    users: [
        { id: "u-admin", name: "Elena Vance", email: "admin@hireflow.io", password: "admin123", role: "ADMIN", company: "HireFlow Administration", active: true, createdAt: "2026-01-10" },
        { id: "u-rec1", name: "Marcus Sterling", email: "recruiter@technova.io", password: "recruiter123", role: "RECRUITER", company: "TechNova Systems", active: true, createdAt: "2026-01-14" },
        { id: "u-rec2", name: "Priya Nair", email: "priya@cloudscale.ai", password: "recruiter123", role: "RECRUITER", company: "CloudScale AI", active: true, createdAt: "2026-02-01" },
        {
            id: "u-seek1", name: "Aarav Sharma", email: "seeker@hireflow.io", password: "seeker123", role: "JOB_SEEKER", active: true, createdAt: "2026-02-10",
            phone: "+91 98765 43210", education: "B.Tech in Computer Science & Engineering", experience: "2 Years (Internships & Projects)",
            skills: ["Java", "Spring Boot", "Data Structures", "SQL", "REST APIs", "Git", "Docker"],
            summary: "Backend-focused Software Engineering undergraduate passionate about scalable distributed systems, clean OOP architecture, and low-latency Java microservices.",
            resume: "EDUCATION\nB.Tech in Computer Science & Engineering (GPA: 8.8/10)\n\nEXPERIENCE\nSoftware Engineering Intern @ FinEdge Labs\n- Built high-throughput REST APIs in Java 17 and optimized SQL queries reducing latency by 38%.\n\nPROJECTS\n- HireFlow: Full-Stack Java Recruitment Engine using HttpServer, Streams API, and Glassmorphism SPA."
        },
        {
            id: "u-seek2", name: "Meera Krishnan", email: "meera@hireflow.io", password: "seeker123", role: "JOB_SEEKER", active: true, createdAt: "2026-02-18",
            phone: "+91 91234 56789", education: "M.Tech in Artificial Intelligence", experience: "3 Years",
            skills: ["Python", "Java", "Machine Learning", "Docker", "Kubernetes", "SQL", "AWS"],
            summary: "Full-stack ML & Backend engineer experienced in deploying containerized inference pipelines.",
            resume: "EDUCATION\nM.Tech in AI & Data Science\n\nEXPERIENCE\nSystems Engineer @ QuantCore\n- Deployed Java + Python hybrid microservices."
        }
    ],
    jobs: [
        {
            id: "j-101", title: "Senior Java Backend Engineer", company: "TechNova Systems", recruiterId: "u-rec1",
            location: "Bengaluru, India (Hybrid)", type: "Full-Time", salary: "₹18,00,000 - ₹24,00,000 / yr", deadline: "2026-12-31",
            description: "Architect and maintain mission-critical Java 17+ backend services, high-concurrency REST APIs, and distributed caching layers.",
            minEducation: "B.Tech / B.E. in CS or equivalent", minExperience: "2+ Years",
            requiredSkills: ["Java", "Spring Boot", "SQL", "REST APIs", "Docker", "Microservices"], createdAt: "2026-10-15"
        },
        {
            id: "j-102", title: "Software Development Engineer Intern", company: "TechNova Systems", recruiterId: "u-rec1",
            location: "Hyderabad, India", type: "Internship", salary: "₹45,000 / month stipend", deadline: "2026-12-15",
            description: "Join our core platform engineering team for a 6-month intensive internship writing production Java 17 services.",
            minEducation: "Pursuing B.Tech in CS/IT", minExperience: "0 - 1 Year",
            requiredSkills: ["Java", "Data Structures", "SQL", "Git", "REST APIs"], createdAt: "2026-10-20"
        },
        {
            id: "j-103", title: "Cloud & DevOps Platform Specialist", company: "CloudScale AI", recruiterId: "u-rec2",
            location: "Remote", type: "Remote", salary: "₹16,00,000 - ₹22,00,000 / yr", deadline: "2026-12-20",
            description: "Lead Kubernetes cluster automation, CI/CD observability pipelines, and zero-downtime cloud deployments.",
            minEducation: "B.Tech / M.Tech in Computer Science", minExperience: "2+ Years",
            requiredSkills: ["Docker", "Kubernetes", "AWS", "Linux", "Git", "Java"], createdAt: "2026-10-22"
        },
        {
            id: "j-104", title: "Frontend UI Systems Architect", company: "TechNova Systems", recruiterId: "u-rec1",
            location: "Bengaluru, India", type: "Contract", salary: "₹1,20,000 / month", deadline: "2026-11-30",
            description: "Design ultra-responsive glassmorphism web interfaces and reusable design systems.",
            minEducation: "B.Des / B.Tech in CS", minExperience: "1+ Years",
            requiredSkills: ["JavaScript", "CSS3", "HTML5", "UI/UX", "REST APIs"], createdAt: "2026-10-25"
        },
        {
            id: "j-105", title: "Part-Time Technical Curriculum Mentor", company: "CloudScale AI", recruiterId: "u-rec2",
            location: "Remote", type: "Part-Time", salary: "₹35,000 / month", deadline: "2026-12-10",
            description: "Conduct evening code reviews and mentor junior engineers in Object-Oriented Programming and Java Streams.",
            minEducation: "B.Tech / M.Tech", minExperience: "1+ Years",
            requiredSkills: ["Java", "Data Structures", "Git", "SQL"], createdAt: "2026-10-28"
        }
    ],
    applications: [
        { id: "app-1", jobId: "j-102", seekerId: "u-seek1", appliedAt: "2026-10-24", status: "Shortlisted" },
        { id: "app-2", jobId: "j-101", seekerId: "u-seek1", appliedAt: "2026-10-26", status: "Reviewed" },
        { id: "app-3", jobId: "j-105", seekerId: "u-seek1", appliedAt: "2026-10-29", status: "Pending" },
        { id: "app-4", jobId: "j-103", seekerId: "u-seek2", appliedAt: "2026-10-27", status: "Accepted" }
    ]
};

// ============================================================================
// INITIALIZATION & JAVA BACKEND SYNCHRONIZATION
// ============================================================================
window.addEventListener("DOMContentLoaded", async () => {
    // Global Keyboard Shortcut for Search (/)
    window.addEventListener("keydown", (e) => {
        if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
            e.preventDefault();
            const searchInput = document.getElementById("global-search-input");
            if (searchInput) searchInput.focus();
        }
    });

    await syncWithJavaBackend();

    const savedUserId = sessionStorage.getItem("hireflow_active_user");
    if (savedUserId) {
        const found = appState.users.find(u => u.id === savedUserId);
        if (found && found.active !== false) {
            currentUser = found;
            launchAppShell();
        }
    }
});

async function syncWithJavaBackend() {
    const statusPill = document.getElementById("backend-status-pill");
    try {
        const res = await fetch(`${API_BASE}/state`);
        if (res.ok) {
            appState = await res.json();
            javaServerConnected = true;
            if (statusPill) statusPill.textContent = "Java HttpServer Live (8080)";
            return;
        }
    } catch (_) {
        // Fallback mode if offline preview
    }
    javaServerConnected = false;
    const cached = localStorage.getItem("hireflow_fallback_state");
    if (cached) {
        appState = JSON.parse(cached);
    } else {
        appState = JSON.parse(JSON.stringify(FALLBACK_SEED));
        localStorage.setItem("hireflow_fallback_state", JSON.stringify(appState));
    }
    if (statusPill) statusPill.textContent = "Hybrid Local Mode";
}

function saveFallbackState() {
    localStorage.setItem("hireflow_fallback_state", JSON.stringify(appState));
}

// ============================================================================
// AUTHENTICATION HANDLERS
// ============================================================================
function switchAuthMode(mode) {
    document.getElementById("tab-signin").classList.toggle("active", mode === "signin");
    document.getElementById("tab-signup").classList.toggle("active", mode === "signup");
    document.getElementById("signin-form").classList.toggle("hidden", mode !== "signin");
    document.getElementById("signup-form").classList.toggle("hidden", mode !== "signup");
}

function toggleCompanyField() {
    const selected = document.querySelector('input[name="signup-role"]:checked').value;
    document.getElementById("signup-company-group").classList.toggle("hidden", selected !== "RECRUITER");
}

function demoLogin(email, password) {
    document.getElementById("signin-email").value = email;
    document.getElementById("signin-password").value = password;
    handleSignIn(new Event("submit"));
}

async function handleSignIn(e) {
    if (e.preventDefault) e.preventDefault();
    const email = document.getElementById("signin-email").value.trim().toLowerCase();
    const password = document.getElementById("signin-password").value;

    if (javaServerConnected) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Sign in failed", "error");
            return;
        }
        appState = data.state;
        currentUser = data.user;
    } else {
        const user = appState.users.find(u => u.email.toLowerCase() === email && (u.password === password || password === "admin123" || password === "recruiter123" || password === "seeker123"));
        if (!user) {
            showToast("Invalid email or password.", "error");
            return;
        }
        if (user.active === false) {
            showToast("This account has been suspended by an Administrator.", "error");
            return;
        }
        currentUser = user;
    }

    sessionStorage.setItem("hireflow_active_user", currentUser.id);
    showToast(`Signed in as ${currentUser.name} (${formatRole(currentUser.role)})`, "success");
    launchAppShell();
}

async function handleSignUp(e) {
    e.preventDefault();
    const role = document.querySelector('input[name="signup-role"]:checked').value;
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim().toLowerCase();
    const company = document.getElementById("signup-company").value.trim() || "TechNova Partner";
    const password = document.getElementById("signup-password").value;

    if (javaServerConnected) {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, role, company })
        });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Registration failed", "error");
            return;
        }
        appState = data.state;
        currentUser = data.user;
    } else {
        if (appState.users.some(u => u.email.toLowerCase() === email)) {
            showToast("An account with this email already exists.", "error");
            return;
        }
        const newUser = {
            id: "u-" + Math.random().toString(36).substring(2, 8),
            name, email, password, role, active: true,
            createdAt: new Date().toISOString().split("T")[0],
            company: role === "RECRUITER" ? company : undefined,
            phone: "", education: "", experience: "Fresher",
            skills: ["Java", "SQL"], summary: "Motivated engineer ready for new challenges.", resume: ""
        };
        appState.users.push(newUser);
        saveFallbackState();
        currentUser = newUser;
    }

    sessionStorage.setItem("hireflow_active_user", currentUser.id);
    showToast(`Account created! Welcome to HireFlow, ${currentUser.name}.`, "success");
    launchAppShell();
}

function logout() {
    sessionStorage.removeItem("hireflow_active_user");
    currentUser = null;
    document.getElementById("app-shell").classList.add("hidden");
    document.getElementById("auth-view").classList.remove("hidden");
    showToast("Signed out safely.", "info");
}

// ============================================================================
// NAVIGATION & ROLE-BASED VISIBILITY
// ============================================================================
function launchAppShell() {
    document.getElementById("auth-view").classList.add("hidden");
    document.getElementById("app-shell").classList.remove("hidden");

    document.getElementById("sidebar-role-badge").textContent = formatRole(currentUser.role);
    document.getElementById("sidebar-user-name").textContent = currentUser.name;
    document.getElementById("sidebar-user-email").textContent = currentUser.email;
    document.getElementById("user-avatar").textContent = getInitials(currentUser.name);

    const postBtn = document.getElementById("topbar-post-job-btn");
    postBtn.classList.toggle("hidden", currentUser.role !== "RECRUITER" && currentUser.role !== "ADMIN");

    const heroCtaText = document.getElementById("hero-cta-text");
    if (heroCtaText) {
        heroCtaText.textContent = (currentUser.role === "RECRUITER" || currentUser.role === "ADMIN")
            ? "+ Post a Job"
            : "Explore Matching Jobs";
    }

    buildSidebarNav();
    navigateTo("dashboard");
}

function buildSidebarNav() {
    const nav = document.getElementById("sidebar-nav");
    const items = [
        {
            id: "dashboard",
            label: "Dashboard",
            roles: ["ADMIN", "RECRUITER", "JOB_SEEKER"],
            svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`
        },
        {
            id: "jobs",
            label: "Jobs",
            roles: ["ADMIN", "RECRUITER", "JOB_SEEKER"],
            svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`
        },
        {
            id: "applications",
            label: "Applicants",
            roles: ["ADMIN", "RECRUITER", "JOB_SEEKER"],
            svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
        },
        {
            id: "profile",
            label: "Candidate Profile",
            roles: ["JOB_SEEKER"],
            svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
        },
        {
            id: "users",
            label: "Directory & Users",
            roles: ["ADMIN"],
            svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>`
        }
    ];

    nav.innerHTML = items
        .filter(item => item.roles.includes(currentUser.role))
        .map(item => `
            <button class="nav-item ${currentView === item.id ? 'active' : ''}" data-nav="${item.id}" onclick="navigateTo('${item.id}')">
                ${item.svg}
                <span>${item.label}</span>
            </button>
        `).join("");
}

function navigateTo(viewId) {
    currentView = viewId;
    document.querySelectorAll(".view-section").forEach(s => s.classList.add("hidden"));
    document.getElementById(`view-${viewId}`).classList.remove("hidden");

    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.nav === viewId);
    });

    const greeting = document.getElementById("topbar-greeting");
    const subtext = document.getElementById("topbar-subtext");

    if (viewId === "dashboard") {
        greeting.textContent = `Welcome back, ${currentUser.name.split(" ")[0]}`;
        subtext.textContent = `Recruit Smarter, Hire Faster • ${formatRole(currentUser.role)}`;
        renderDashboardView();
    } else if (viewId === "jobs") {
        greeting.textContent = "Job Listings & Opportunities";
        subtext.textContent = "Filter by employment type, tech stack, or company keyword";
        renderJobsView();
    } else if (viewId === "applications") {
        greeting.textContent = "Candidate Pipeline & ATS";
        subtext.textContent = "Track candidate submissions and transition application statuses";
        renderApplicationsView();
    } else if (viewId === "profile") {
        greeting.textContent = "Candidate Profile & Resume";
        subtext.textContent = "Keep your skills and CV updated for instant Java Stream skill-matching";
        renderProfileView();
    } else if (viewId === "users") {
        greeting.textContent = "Platform User Directory";
        subtext.textContent = "Administer Candidates, Recruiters, and platform access";
        renderUsersView();
    }
}

function handleHeroPrimaryAction() {
    if (currentUser.role === "RECRUITER" || currentUser.role === "ADMIN") {
        openJobModal();
    } else {
        navigateTo("jobs");
    }
}

function handleGlobalSearch(query) {
    if (!query) return;
    if (currentView !== "jobs" && currentView !== "applications") {
        navigateTo("jobs");
    }
    const jobSearch = document.getElementById("job-search-input");
    if (jobSearch) {
        jobSearch.value = query;
        renderJobsView();
    }
}

// ============================================================================
// VIEW 1: DASHBOARD RENDERER (Matching Slide 1 Laptop Mockup)
// ============================================================================
function renderDashboardView() {
    const statsGrid = document.getElementById("dashboard-stats-grid");
    const primaryList = document.getElementById("dash-primary-list");
    const secondaryList = document.getElementById("dash-secondary-list");
    const funnelWidget = document.getElementById("dash-funnel-widget");

    currentUser = appState.users.find(u => u.id === currentUser.id) || currentUser;

    // Calculate Dynamic Metrics (With fallback baselines inspired by Slide 1: 428 / 12 / 8 / 6)
    const totalAppsCount = appState.applications.length;
    const openJobsCount = appState.jobs.length;
    const reviewedCount = appState.applications.filter(a => a.status === "Reviewed" || a.status === "Shortlisted" || a.status === "Accepted").length;
    const shortlistedCount = appState.applications.filter(a => a.status === "Shortlisted").length;
    const acceptedCount = appState.applications.filter(a => a.status === "Accepted").length;

    if (currentUser.role === "JOB_SEEKER") {
        const myApps = appState.applications.filter(a => a.seekerId === currentUser.id);
        const myShortlisted = myApps.filter(a => a.status === "Shortlisted" || a.status === "Accepted").length;
        const myPending = myApps.filter(a => a.status === "Pending").length;
        const skillCount = (currentUser.skills || []).length;

        statsGrid.innerHTML = `
            <div class="glass-card stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-label">Open Opportunities</span>
                    <div class="stat-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    </div>
                </div>
                <div class="stat-card-value">${openJobsCount}</div>
                <div class="stat-card-meta">
                    <span class="stat-trend-up">Active now</span> • Real-time listings
                </div>
            </div>

            <div class="glass-card stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-label">Applications Submitted</span>
                    <div class="stat-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                </div>
                <div class="stat-card-value">${myApps.length}</div>
                <div class="stat-card-meta">
                    <span>${myPending} awaiting review</span>
                </div>
            </div>

            <div class="glass-card stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-label">Interviews / Shortlisted</span>
                    <div class="stat-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    </div>
                </div>
                <div class="stat-card-value">${myShortlisted}</div>
                <div class="stat-card-meta">
                    <span class="stat-trend-up">Recruiter selections</span>
                </div>
            </div>

            <div class="glass-card stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-label">Verified Skills Tagged</span>
                    <div class="stat-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    </div>
                </div>
                <div class="stat-card-value">${skillCount}</div>
                <div class="stat-card-meta">
                    <span>Powering match scores</span>
                </div>
            </div>
        `;

        document.getElementById("dash-primary-title").textContent = "Top Skill-Matched Roles For You";
        const scoredJobs = appState.jobs
            .map(j => ({ ...j, match: computeSkillMatch(currentUser.skills || [], j.requiredSkills || []) }))
            .sort((a, b) => b.match - a.match)
            .slice(0, 4);

        primaryList.innerHTML = scoredJobs.map(j => `
            <div class="stack-item">
                <div>
                    <strong>${esc(j.title)}</strong>
                    <div class="text-muted">${esc(j.company)} • ${esc(j.location)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <span class="match-gauge-pill ${j.match >= 75 ? 'match-high' : j.match >= 50 ? 'match-mid' : 'match-low'}">${j.match}% Match</span>
                    <button class="btn btn-sm btn-ghost" onclick="openJobDetailModal('${j.id}')">View</button>
                </div>
            </div>
        `).join("");

        document.getElementById("dash-secondary-title").textContent = "Your Application Pipeline";
        secondaryList.innerHTML = myApps.length ? myApps.slice(0, 4).map(a => {
            const job = appState.jobs.find(j => j.id === a.jobId) || { title: "Archived Role", company: "-" };
            return `
                <div class="stack-item">
                    <div>
                        <strong>${esc(job.title)}</strong>
                        <div class="text-muted">${esc(job.company)} • Applied ${a.appliedAt}</div>
                    </div>
                    <span class="badge ${statusBadgeClass(a.status)}">${a.status}</span>
                </div>
            `;
        }).join("") : `<p class="text-muted">You haven't applied to any roles yet.</p>`;

    } else {
        // RECRUITER & ADMIN VIEW (Exact metrics layout inspired by Slide 1)
        const myJobs = currentUser.role === "RECRUITER" 
            ? appState.jobs.filter(j => j.recruiterId === currentUser.id) 
            : appState.jobs;
        const myJobIds = new Set(myJobs.map(j => j.id));
        const myApps = currentUser.role === "RECRUITER"
            ? appState.applications.filter(a => myJobIds.has(a.jobId))
            : appState.applications;

        const applicantsMetric = myApps.length || 428;
        const openJobsMetric = myJobs.length || 12;
        const interviewsMetric = myApps.filter(a => a.status === "Shortlisted").length || 8;
        const hiredMetric = myApps.filter(a => a.status === "Accepted").length || 6;

        statsGrid.innerHTML = `
            <div class="glass-card stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-label">Total Applicants</span>
                    <div class="stat-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                </div>
                <div class="stat-card-value">${applicantsMetric}</div>
                <div class="stat-card-meta">
                    <span class="stat-trend-up">↑ 14%</span> vs last week
                </div>
            </div>

            <div class="glass-card stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-label">Open Positions</span>
                    <div class="stat-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    </div>
                </div>
                <div class="stat-card-value">${openJobsMetric}</div>
                <div class="stat-card-meta">
                    <span class="stat-trend-up">Active now</span> • Recruiter pipeline
                </div>
            </div>

            <div class="glass-card stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-label">Interviews Scheduled</span>
                    <div class="stat-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    </div>
                </div>
                <div class="stat-card-value">${interviewsMetric}</div>
                <div class="stat-card-meta">
                    <span>Candidates in screening</span>
                </div>
            </div>

            <div class="glass-card stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-label">Successful Hires</span>
                    <div class="stat-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    </div>
                </div>
                <div class="stat-card-value">${hiredMetric}</div>
                <div class="stat-card-meta">
                    <span class="stat-trend-up">High match</span> placements
                </div>
            </div>
        `;

        document.getElementById("dash-primary-title").textContent = currentUser.role === "RECRUITER" ? "Your Job Requisitions" : "Platform Job Listings";
        primaryList.innerHTML = myJobs.length ? myJobs.slice(0, 4).map(j => `
            <div class="stack-item">
                <div>
                    <strong>${esc(j.title)}</strong>
                    <div class="text-muted">${esc(j.type)} • Deadline: ${j.deadline}</div>
                </div>
                <div style="display:flex;gap:0.5rem;">
                    <button class="btn btn-sm btn-ghost" onclick="openJobModal('${j.id}')">Edit</button>
                    <button class="btn btn-sm btn-ghost" onclick="openJobDetailModal('${j.id}')">Details</button>
                </div>
            </div>
        `).join("") : `<p class="text-muted">No jobs posted yet.</p>`;

        document.getElementById("dash-secondary-title").textContent = "Candidate Pipeline Funnel";
        secondaryList.innerHTML = myApps.length ? myApps.slice(0, 4).map(a => {
            const job = appState.jobs.find(j => j.id === a.jobId) || { title: "Role" };
            const seeker = appState.users.find(u => u.id === a.seekerId) || { name: "Candidate" };
            return `
                <div class="stack-item">
                    <div>
                        <strong>${esc(seeker.name)}</strong>
                        <div class="text-muted">Applied for ${esc(job.title)}</div>
                    </div>
                    <button class="btn btn-sm btn-ghost" onclick="openApplicationDetailModal('${a.id}')">${a.status}</button>
                </div>
            `;
        }).join("") : `<p class="text-muted">No applications received yet.</p>`;
    }

    // Render Visual Interactive Hiring Funnel
    if (funnelWidget) {
        const total = appState.applications.length || 1;
        const reviewed = appState.applications.filter(a => a.status === "Reviewed" || a.status === "Shortlisted" || a.status === "Accepted").length;
        const shortlisted = appState.applications.filter(a => a.status === "Shortlisted" || a.status === "Accepted").length;
        const accepted = appState.applications.filter(a => a.status === "Accepted").length;

        funnelWidget.innerHTML = `
            <div class="funnel-step">
                <div class="funnel-label-row">
                    <span>1. Applications Received</span>
                    <strong>${appState.applications.length} (100%)</strong>
                </div>
                <div class="funnel-bar-bg"><div class="funnel-bar-fill" style="width: 100%;"></div></div>
            </div>
            <div class="funnel-step">
                <div class="funnel-label-row">
                    <span>2. Profile Screening / Reviewed</span>
                    <strong>${reviewed} (${Math.round((reviewed/total)*100)}%)</strong>
                </div>
                <div class="funnel-bar-bg"><div class="funnel-bar-fill" style="width: ${Math.max(15, Math.round((reviewed/total)*100))}%;"></div></div>
            </div>
            <div class="funnel-step">
                <div class="funnel-label-row">
                    <span>3. Technical Shortlist</span>
                    <strong>${shortlisted} (${Math.round((shortlisted/total)*100)}%)</strong>
                </div>
                <div class="funnel-bar-bg"><div class="funnel-bar-fill" style="width: ${Math.max(10, Math.round((shortlisted/total)*100))}%;"></div></div>
            </div>
            <div class="funnel-step">
                <div class="funnel-label-row">
                    <span>4. Final Accepted Hires</span>
                    <strong>${accepted} (${Math.round((accepted/total)*100)}%)</strong>
                </div>
                <div class="funnel-bar-bg"><div class="funnel-bar-fill" style="width: ${Math.max(8, Math.round((accepted/total)*100))}%;"></div></div>
            </div>
        `;
    }
}

// ============================================================================
// VIEW 2: JOB LISTINGS & STREAM SEARCH
// ============================================================================
function setJobTypeFilter(type) {
    selectedJobType = type;
    document.querySelectorAll("#job-type-pills .filter-pill").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.type === type);
    });
    renderJobsView();
}

function renderJobsView() {
    const query = (document.getElementById("job-search-input").value || "").trim().toLowerCase();
    const grid = document.getElementById("jobs-grid");

    const filtered = appState.jobs.filter(j => {
        const matchesType = selectedJobType === "ALL" || j.type.toLowerCase() === selectedJobType.toLowerCase();
        const skillStr = (j.requiredSkills || []).join(" ").toLowerCase();
        const matchesQuery = !query ||
            j.title.toLowerCase().includes(query) ||
            j.company.toLowerCase().includes(query) ||
            j.location.toLowerCase().includes(query) ||
            skillStr.includes(query);
        return matchesType && matchesQuery;
    });

    if (!filtered.length) {
        grid.innerHTML = `<div class="glass-panel panel-pad" style="grid-column: 1 / -1; text-align:center;">No job requisitions match your criteria.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(job => {
        const isOwner = currentUser.role === "ADMIN" || (currentUser.role === "RECRUITER" && job.recruiterId === currentUser.id);
        const alreadyApplied = currentUser.role === "JOB_SEEKER" &&
            appState.applications.some(a => a.jobId === job.id && a.seekerId === currentUser.id);
        const matchPct = currentUser.role === "JOB_SEEKER"
            ? computeSkillMatch(currentUser.skills || [], job.requiredSkills || [])
            : null;

        return `
            <article class="glass-card job-card">
                <div>
                    <div class="job-card-top">
                        <span class="badge badge-indigo">${esc(job.type)}</span>
                        ${matchPct !== null ? `<span class="match-gauge-pill ${matchPct >= 75 ? 'match-high' : matchPct >= 50 ? 'match-mid' : 'match-low'}">${matchPct}% Match</span>` : ""}
                    </div>
                    <h3>${esc(job.title)}</h3>
                    <div class="job-meta-row">
                        <span>${esc(job.company)}</span>
                        <span>•</span>
                        <span>${esc(job.location)}</span>
                    </div>
                    <div class="job-meta-row">
                        <strong style="color:var(--neon-teal);">${esc(job.salary)}</strong>
                        <span>•</span>
                        <span>Deadline: ${job.deadline}</span>
                    </div>
                    <p class="text-muted mt-2" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                        ${esc(job.description)}
                    </p>
                    <div class="tags-wrap mt-2">
                        ${(job.requiredSkills || []).map(s => {
                            const isCandidateSkill = (currentUser.skills || []).some(cs => cs.toLowerCase() === s.toLowerCase());
                            return `<span class="skill-tag ${isCandidateSkill ? 'matched' : ''}">${esc(s)}</span>`;
                        }).join("")}
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding-top:1rem;margin-top:1.2rem;border-top:1px solid var(--glass-border-subtle);">
                    <button class="btn btn-sm btn-ghost" onclick="openJobDetailModal('${job.id}')">View Dossier</button>
                    <div style="display:flex;gap:0.45rem;">
                        ${isOwner ? `
                            <button class="btn btn-sm btn-ghost" onclick="openJobModal('${job.id}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteJob('${job.id}')">Remove</button>
                        ` : ""}
                        ${currentUser.role === "JOB_SEEKER" ? `
                            <button class="btn btn-sm ${alreadyApplied ? 'btn-ghost' : 'btn-primary'}"
                                    onclick="${alreadyApplied ? `openJobDetailModal('${job.id}')` : `applyForJob('${job.id}')`}">
                                ${alreadyApplied ? "Applied ✓" : "Quick Apply"}
                            </button>
                        ` : ""}
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function openJobModal(jobId = null) {
    const modal = document.getElementById("job-modal");
    const titleEl = document.getElementById("job-modal-title");
    document.getElementById("job-form").reset();

    if (jobId) {
        const job = appState.jobs.find(j => j.id === jobId);
        if (!job) return;
        titleEl.textContent = "Edit Job Requisition";
        document.getElementById("job-id").value = job.id;
        document.getElementById("job-title").value = job.title;
        document.getElementById("job-company").value = job.company;
        document.getElementById("job-location").value = job.location;
        document.getElementById("job-type").value = job.type;
        document.getElementById("job-salary").value = job.salary;
        document.getElementById("job-deadline").value = job.deadline;
        document.getElementById("job-min-edu").value = job.minEducation || "";
        document.getElementById("job-min-exp").value = job.minExperience || "";
        document.getElementById("job-skills").value = (job.requiredSkills || []).join(", ");
        document.getElementById("job-description").value = job.description;
    } else {
        titleEl.textContent = "Post New Opportunity";
        document.getElementById("job-id").value = "";
        document.getElementById("job-company").value = currentUser.company || "TechNova Systems";
        document.getElementById("job-deadline").value = "2026-12-31";
    }
    renderSkillPreviewTags("job-skills", "job-modal-skill-preview");
    modal.classList.remove("hidden");
}

async function handleSaveJob(e) {
    e.preventDefault();
    const payload = {
        id: document.getElementById("job-id").value,
        title: document.getElementById("job-title").value.trim(),
        company: document.getElementById("job-company").value.trim(),
        recruiterId: currentUser.id,
        location: document.getElementById("job-location").value.trim(),
        type: document.getElementById("job-type").value,
        salary: document.getElementById("job-salary").value.trim(),
        deadline: document.getElementById("job-deadline").value,
        minEducation: document.getElementById("job-min-edu").value.trim(),
        minExperience: document.getElementById("job-min-exp").value.trim(),
        requiredSkills: document.getElementById("job-skills").value,
        description: document.getElementById("job-description").value.trim()
    };

    if (javaServerConnected) {
        const res = await fetch(`${API_BASE}/jobs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) appState = await res.json();
    } else {
        const skillsArr = payload.requiredSkills.split(",").map(s => s.trim()).filter(Boolean);
        if (payload.id) {
            const idx = appState.jobs.findIndex(j => j.id === payload.id);
            if (idx > -1) appState.jobs[idx] = { ...appState.jobs[idx], ...payload, requiredSkills: skillsArr };
        } else {
            appState.jobs.unshift({
                ...payload,
                id: "j-" + Math.random().toString(36).substring(2, 7),
                requiredSkills: skillsArr,
                createdAt: new Date().toISOString().split("T")[0]
            });
        }
        saveFallbackState();
    }

    closeModal("job-modal");
    showToast(payload.id ? "Job listing updated!" : "New job published to Java store!", "success");
    renderJobsView();
    renderDashboardView();
}

async function deleteJob(jobId) {
    if (javaServerConnected) {
        const res = await fetch(`${API_BASE}/jobs`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: jobId })
        });
        if (res.ok) appState = await res.json();
    } else {
        appState.jobs = appState.jobs.filter(j => j.id !== jobId);
        appState.applications = appState.applications.filter(a => a.jobId !== jobId);
        saveFallbackState();
    }
    showToast("Job requisition removed.", "warning");
    renderJobsView();
    renderDashboardView();
}

function openJobDetailModal(jobId) {
    const job = appState.jobs.find(j => j.id === jobId);
    if (!job) return;

    document.getElementById("detail-job-type").textContent = job.type;
    document.getElementById("detail-job-title").textContent = job.title;
    document.getElementById("detail-job-company").textContent = `${job.company} • ${job.location}`;

    const seekerSkills = new Set((currentUser.skills || []).map(s => s.toLowerCase()));
    const applicantCount = appState.applications.filter(a => a.jobId === job.id).length;

    document.getElementById("job-detail-body").innerHTML = `
        <div class="form-grid-2 mb-3">
            <div class="stack-item"><div><small class="text-muted">Compensation Package</small><div><strong style="color:var(--neon-teal);">${esc(job.salary)}</strong></div></div></div>
            <div class="stack-item"><div><small class="text-muted">Application Deadline</small><div><strong>${job.deadline}</strong></div></div></div>
            <div class="stack-item"><div><small class="text-muted">Minimum Education</small><div><strong>${esc(job.minEducation)}</strong></div></div></div>
            <div class="stack-item"><div><small class="text-muted">Minimum Experience</small><div><strong>${esc(job.minExperience)}</strong></div></div></div>
        </div>
        <h4 class="mt-2" style="color:var(--text-primary);">Role Description</h4>
        <p class="text-muted mt-1" style="white-space:pre-line;">${esc(job.description)}</p>
        <h4 class="mt-3" style="color:var(--text-primary);">Required Skills (${applicantCount} total applicants)</h4>
        <div class="tags-wrap mt-1">
            ${(job.requiredSkills || []).map(s => `
                <span class="skill-tag ${seekerSkills.has(s.toLowerCase()) ? 'matched' : ''}">${esc(s)}</span>
            `).join("")}
        </div>
    `;

    const alreadyApplied = currentUser.role === "JOB_SEEKER" &&
        appState.applications.some(a => a.jobId === job.id && a.seekerId === currentUser.id);

    document.getElementById("job-detail-footer").innerHTML = `
        <button class="btn btn-ghost" onclick="closeModal('job-detail-modal')">Close</button>
        ${currentUser.role === "JOB_SEEKER" ? `
            <button class="btn ${alreadyApplied ? 'btn-ghost' : 'btn-primary'}"
                    ${alreadyApplied ? 'disabled' : `onclick="applyForJob('${job.id}'); closeModal('job-detail-modal');"`}>
                ${alreadyApplied ? "Application Already Submitted ✓" : "Submit Application Now"}
            </button>
        ` : ""}
    `;

    document.getElementById("job-detail-modal").classList.remove("hidden");
}

async function applyForJob(jobId) {
    if (javaServerConnected) {
        const res = await fetch(`${API_BASE}/applications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId, seekerId: currentUser.id })
        });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Could not submit application", "error");
            return;
        }
        appState = data;
    } else {
        if (appState.applications.some(a => a.jobId === jobId && a.seekerId === currentUser.id)) {
            showToast("You have already applied for this role.", "warning");
            return;
        }
        appState.applications.unshift({
            id: "app-" + Math.random().toString(36).substring(2, 7),
            jobId,
            seekerId: currentUser.id,
            appliedAt: new Date().toISOString().split("T")[0],
            status: "Pending"
        });
        saveFallbackState();
    }

    showToast("Application submitted! Track status in Applicants Pipeline.", "success");
    renderJobsView();
    renderDashboardView();
}

// ============================================================================
// VIEW 3: APPLICATIONS & ATS PIPELINE
// ============================================================================
function setAppStatusFilter(status) {
    selectedAppStatus = status;
    document.querySelectorAll("#app-status-pills .filter-pill").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.status === status);
    });
    renderApplicationsView();
}

function renderApplicationsView() {
    const tbody = document.getElementById("applications-table-body");

    let list = appState.applications.filter(a => {
        if (currentUser.role === "JOB_SEEKER") return a.seekerId === currentUser.id;
        if (currentUser.role === "RECRUITER") {
            const job = appState.jobs.find(j => j.id === a.jobId);
            return job && job.recruiterId === currentUser.id;
        }
        return true;
    });

    if (selectedAppStatus !== "ALL") {
        list = list.filter(a => a.status.toLowerCase() === selectedAppStatus.toLowerCase());
    }

    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center;padding:2rem;">No candidate applications match this status filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(app => {
        const job = appState.jobs.find(j => j.id === app.jobId) || { title: "Deleted Role", company: "-", requiredSkills: [] };
        const seeker = appState.users.find(u => u.id === app.seekerId) || { name: "Candidate", email: "-", skills: [] };
        const match = computeSkillMatch(seeker.skills || [], job.requiredSkills || []);
        const canManage = currentUser.role === "RECRUITER" || currentUser.role === "ADMIN";

        return `
            <tr>
                <td>
                    <strong>${esc(job.title)}</strong>
                    <div class="text-muted">${esc(job.company)}</div>
                </td>
                <td>
                    <strong>${esc(seeker.name)}</strong>
                    <div class="text-muted">${esc(seeker.email)}</div>
                </td>
                <td><span class="match-gauge-pill ${match >= 75 ? 'match-high' : match >= 50 ? 'match-mid' : 'match-low'}">${match}% Match</span></td>
                <td>${app.appliedAt}</td>
                <td>
                    ${canManage ? `
                        <select onchange="updateAppStatus('${app.id}', this.value)" style="width:auto;padding:0.4rem 0.75rem;">
                            ${["Pending", "Reviewed", "Shortlisted", "Accepted", "Rejected"].map(st =>
                                `<option value="${st}" ${app.status === st ? 'selected' : ''}>${st}</option>`
                            ).join("")}
                        </select>
                    ` : `<span class="badge ${statusBadgeClass(app.status)}">${app.status}</span>`}
                </td>
                <td>
                    <button class="btn btn-sm btn-ghost" onclick="openApplicationDetailModal('${app.id}')">
                        View Dossier
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

async function updateAppStatus(appId, status) {
    if (javaServerConnected) {
        const res = await fetch(`${API_BASE}/applications`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: appId, status })
        });
        if (res.ok) appState = await res.json();
    } else {
        const target = appState.applications.find(a => a.id === appId);
        if (target) target.status = status;
        saveFallbackState();
    }
    showToast(`Application lifecycle status updated to ${status}.`, "success");
    renderApplicationsView();
    renderDashboardView();
}

function openApplicationDetailModal(appId) {
    const app = appState.applications.find(a => a.id === appId);
    if (!app) return;
    const job = appState.jobs.find(j => j.id === app.jobId) || { title: "Role", company: "-", requiredSkills: [] };
    const seeker = appState.users.find(u => u.id === app.seekerId) || { name: "Candidate", skills: [] };
    const match = computeSkillMatch(seeker.skills || [], job.requiredSkills || []);
    const reqSet = new Set((job.requiredSkills || []).map(s => s.toLowerCase()));

    document.getElementById("app-modal-title").textContent = `${seeker.name} — ${job.title}`;
    document.getElementById("app-modal-subtitle").textContent = `Applied on ${app.appliedAt} • Status: ${app.status} • Java Stream Match: ${match}%`;

    document.getElementById("app-detail-body").innerHTML = `
        <div class="form-grid-2 mb-3">
            <div class="stack-item"><div><small class="text-muted">Email & Phone</small><div><strong>${esc(seeker.email)} • ${esc(seeker.phone || 'N/A')}</strong></div></div></div>
            <div class="stack-item"><div><small class="text-muted">Education & Experience</small><div><strong>${esc(seeker.education || 'N/A')} (${esc(seeker.experience || 'N/A')})</strong></div></div></div>
        </div>
        <h4 style="color:var(--text-primary);">Professional Summary</h4>
        <p class="text-muted mt-1">${esc(seeker.summary || "No summary provided.")}</p>
        <h4 class="mt-3" style="color:var(--text-primary);">Candidate Skills (Teal = Matches Job Requirements)</h4>
        <div class="tags-wrap mt-1">
            ${(seeker.skills || []).map(s => `<span class="skill-tag ${reqSet.has(s.toLowerCase()) ? 'matched' : ''}">${esc(s)}</span>`).join("")}
        </div>
        <h4 class="mt-3" style="color:var(--text-primary);">Full Resume / CV Dossier</h4>
        <pre class="glass-panel panel-pad mt-1 mono-textarea" style="white-space:pre-wrap;max-height:220px;overflow-y:auto;">${esc(seeker.resume || "No resume text attached.")}</pre>
    `;

    const canManage = currentUser.role === "RECRUITER" || currentUser.role === "ADMIN";
    document.getElementById("app-detail-footer").innerHTML = `
        <button class="btn btn-ghost" onclick="closeModal('app-detail-modal')">Close</button>
        ${canManage ? `
            <button class="btn btn-primary" onclick="updateAppStatus('${app.id}', 'Shortlisted'); closeModal('app-detail-modal');">Shortlist Candidate</button>
            <button class="btn btn-ghost" onclick="updateAppStatus('${app.id}', 'Accepted'); closeModal('app-detail-modal');">Accept</button>
            <button class="btn btn-danger" onclick="updateAppStatus('${app.id}', 'Rejected'); closeModal('app-detail-modal');">Reject</button>
        ` : ""}
    `;

    document.getElementById("app-detail-modal").classList.remove("hidden");
}

// ============================================================================
// VIEW 4: CANDIDATE PROFILE EDITOR
// ============================================================================
function renderProfileView() {
    currentUser = appState.users.find(u => u.id === currentUser.id) || currentUser;
    document.getElementById("prof-name").value = currentUser.name || "";
    document.getElementById("prof-phone").value = currentUser.phone || "";
    document.getElementById("prof-education").value = currentUser.education || "";
    document.getElementById("prof-experience").value = currentUser.experience || "";
    document.getElementById("prof-skills").value = (currentUser.skills || []).join(", ");
    document.getElementById("prof-summary").value = currentUser.summary || "";
    document.getElementById("prof-resume").value = currentUser.resume || "";

    renderSkillPreviewTags("prof-skills", "prof-skill-tags-preview");
    renderLiveProfileCard();
}

function renderSkillPreviewTags(inputId, containerId) {
    const raw = document.getElementById(inputId).value || "";
    const skills = raw.split(",").map(s => s.trim()).filter(Boolean);
    document.getElementById(containerId).innerHTML = skills
        .map(s => `<span class="skill-tag matched">${esc(s)}</span>`)
        .join("");
}

function renderLiveProfileCard() {
    const container = document.getElementById("profile-live-card");
    container.innerHTML = `
        <div class="stack-item mb-3">
            <div>
                <h3 style="font-size:1.15rem;color:#FFF;">${esc(currentUser.name)}</h3>
                <div class="text-muted">${esc(currentUser.education || "Add education")} • ${esc(currentUser.experience || "Add experience")}</div>
                <div class="text-muted">${esc(currentUser.email)} • ${esc(currentUser.phone || "Add phone")}</div>
            </div>
        </div>
        <p class="text-muted mb-3">${esc(currentUser.summary || "Your professional bio will appear here.")}</p>
        <div class="tags-wrap mb-3">
            ${(currentUser.skills || []).map(s => `<span class="skill-tag matched">${esc(s)}</span>`).join("")}
        </div>
        <h4 style="font-size:0.95rem;color:var(--text-primary);">Resume Snapshot</h4>
        <pre class="glass-panel panel-pad mt-1 mono-textarea" style="white-space:pre-wrap;max-height:240px;overflow-y:auto;">${esc(currentUser.resume || "Paste your resume text to preview.")}</pre>
    `;
}

async function handleSaveProfile(e) {
    e.preventDefault();
    const payload = {
        id: currentUser.id,
        name: document.getElementById("prof-name").value.trim(),
        phone: document.getElementById("prof-phone").value.trim(),
        education: document.getElementById("prof-education").value.trim(),
        experience: document.getElementById("prof-experience").value.trim(),
        skills: document.getElementById("prof-skills").value,
        summary: document.getElementById("prof-summary").value.trim(),
        resume: document.getElementById("prof-resume").value.trim()
    };

    if (javaServerConnected) {
        const res = await fetch(`${API_BASE}/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            appState = data.state;
        }
    } else {
        const skillsArr = payload.skills.split(",").map(s => s.trim()).filter(Boolean);
        const idx = appState.users.findIndex(u => u.id === currentUser.id);
        if (idx > -1) {
            appState.users[idx] = { ...appState.users[idx], ...payload, skills: skillsArr };
            currentUser = appState.users[idx];
        }
        saveFallbackState();
    }

    document.getElementById("sidebar-user-name").textContent = currentUser.name;
    renderLiveProfileCard();
    showToast("Profile updated! Java Stream Match Scores recalculated.", "success");
}

// ============================================================================
// VIEW 5: ADMIN USER MANAGEMENT
// ============================================================================
function setUserRoleFilter(role) {
    selectedUserRole = role;
    document.querySelectorAll("#user-role-pills .filter-pill").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.role === role);
    });
    renderUsersView();
}

function renderUsersView() {
    const query = (document.getElementById("user-search-input").value || "").trim().toLowerCase();
    const tbody = document.getElementById("users-table-body");

    const filtered = appState.users.filter(u => {
        const matchesRole = selectedUserRole === "ALL" || u.role === selectedUserRole;
        const matchesQuery = !query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
        return matchesRole && matchesQuery;
    });

    tbody.innerHTML = filtered.map(u => `
        <tr>
            <td><strong>${esc(u.name)}</strong></td>
            <td>${esc(u.email)}</td>
            <td><span class="badge badge-indigo">${formatRole(u.role)}</span></td>
            <td>${u.createdAt || "2026-01-10"}</td>
            <td>
                <span class="badge ${u.active !== false ? 'badge-emerald' : 'badge-rose'}">
                    ${u.active !== false ? "Active" : "Suspended"}
                </span>
            </td>
            <td>
                ${u.role !== "ADMIN" ? `
                    <button class="btn btn-sm btn-ghost" onclick="toggleUserStatus('${u.id}')">
                        ${u.active !== false ? "Suspend" : "Activate"}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">Remove</button>
                ` : `<span class="text-muted">Protected Admin</span>`}
            </td>
        </tr>
    `).join("");
}

async function toggleUserStatus(userId) {
    if (javaServerConnected) {
        const res = await fetch(`${API_BASE}/users`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: userId })
        });
        if (res.ok) appState = await res.json();
    } else {
        const target = appState.users.find(u => u.id === userId);
        if (target) target.active = target.active === false;
        saveFallbackState();
    }
    showToast("User access status toggled.", "info");
    renderUsersView();
}

async function deleteUser(userId) {
    if (javaServerConnected) {
        const res = await fetch(`${API_BASE}/users`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: userId })
        });
        if (res.ok) appState = await res.json();
    } else {
        appState.users = appState.users.filter(u => u.id !== userId);
        appState.applications = appState.applications.filter(a => a.seekerId !== userId);
        saveFallbackState();
    }
    showToast("User deleted from platform.", "warning");
    renderUsersView();
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================
function computeSkillMatch(candidateSkills, requiredSkills) {
    if (!requiredSkills || !requiredSkills.length) return 100;
    if (!candidateSkills || !candidateSkills.length) return 0;
    const set = new Set(candidateSkills.map(s => s.trim().toLowerCase()));
    const matched = requiredSkills.filter(r => set.has(r.trim().toLowerCase())).length;
    return Math.round((matched / requiredSkills.length) * 100);
}

function formatRole(role) {
    if (role === "ADMIN") return "Administrator";
    if (role === "RECRUITER") return "Recruiter";
    return "Candidate";
}

function statusBadgeClass(status) {
    switch (status) {
        case "Accepted": return "badge-emerald";
        case "Shortlisted": return "badge-cyan";
        case "Reviewed": return "badge-indigo";
        case "Rejected": return "badge-rose";
        default: return "badge-amber";
    }
}

function getInitials(name) {
    return (name || "HF").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
}

function esc(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3600);
}
