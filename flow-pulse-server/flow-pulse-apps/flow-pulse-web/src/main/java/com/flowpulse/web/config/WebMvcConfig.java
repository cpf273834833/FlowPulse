package com.flowpulse.web.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.util.StringUtils;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private static final Logger LOGGER = LoggerFactory.getLogger(WebMvcConfig.class);

    @Value("${install.dir:${user.dir}}")
    private String installDir;

    @Value("${flowpulse.web.static-dir:}")
    private String configuredStaticDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path staticRoot = resolveStaticRoot();
        String staticBase = staticRoot.toUri().toString();
        LOGGER.info("FlowPulse static root: {}", staticBase);

        registry.addResourceHandler("/static/**")
                .addResourceLocations(staticBase + "static/", staticBase);

        registry.addResourceHandler("/index.html")
                .addResourceLocations(staticBase);
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
    }

    private Path resolveStaticRoot() {
        if (StringUtils.hasText(configuredStaticDir)) {
            return Paths.get(configuredStaticDir).toAbsolutePath().normalize();
        }
        Path installPath = Paths.get(installDir).toAbsolutePath().normalize();
        Path deployStatic = installPath.resolve("static");
        if (Files.exists(deployStatic.resolve("index.html"))) {
            return deployStatic;
        }
        if (Files.exists(installPath.resolve("index.html"))) {
            return installPath;
        }

        Path userDir = Paths.get(System.getProperty("user.dir")).toAbsolutePath().normalize();
        Path siblingFrontendBuild = userDir.resolve("../flow-pulse-fronted/build").normalize();
        if (Files.exists(siblingFrontendBuild.resolve("index.html"))) {
            return siblingFrontendBuild;
        }
        Path workspaceFrontendBuild = userDir.resolve("flow-pulse-fronted/build").normalize();
        if (Files.exists(workspaceFrontendBuild.resolve("index.html"))) {
            return workspaceFrontendBuild;
        }

        LOGGER.warn("FlowPulse static index.html not found, fallback to deploy static dir: {}", deployStatic);
        return deployStatic;
    }
}
