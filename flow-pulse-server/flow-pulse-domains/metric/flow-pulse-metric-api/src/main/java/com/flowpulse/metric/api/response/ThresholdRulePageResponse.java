package com.flowpulse.metric.api.response;

import com.flowpulse.common.StatCard;

import java.util.List;

public class ThresholdRulePageResponse {
    private PageResponse<ThresholdRuleResponse> rules;
    private List<StatCard> stats;

    public PageResponse<ThresholdRuleResponse> getRules() {
        return rules;
    }

    public void setRules(PageResponse<ThresholdRuleResponse> rules) {
        this.rules = rules;
    }

    public List<StatCard> getStats() {
        return stats;
    }

    public void setStats(List<StatCard> stats) {
        this.stats = stats;
    }
}
