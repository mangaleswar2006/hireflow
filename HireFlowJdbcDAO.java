import java.sql.*;

public class HireFlowJdbcDAO {
    private final String jdbcUrl;
    private final String username;
    private final String password;

    public HireFlowJdbcDAO(String jdbcUrl, String username, String password) {
        this.jdbcUrl = jdbcUrl;
        this.username = username;
        this.password = password;
    }

    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }

    public void saveUserWithProfile(String id, String name, String email, String pass,
                                   String role, String company, boolean active, String createdAt,
                                   String phone, String education, String experience,
                                   String skillsCsv, String summary, String resume) throws SQLException {
        String userSql = """
            INSERT INTO users (id, name, email, password_hash, role, company_name, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name = VALUES(name), active = VALUES(active)
            """;
        String profileSql = """
            INSERT INTO seeker_profiles (user_id, phone, education, experience, skills_csv, summary, resume_text)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE phone = VALUES(phone), education = VALUES(education),
            experience = VALUES(experience), skills_csv = VALUES(skills_csv),
            summary = VALUES(summary), resume_text = VALUES(resume_text)
            """;

        try (Connection conn = getConnection()) {
            conn.setAutoCommit(false);
            try (PreparedStatement psUser = conn.prepareStatement(userSql)) {
                psUser.setString(1, id);
                psUser.setString(2, name);
                psUser.setString(3, email);
                psUser.setString(4, pass);
                psUser.setString(5, role);
                psUser.setString(6, company);
                psUser.setBoolean(7, active);
                psUser.setDate(8, java.sql.Date.valueOf(createdAt));
                psUser.executeUpdate();

                if ("JOB_SEEKER".equals(role)) {
                    try (PreparedStatement psProf = conn.prepareStatement(profileSql)) {
                        psProf.setString(1, id);
                        psProf.setString(2, phone);
                        psProf.setString(3, education);
                        psProf.setString(4, experience);
                        psProf.setString(5, skillsCsv);
                        psProf.setString(6, summary);
                        psProf.setString(7, resume);
                        psProf.executeUpdate();
                    }
                }
                conn.commit();
            } catch (SQLException ex) {
                conn.rollback();
                throw ex;
            }
        }
    }

    public void updateApplicationStatus(String applicationId, String newStatus) throws SQLException {
        String sql = "UPDATE job_applications SET status = ? WHERE id = ?";
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, newStatus);
            ps.setString(2, applicationId);
            ps.executeUpdate();
        }
    }
}

