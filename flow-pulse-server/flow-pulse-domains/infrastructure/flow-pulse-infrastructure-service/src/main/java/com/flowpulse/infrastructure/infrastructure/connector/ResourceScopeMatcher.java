package com.flowpulse.infrastructure.infrastructure.connector;

import java.util.regex.Pattern;

final class ResourceScopeMatcher {
    private ResourceScopeMatcher() {
    }

    static boolean matches(String scope, String value) {
        String text = value == null ? "" : value;
        String normalizedScope = scope == null ? "" : scope.trim();
        if (normalizedScope.length() == 0 || "*".equals(normalizedScope)) {
            return true;
        }
        String[] expressions = normalizedScope.split("[,;\\r\\n]+");
        for (String expression : expressions) {
            String patternText = expression.trim();
            if (patternText.length() == 0) {
                continue;
            }
            if (text.matches(toRegex(patternText))) {
                return true;
            }
        }
        return false;
    }

    private static String toRegex(String wildcardExpression) {
        StringBuilder regex = new StringBuilder();
        regex.append("^");
        String[] segments = wildcardExpression.split("\\*", -1);
        for (int i = 0; i < segments.length; i++) {
            if (i > 0) {
                regex.append(".*");
            }
            regex.append(Pattern.quote(segments[i]));
        }
        regex.append("$");
        return regex.toString();
    }
}
