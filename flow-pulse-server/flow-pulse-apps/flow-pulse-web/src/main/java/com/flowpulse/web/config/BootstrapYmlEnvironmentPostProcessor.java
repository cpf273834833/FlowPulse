package com.flowpulse.web.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.util.List;

/**
 * Loads bootstrap.yml into Spring Environment before configuration binding.
 *
 * <p>Spring Boot 2.7 does not load bootstrap.yml by default. The company OMP
 * metadata still lives in bootstrap.yml, so this post processor makes
 * biz.app.* available to the platform registration starter early enough.</p>
 */
public class BootstrapYmlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final Logger log = LoggerFactory.getLogger(BootstrapYmlEnvironmentPostProcessor.class);
    private static final String BOOTSTRAP_YML = "bootstrap.yml";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Resource resource = new ClassPathResource(BOOTSTRAP_YML);
        if (!resource.exists()) {
            log.info("{} not found on classpath, skip loading", BOOTSTRAP_YML);
            return;
        }

        YamlPropertySourceLoader loader = new YamlPropertySourceLoader();
        try {
            List<PropertySource<?>> sources = loader.load("flowpulse-bootstrap", resource);
            for (int i = sources.size() - 1; i >= 0; i--) {
                environment.getPropertySources().addFirst(sources.get(i));
            }
            log.info("Loaded {} as PropertySource ({} document(s))", BOOTSTRAP_YML, sources.size());
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load " + BOOTSTRAP_YML, e);
        }
    }
}
