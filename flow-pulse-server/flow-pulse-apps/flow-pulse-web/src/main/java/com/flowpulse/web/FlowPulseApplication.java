package com.flowpulse.web;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication(scanBasePackages = "com.flowpulse")
@MapperScan({
        "com.flowpulse.management.infrastructure.persistence.mapper",
        "com.flowpulse.infrastructure.infrastructure.persistence.mapper",
        "com.flowpulse.executor.infrastructure.persistence.mapper",
        "com.flowpulse.metric.infrastructure.persistence.mapper",
        "com.flowpulse.alert.infrastructure.persistence.mapper",
        "com.flowpulse.topology.infrastructure.persistence.mapper",
        "com.flowpulse.resource.infrastructure.persistence.mapper"
})
public class FlowPulseApplication {
    public static void main(String[] args) {
        SpringApplication.run(FlowPulseApplication.class, args);
    }
}
