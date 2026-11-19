import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Predicate;
import java.util.stream.Collectors;

public class HireFlowServer {
    private static final int PORT = 8080;
    private static final String DATA_FILE = "hireflow_store.ser";

    public enum Role {
        ADMIN, RECRUITER, JOB_SEEKER;

        public static Role fromString(String s) {
            if (s == null) return JOB_SEEKER;
            return switch (s.trim().toUpperCase().replace("-", "").replace(" ", "").replace("_", "")) {
                case "ADMIN" -> ADMIN;
                case "RECRUITER", "EMPLOYER" -> RECRUITER;
                default -> JOB_SEEKER;
            };
        }
    }

    public enum JobType {
        FULL_TIME("Full-Time"),
        PART_TIME("Part-Time"),
        INTERNSHIP("Internship"),
        CONTRACT("Contract"),
        REMOTE("Remote");

        private final String label;

        JobType(String label) { this.label = label; }

        public String getLabel() { return label; }

        public static JobType fromString(String s) {
            if (s == null) return FULL_TIME;
            for (JobType jt : values()) {
                if (jt.name().equalsIgnoreCase(s.replace("-", "_")) || jt.label.equalsIgnoreCase(s)) {
                    return jt;
                }
            }
            return FULL_TIME;
        }
    }

    public enum ApplicationStatus {
        PENDING("Pending"),
        REVIEWED("Reviewed"),
        SHORTLISTED("Shortlisted"),
        ACCEPTED("Accepted"),
        REJECTED("Rejected");

        private final String label;

        ApplicationStatus(String label) { this.label = label; }

        public String getLabel() { return label; }

        public static ApplicationStatus fromString(String s) {
            if (s == null) return PENDING;
            for (ApplicationStatus st : values()) {
                if (st.name().equalsIgnoreCase(s) || st.label.equalsIgnoreCase(s)) {
                    return st;
                }
            }
            return PENDING;
        }
    }

    public static abstract class HireFlowException extends Exception {
        private final int statusCode;

        public HireFlowException(String message, int statusCode) {
            super(message);
            this.statusCode = statusCode;
        }

        public int getStatusCode() { return statusCode; }
    }

    public static class InvalidCredentialsException extends HireFlowException {
        public InvalidCredentialsException(String msg) { super(msg, 401); }
    }

    public static class UnauthorizedRoleException extends HireFlowException {
        public UnauthorizedRoleException(String msg) { super(msg, 403); }
    }

    public static class DuplicateApplicationException extends HireFlowException {
        public DuplicateApplicationException(String msg) { super(msg, 409); }
    }

    public static class JobDeadlineExpiredException extends HireFlowException {
        public JobDeadlineExpiredException(String msg) { super(msg, 400); }
    }

    public static class ResourceNotFoundException extends HireFlowException {
        public ResourceNotFoundException(String msg) { super(msg, 404); }
    }

    public interface CrudRepository<T, ID> {
        T save(T entity);
        Optional<T> findById(ID id);
        List<T> findAll();
        boolean deleteById(ID id);
    }

    @FunctionalInterface
    public interface SearchFilter<T> {
        List<T> filter(Collection<T> items, Predicate<T> predicate, Comparator<T> sorter);
    }

    public static class StreamSearchEngine<T> implements SearchFilter<T> {
        @Override
        public List<T> filter(Collection<T> items, Predicate<T> predicate, Comparator<T> sorter) {
            return items.stream().filter(predicate).sorted(sorter).collect(Collectors.toList());
        }
    }

    public static class SeekerProfile implements Serializable {
        private static final long serialVersionUID = 1L;
        private String phone;
        private String education;
        private String experience;
        private List<String> skills;
        private String summary;
        private String resume;

