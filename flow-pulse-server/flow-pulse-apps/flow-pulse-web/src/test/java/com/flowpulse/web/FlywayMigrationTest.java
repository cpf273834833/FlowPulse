package com.flowpulse.web;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import static org.assertj.core.api.Assertions.assertThat;

class FlywayMigrationTest {
    @Test void migratesEmptyDatabase() throws Exception {
        String url = "jdbc:h2:mem:flyway-test;MODE=MySQL;DB_CLOSE_DELAY=-1";
        Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration").load().migrate();
        try (Connection connection = DriverManager.getConnection(url, "sa", "");
             ResultSet columns = connection.getMetaData().getColumns(null, null, "FP_RESOURCE_METRIC_CONFIG", "CURRENT_VALUE")) {
            assertThat(columns.next()).isTrue();
        }
    }
}
