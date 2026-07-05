package com.flowpulse.web;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import uyun.whale.consumer.callback.Callback;

@EnableScheduling
@SpringBootApplication(scanBasePackages = {
        "com.flowpulse",
        "uyun.whale.consumer",
        "uyun.whale.common"
})
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

    @Bean
    public Callback callback() {
        return () -> {};
    }
}