        public SeekerProfile(String phone, String education, String experience,
                            List<String> skills, String summary, String resume) {
            this.phone = phone != null ? phone : "";
            this.education = education != null ? education : "";
            this.experience = experience != null ? experience : "";
            this.skills = skills != null ? new ArrayList<>(skills) : new ArrayList<>();
            this.summary = summary != null ? summary : "";
            this.resume = resume != null ? resume : "";
        }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public String getEducation() { return education; }
        public void setEducation(String education) { this.education = education; }
        public String getExperience() { return experience; }
        public void setExperience(String experience) { this.experience = experience; }
        public List<String> getSkills() { return skills; }
        public void setSkills(List<String> skills) { this.skills = new ArrayList<>(skills); }
        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }
        public String getResume() { return resume; }
        public void setResume(String resume) { this.resume = resume; }
    }

    public static abstract class User implements Serializable {
        private static final long serialVersionUID = 1L;
        protected String id;
        protected String name;
        protected String email;
        protected String password;
        protected Role role;
        protected boolean active;
        protected String createdAt;

        public User(String id, String name, String email, String password, Role role, String createdAt) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.password = password;
            this.role = role;
            this.active = true;
            this.createdAt = createdAt;
        }

        public String getId() { return id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public String getPassword() { return password; }
        public Role getRole() { return role; }
        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }
        public String getCreatedAt() { return createdAt; }

        public abstract Map<String, Object> getDashboardMetrics(DataStore store);

        public String toJson() {
            StringBuilder sb = new StringBuilder("{");
            sb.append("\"id\":\"").append(JsonUtil.esc(id)).append("\",");
            sb.append("\"name\":\"").append(JsonUtil.esc(name)).append("\",");
            sb.append("\"email\":\"").append(JsonUtil.esc(email)).append("\",");
            sb.append("\"role\":\"").append(role.name()).append("\",");
            sb.append("\"active\":").append(active).append(",");
            sb.append("\"createdAt\":\"").append(JsonUtil.esc(createdAt)).append("\"");
            appendSubclassJson(sb);
            sb.append("}");
            return sb.toString();
        }

        protected abstract void appendSubclassJson(StringBuilder sb);
    }

    public static class Admin extends User {
        private static final long serialVersionUID = 1L;

        public Admin(String id, String name, String email, String password, String createdAt) {
            super(id, name, email, password, Role.ADMIN, createdAt);
        }

        @Override
        public Map<String, Object> getDashboardMetrics(DataStore store) {
            Map<String, Object> metrics = new LinkedHashMap<>();
            metrics.put("totalUsers", store.users.size());
            metrics.put("totalJobs", store.jobs.size());
            metrics.put("totalApplications", store.applications.size());
            return metrics;
        }

        @Override
        protected void appendSubclassJson(StringBuilder sb) {
            sb.append(",\"company\":\"HireFlow Administration\"");
        }
    }

    public static class Recruiter extends User {
        private static final long serialVersionUID = 1L;
        private String company;

        public Recruiter(String id, String name, String email, String password, String company, String createdAt) {
            super(id, name, email, password, Role.RECRUITER, createdAt);
            this.company = (company == null || company.isBlank()) ? "TechNova Systems" : company;
        }

        public String getCompany() { return company; }
        public void setCompany(String company) { this.company = company; }

        @Override
        public Map<String, Object> getDashboardMetrics(DataStore store) {
            Map<String, Object> metrics = new LinkedHashMap<>();
            Set<String> myJobs = store.jobs.values().stream()
                .filter(j -> j.getRecruiterId().equals(this.id))
                .map(Job::getId).collect(Collectors.toSet());
            metrics.put("myPostedJobs", myJobs.size());
            return metrics;
        }

        @Override
        protected void appendSubclassJson(StringBuilder sb) {
            sb.append(",\"company\":\"").append(JsonUtil.esc(company)).append("\"");
        }
    }

    public static class JobSeeker extends User {
        private static final long serialVersionUID = 1L;
        private SeekerProfile profile;

        public JobSeeker(String id, String name, String email, String password, String createdAt, SeekerProfile profile) {
            super(id, name, email, password, Role.JOB_SEEKER, createdAt);
            this.profile = profile != null ? profile : new SeekerProfile("", "", "", Collections.emptyList(), "", "");
        }

        public SeekerProfile getProfile() { return profile; }
        public void setProfile(SeekerProfile profile) { this.profile = profile; }

        @Override
        public Map<String, Object> getDashboardMetrics(DataStore store) {
            Map<String, Object> metrics = new LinkedHashMap<>();
            metrics.put("availableJobs", store.jobs.size());
            return metrics;
        }

        @Override
        protected void appendSubclassJson(StringBuilder sb) {
            sb.append(",\"phone\":\"").append(JsonUtil.esc(profile.getPhone())).append("\"");
            sb.append(",\"education\":\"").append(JsonUtil.esc(profile.getEducation())).append("\"");
            sb.append(",\"experience\":\"").append(JsonUtil.esc(profile.getExperience())).append("\"");
            sb.append(",\"skills\":").append(JsonUtil.toJsonStringArray(profile.getSkills()));
            sb.append(",\"summary\":\"").append(JsonUtil.esc(profile.getSummary())).append("\"");
            sb.append(",\"resume\":\"").append(JsonUtil.esc(profile.getResume())).append("\"");
        }
    }

    public static class RequirementCriteria implements Serializable {
        private static final long serialVersionUID = 1L;
        private String minEducation;
        private String minExperience;
        private List<String> requiredSkills;

        public RequirementCriteria(String minEducation, String minExperience, List<String> requiredSkills) {
            this.minEducation = minEducation != null ? minEducation : "";
            this.minExperience = minExperience != null ? minExperience : "";
            this.requiredSkills = requiredSkills != null ? new ArrayList<>(requiredSkills) : new ArrayList<>();
        }

        public String getMinEducation() { return minEducation; }
        public String getMinExperience() { return minExperience; }
        public List<String> getRequiredSkills() { return requiredSkills; }
    }

    public static class Job implements Serializable {
        private static final long serialVersionUID = 1L;
        private String id;
        private String title;
        private String company;
        private String recruiterId;
        private String location;
        private JobType type;
        private String salary;
        private String deadline;
        private String description;
        private RequirementCriteria requirements;
        private String createdAt;

        public Job(String id, String title, String company, String recruiterId, String location,
                   JobType type, String salary, String deadline, String description,
                   RequirementCriteria requirements, String createdAt) {
            this.id = id;
            this.title = title;
            this.company = company;
            this.recruiterId = recruiterId;
            this.location = location;
            this.type = type != null ? type : JobType.FULL_TIME;
            this.salary = salary;
            this.deadline = deadline;
            this.description = description;
            this.requirements = requirements != null ? requirements : new RequirementCriteria("", "", Collections.emptyList());
            this.createdAt = createdAt;
        }

        public String getId() { return id; }
        public String getTitle() { return title; }
        public String getCompany() { return company; }
        public String getRecruiterId() { return recruiterId; }
        public String getLocation() { return location; }
        public JobType getType() { return type; }
        public String getSalary() { return salary; }
        public String getDeadline() { return deadline; }
        public String getDescription() { return description; }
        public RequirementCriteria getRequirements() { return requirements; }
        public String getCreatedAt() { return createdAt; }

        public void update(String title, String company, String location, JobType type,
                           String salary, String deadline, String description, RequirementCriteria req) {
            this.title = title;
            this.company = company;
            this.location = location;
            this.type = type;
            this.salary = salary;
            this.deadline = deadline;
            this.description = description;
            this.requirements = req;
        }

        public String toJson() {
            return "{" +
                "\"id\":\"" + JsonUtil.esc(id) + "\"," +
                "\"title\":\"" + JsonUtil.esc(title) + "\"," +
                "\"company\":\"" + JsonUtil.esc(company) + "\"," +
                "\"recruiterId\":\"" + JsonUtil.esc(recruiterId) + "\"," +
                "\"location\":\"" + JsonUtil.esc(location) + "\"," +
                "\"type\":\"" + JsonUtil.esc(type.getLabel()) + "\"," +
                "\"salary\":\"" + JsonUtil.esc(salary) + "\"," +
                "\"deadline\":\"" + JsonUtil.esc(deadline) + "\"," +
                "\"description\":\"" + JsonUtil.esc(description) + "\"," +
                "\"minEducation\":\"" + JsonUtil.esc(requirements.getMinEducation()) + "\"," +
                "\"minExperience\":\"" + JsonUtil.esc(requirements.getMinExperience()) + "\"," +
                "\"requiredSkills\":" + JsonUtil.toJsonStringArray(requirements.getRequiredSkills()) + "," +
                "\"createdAt\":\"" + JsonUtil.esc(createdAt) + "\"" +
                "}";
        }
    }

    public static class JobApplication implements Serializable {
        private static final long serialVersionUID = 1L;
        private String id;
        private String jobId;
        private String seekerId;
        private String appliedAt;
        private ApplicationStatus status;

        public JobApplication(String id, String jobId, String seekerId, String appliedAt, ApplicationStatus status) {
            this.id = id;
            this.jobId = jobId;
            this.seekerId = seekerId;
            this.appliedAt = appliedAt;
            this.status = status != null ? status : ApplicationStatus.PENDING;
        }

        public String getId() { return id; }
        public String getJobId() { return jobId; }
        public String getSeekerId() { return seekerId; }
        public String getAppliedAt() { return appliedAt; }
        public ApplicationStatus getStatus() { return status; }
        public void setStatus(ApplicationStatus status) { this.status = status; }

        public String toJson() {
            return "{" +
                "\"id\":\"" + JsonUtil.esc(id) + "\"," +
                "\"jobId\":\"" + JsonUtil.esc(jobId) + "\"," +
                "\"seekerId\":\"" + JsonUtil.esc(seekerId) + "\"," +
                "\"appliedAt\":\"" + JsonUtil.esc(appliedAt) + "\"," +
                "\"status\":\"" + JsonUtil.esc(status.getLabel()) + "\"" +
                "}";
        }
    }

    public static class DataStore implements Serializable {
        private static final long serialVersionUID = 1L;
        public Map<String, User> users = new ConcurrentHashMap<>();
        public Map<String, Job> jobs = new ConcurrentHashMap<>();
        public Map<String, JobApplication> applications = new ConcurrentHashMap<>();

        public static synchronized DataStore loadOrSeed() {
            File f = new File(DATA_FILE);
            if (f.exists()) {
                try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream(f))) {
                    return (DataStore) ois.readObject();
                } catch (Exception ignored) {}
            }
            DataStore ds = new DataStore();
            ds.seedDemoData();
            ds.saveToDisk();
            return ds;
        }

        public synchronized void saveToDisk() {
            try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(DATA_FILE))) {
                oos.writeObject(this);
            } catch (IOException e) {
                System.err.println("Persistence error: " + e.getMessage());
            }
        }

        private void seedDemoData() {
            Admin admin = new Admin("u-admin", "Elena Vance", "admin@hireflow.io", "admin123", "2026-01-10");
            Recruiter rec1 = new Recruiter("u-rec1", "Marcus Sterling", "recruiter@technova.io", "recruiter123", "TechNova Systems", "2026-01-14");
            Recruiter rec2 = new Recruiter("u-rec2", "Priya Nair", "priya@cloudscale.ai", "recruiter123", "CloudScale AI", "2026-02-01");

            SeekerProfile sp1 = new SeekerProfile(
                "+91 98765 43210",
                "B.Tech in Computer Science & Engineering",
                "2 Years (Internships & Projects)",
                Arrays.asList("Java", "Spring Boot", "Data Structures", "SQL", "REST APIs", "Git", "Docker"),
                "Backend-focused Software Engineering undergraduate passionate about scalable distributed systems, clean OOP architecture, and low-latency Java microservices.",
                "EDUCATION\nB.Tech in Computer Science & Engineering (GPA: 8.8/10)\n\nEXPERIENCE\nSoftware Engineering Intern @ FinEdge Labs\n- Built high-throughput REST APIs in Java 17 and optimized SQL queries.\n\nPROJECTS\n- HireFlow: Full-Stack Java Recruitment Engine."
            );
            JobSeeker seeker1 = new JobSeeker("u-seek1", "Aarav Sharma", "seeker@hireflow.io", "seeker123", "2026-02-10", sp1);

            SeekerProfile sp2 = new SeekerProfile(
                "+91 91234 56789",
                "M.Tech in Artificial Intelligence",
                "3 Years",
                Arrays.asList("Python", "Java", "Machine Learning", "Docker", "Kubernetes", "SQL", "AWS"),
                "Full-stack ML & Backend engineer experienced in deploying containerized microservices.",
                "EDUCATION\nM.Tech in AI & Data Science\n\nEXPERIENCE\nSystems Engineer @ QuantCore"
            );
            JobSeeker seeker2 = new JobSeeker("u-seek2", "Meera Krishnan", "meera@hireflow.io", "seeker123", "2026-02-18", sp2);

            users.put(admin.getId(), admin);
            users.put(rec1.getId(), rec1);
            users.put(rec2.getId(), rec2);
            users.put(seeker1.getId(), seeker1);
            users.put(seeker2.getId(), seeker2);

            Job j1 = new Job("j-101", "Senior Java Backend Engineer", "TechNova Systems", "u-rec1",
                "Bengaluru, India (Hybrid)", JobType.FULL_TIME, "₹18,00,000 - ₹24,00,000 / yr", "2026-12-31",
                "Architect and maintain mission-critical Java 17+ backend services and high-concurrency REST APIs.",
                new RequirementCriteria("B.Tech / B.E. in CS", "2+ Years",
                    Arrays.asList("Java", "Spring Boot", "SQL", "REST APIs", "Docker", "Microservices")),
                "2026-10-15");

            Job j2 = new Job("j-102", "Software Development Engineer Intern", "TechNova Systems", "u-rec1",
                "Hyderabad, India", JobType.INTERNSHIP, "₹45,000 / month stipend", "2026-12-15",
                "Join our core platform engineering team for a 6-month internship building production Java services.",
                new RequirementCriteria("Pursuing B.Tech in CS/IT", "0 - 1 Year",
                    Arrays.asList("Java", "Data Structures", "SQL", "Git", "REST APIs")),
                "2026-10-20");

            Job j3 = new Job("j-103", "Cloud & DevOps Platform Specialist", "CloudScale AI", "u-rec2",
                "Remote", JobType.REMOTE, "₹16,00,000 - ₹22,00,000 / yr", "2026-12-20",
                "Lead Kubernetes cluster automation, CI/CD observability pipelines, and cloud deployments.",
                new RequirementCriteria("B.Tech / M.Tech in CS", "2+ Years",
                    Arrays.asList("Docker", "Kubernetes", "AWS", "Linux", "Git", "Java")),
                "2026-10-22");

            Job j4 = new Job("j-104", "Frontend UI Systems Architect", "TechNova Systems", "u-rec1",
                "Bengaluru, India", JobType.CONTRACT, "₹1,20,000 / month", "2026-11-30",
                "Design ultra-responsive glassmorphism web interfaces and reusable design systems.",
                new RequirementCriteria("B.Des / B.Tech in CS", "1+ Years",
                    Arrays.asList("JavaScript", "CSS3", "HTML5", "UI/UX", "REST APIs")),
                "2026-10-25");

            Job j5 = new Job("j-105", "Part-Time Technical Curriculum Mentor", "CloudScale AI", "u-rec2",
                "Remote", JobType.PART_TIME, "₹35,000 / month", "2026-12-10",
                "Conduct evening code reviews and mentor junior engineers in Object-Oriented Programming and Java Streams.",
                new RequirementCriteria("B.Tech / M.Tech", "1+ Years",
                    Arrays.asList("Java", "Data Structures", "Git", "SQL")),
                "2026-10-28");

            jobs.put(j1.getId(), j1);
            jobs.put(j2.getId(), j2);
            jobs.put(j3.getId(), j3);
            jobs.put(j4.getId(), j4);
            jobs.put(j5.getId(), j5);

            JobApplication a1 = new JobApplication("app-1", "j-102", "u-seek1", "2026-10-24", ApplicationStatus.SHORTLISTED);
            JobApplication a2 = new JobApplication("app-2", "j-101", "u-seek1", "2026-10-26", ApplicationStatus.REVIEWED);
            JobApplication a3 = new JobApplication("app-3", "j-105", "u-seek1", "2026-10-29", ApplicationStatus.PENDING);
            JobApplication a4 = new JobApplication("app-4", "j-103", "u-seek2", "2026-10-27", ApplicationStatus.ACCEPTED);

            applications.put(a1.getId(), a1);
            applications.put(a2.getId(), a2);
            applications.put(a3.getId(), a3);
            applications.put(a4.getId(), a4);
        }

        public String toFullStateJson() {
            String usersJson = users.values().stream()
                .sorted(Comparator.comparing(User::getCreatedAt))
                .map(User::toJson).collect(Collectors.joining(",", "[", "]"));
            String jobsJson = jobs.values().stream()
                .sorted(Comparator.comparing(Job::getCreatedAt).reversed())
                .map(Job::toJson).collect(Collectors.joining(",", "[", "]"));
            String appsJson = applications.values().stream()
                .sorted(Comparator.comparing(JobApplication::getAppliedAt).reversed())
                .map(JobApplication::toJson).collect(Collectors.joining(",", "[", "]"));
            return "{\"users\":" + usersJson + ",\"jobs\":" + jobsJson + ",\"applications\":" + appsJson + "}";
        }
    }

    public static class JsonUtil {
        public static String esc(String s) {
            if (s == null) return "";
            return s.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "");
        }

        public static String toJsonStringArray(List<String> list) {
            if (list == null || list.isEmpty()) return "[]";
            return list.stream()
                .map(item -> "\"" + esc(item.trim()) + "\"")
                .collect(Collectors.joining(",", "[", "]"));
        }

        public static Map<String, String> parseFlatJson(String body) {
            Map<String, String> map = new HashMap<>();
            if (body == null || body.isBlank()) return map;
            String trimmed = body.trim();
            if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                trimmed = trimmed.substring(1, trimmed.length() - 1);
            }
            int i = 0, n = trimmed.length();
            while (i < n) {
                while (i < n && (Character.isWhitespace(trimmed.charAt(i)) || trimmed.charAt(i) == ',')) i++;
                if (i >= n || trimmed.charAt(i) != '"') break;
                i++;
                StringBuilder key = new StringBuilder();
                while (i < n && trimmed.charAt(i) != '"') {
                    if (trimmed.charAt(i) == '\\' && i + 1 < n) i++;
                    key.append(trimmed.charAt(i++));
                }
                i++; // skip closing quote
                while (i < n && (Character.isWhitespace(trimmed.charAt(i)) || trimmed.charAt(i) == ':')) i++;
                if (i >= n) break;
                StringBuilder val = new StringBuilder();
                if (trimmed.charAt(i) == '"') {
                    i++;
                    while (i < n) {
                        char c = trimmed.charAt(i);
                        if (c == '\\' && i + 1 < n) {
                            char next = trimmed.charAt(i + 1);
                            if (next == 'n') val.append('\n');
                            else if (next == 'r') val.append('\r');
                            else if (next == 't') val.append('\t');
                            else val.append(next);
                            i += 2;
                            continue;
                        }
                        if (c == '"') { i++; break; }
                        val.append(c);
                        i++;
                    }
                } else if (trimmed.charAt(i) == '[') {
                    // array value (e.g. skills)
                    int bracketDepth = 0;
                    while (i < n) {
                        char c = trimmed.charAt(i++);
                        val.append(c);
                        if (c == '[') bracketDepth++;
                        else if (c == ']') {
                            bracketDepth--;
                            if (bracketDepth == 0) break;
                        }
                    }
                } else {
                    while (i < n && trimmed.charAt(i) != ',') {
                        val.append(trimmed.charAt(i++));
                    }
                }
                map.put(key.toString(), val.toString().trim());
            }
            return map;
        }

        public static List<String> parseCsvSkills(String csv) {
            if (csv == null || csv.isBlank()) return new ArrayList<>();
            // Handles both JSON array format '["Java", "SQL"]' and CSV 'Java, SQL'
            String cleaned = csv.trim();
            if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
                cleaned = cleaned.substring(1, cleaned.length() - 1);
            }
            return Arrays.stream(cleaned.split(","))
                .map(s -> s.replace("\"", "").trim())
                .filter(s -> !s.isEmpty())
                .distinct()
                .collect(Collectors.toList());
        }
    }

    private static DataStore store;

    public static void main(String[] args) throws IOException {
        store = DataStore.loadOrSeed();
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/api/state", HireFlowServer::handleState);
        server.createContext("/api/auth/login", HireFlowServer::handleLogin);
        server.createContext("/api/auth/register", HireFlowServer::handleRegister);
        server.createContext("/api/jobs", HireFlowServer::handleJobs);
        server.createContext("/api/applications", HireFlowServer::handleApplications);
        server.createContext("/api/profile", HireFlowServer::handleProfile);
        server.createContext("/api/users", HireFlowServer::handleUsers);
        server.createContext("/", new StaticFileHandler());
        server.setExecutor(null);
        server.start();
        System.out.println("[HireFlow] Server running at http://localhost:" + PORT);
    }

    private static void handleState(HttpExchange ex) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) { sendCors(ex); return; }
        sendJson(ex, 200, store.toFullStateJson());
    }

    private static void handleLogin(HttpExchange ex) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) { sendCors(ex); return; }
        try {
            Map<String, String> body = JsonUtil.parseFlatJson(readBody(ex));
            String email = body.getOrDefault("email", "").toLowerCase();
            String password = body.getOrDefault("password", "");
            User user = store.users.values().stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(email) && u.getPassword().equals(password))
                .findFirst().orElseThrow(() -> new InvalidCredentialsException("Invalid email or password."));
            if (!user.isActive()) throw new UnauthorizedRoleException("Account is suspended.");
            sendJson(ex, 200, "{\"user\":" + user.toJson() + ",\"state\":" + store.toFullStateJson() + "}");
        } catch (HireFlowException he) {
            sendError(ex, he.getStatusCode(), he.getMessage());
        }
    }

    private static void handleRegister(HttpExchange ex) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) { sendCors(ex); return; }
        Map<String, String> body = JsonUtil.parseFlatJson(readBody(ex));
        String name = body.getOrDefault("name", "").trim();
        String email = body.getOrDefault("email", "").trim().toLowerCase();
        String password = body.getOrDefault("password", "");
        Role role = Role.fromString(body.get("role"));
        String company = body.getOrDefault("company", "Partner Employer");

        if (store.users.values().stream().anyMatch(u -> u.getEmail().equalsIgnoreCase(email))) {
            sendError(ex, 409, "Account with this email already exists.");
            return;
        }

        String id = "u-" + UUID.randomUUID().toString().substring(0, 8);
        String today = LocalDate.now().toString();
        User newUser = (role == Role.RECRUITER)
            ? new Recruiter(id, name, email, password, company, today)
            : new JobSeeker(id, name, email, password, today, new SeekerProfile("", "", "Fresher", Arrays.asList("Java", "SQL"), "", ""));
        store.users.put(id, newUser);
        store.saveToDisk();
        sendJson(ex, 201, "{\"user\":" + newUser.toJson() + ",\"state\":" + store.toFullStateJson() + "}");
    }

    private static void handleJobs(HttpExchange ex) throws IOException {
        String method = ex.getRequestMethod().toUpperCase();
        if ("OPTIONS".equals(method)) { sendCors(ex); return; }
        Map<String, String> body = JsonUtil.parseFlatJson(readBody(ex));
        if ("POST".equals(method) || "PUT".equals(method)) {
            String id = body.getOrDefault("id", "");
            RequirementCriteria req = new RequirementCriteria(
                body.getOrDefault("minEducation", ""),
                body.getOrDefault("minExperience", ""),
                JsonUtil.parseCsvSkills(body.getOrDefault("requiredSkills", ""))
            );
            if (!id.isEmpty() && store.jobs.containsKey(id)) {
                store.jobs.get(id).update(
                    body.get("title"),
                    body.get("company"),
                    body.get("location"),
                    JobType.fromString(body.get("type")),
                    body.get("salary"),
                    body.get("deadline"),
                    body.get("description"),
                    req
                );
            } else {
                String newId = "j-" + UUID.randomUUID().toString().substring(0, 6);
                store.jobs.put(newId, new Job(
                    newId,
                    body.get("title"),
                    body.get("company"),
                    body.getOrDefault("recruiterId", "u-rec1"),
                    body.get("location"),
                    JobType.fromString(body.get("type")),
                    body.get("salary"),
                    body.get("deadline"),
                    body.get("description"),
                    req,
                    LocalDate.now().toString()
                ));
            }
            store.saveToDisk();
            sendJson(ex, 200, store.toFullStateJson());
        } else if ("DELETE".equals(method)) {
            String jobId = body.getOrDefault("id", "");
            store.jobs.remove(jobId);
            store.applications.values().removeIf(a -> a.getJobId().equals(jobId));
            store.saveToDisk();
            sendJson(ex, 200, store.toFullStateJson());
        }
    }

    private static void handleApplications(HttpExchange ex) throws IOException {
        String method = ex.getRequestMethod().toUpperCase();
        if ("OPTIONS".equals(method)) { sendCors(ex); return; }
        try {
            Map<String, String> body = JsonUtil.parseFlatJson(readBody(ex));
            if ("POST".equals(method)) {
                String jobId = body.getOrDefault("jobId", "");
                String seekerId = body.getOrDefault("seekerId", "");
                Job job = store.jobs.get(jobId);
                if (job == null) throw new ResourceNotFoundException("Job not found.");
                if (LocalDate.now().isAfter(LocalDate.parse(job.getDeadline()))) {
                    throw new JobDeadlineExpiredException("Deadline has passed.");
                }
                if (store.applications.values().stream().anyMatch(a -> a.getJobId().equals(jobId) && a.getSeekerId().equals(seekerId))) {
                    throw new DuplicateApplicationException("Already applied.");
                }
                String appId = "app-" + UUID.randomUUID().toString().substring(0, 6);
                store.applications.put(appId, new JobApplication(appId, jobId, seekerId, LocalDate.now().toString(), ApplicationStatus.PENDING));
                store.saveToDisk();
                sendJson(ex, 201, store.toFullStateJson());
            } else if ("PUT".equals(method)) {
                JobApplication app = store.applications.get(body.getOrDefault("id", ""));
                if (app != null) {
                    app.setStatus(ApplicationStatus.fromString(body.get("status")));
                    store.saveToDisk();
                }
                sendJson(ex, 200, store.toFullStateJson());
            }
        } catch (HireFlowException he) {
            sendError(ex, he.getStatusCode(), he.getMessage());
        }
    }

    private static void handleProfile(HttpExchange ex) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) { sendCors(ex); return; }
        Map<String, String> body = JsonUtil.parseFlatJson(readBody(ex));
        User u = store.users.get(body.getOrDefault("id", ""));
        if (u instanceof JobSeeker seeker) {
            seeker.setName(body.getOrDefault("name", seeker.getName()));
            SeekerProfile p = seeker.getProfile();
            p.setPhone(body.getOrDefault("phone", ""));
            p.setEducation(body.getOrDefault("education", ""));
            p.setExperience(body.getOrDefault("experience", ""));
            p.setSkills(JsonUtil.parseCsvSkills(body.getOrDefault("skills", "")));
            p.setSummary(body.getOrDefault("summary", ""));
            p.setResume(body.getOrDefault("resume", ""));
            store.saveToDisk();
            sendJson(ex, 200, "{\"user\":" + seeker.toJson() + ",\"state\":" + store.toFullStateJson() + "}");
        } else {
            sendError(ex, 404, "Profile not found.");
        }
    }

    private static void handleUsers(HttpExchange ex) throws IOException {
        String method = ex.getRequestMethod().toUpperCase();
        if ("OPTIONS".equals(method)) { sendCors(ex); return; }
        Map<String, String> body = JsonUtil.parseFlatJson(readBody(ex));
        String userId = body.getOrDefault("id", "");
        User u = store.users.get(userId);
        if (u != null && u.getRole() != Role.ADMIN) {
            if ("PUT".equals(method)) {
                u.setActive(!u.isActive());
            } else if ("DELETE".equals(method)) {
                store.users.remove(userId);
                store.applications.values().removeIf(a -> a.getSeekerId().equals(userId));
            }
            store.saveToDisk();
        }
        sendJson(ex, 200, store.toFullStateJson());
    }

    private static String readBody(HttpExchange ex) throws IOException {
        try (InputStream is = ex.getRequestBody()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static void sendCors(HttpExchange ex) throws IOException {
        ex.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        ex.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        ex.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
        ex.sendResponseHeaders(204, -1);
    }

    private static void sendJson(HttpExchange ex, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json; charset=UTF-8");
        ex.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = ex.getResponseBody()) { os.write(bytes); }
    }

    private static void sendError(HttpExchange ex, int status, String message) throws IOException {
        sendJson(ex, status, "{\"error\":\"" + JsonUtil.esc(message) + "\"}");
    }

    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            String path = ex.getRequestURI().getPath();
            if ("/".equals(path) || path.isEmpty()) path = "/index.html";
            Path filePath = Paths.get("public", path.startsWith("/") ? path.substring(1) : path).normalize();
            if (!Files.exists(filePath) || Files.isDirectory(filePath)) {
                filePath = Paths.get("public", "index.html");
            }
            String mime = "text/html; charset=UTF-8";
            String lower = filePath.toString().toLowerCase();
            if (lower.endsWith(".css")) mime = "text/css; charset=UTF-8";
            else if (lower.endsWith(".js")) mime = "application/javascript; charset=UTF-8";
            else if (lower.endsWith(".svg")) mime = "image/svg+xml";
            else if (lower.endsWith(".png")) mime = "image/png";
            else if (lower.endsWith(".json")) mime = "application/json";

            byte[] bytes = Files.readAllBytes(filePath);
            ex.getResponseHeaders().add("Content-Type", mime);
            ex.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = ex.getResponseBody()) { os.write(bytes); }
        }
    }
}

