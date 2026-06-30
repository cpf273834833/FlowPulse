package com.flowpulse.alert.api.response;

import com.flowpulse.common.StatCard;

import java.util.List;

public class AlertStatePageResponse {
    private PageResponse<AlertStateResponse> alerts;
    private List<StatCard> stats;

    public PageResponse<AlertStateResponse> getAlerts() { return alerts; }
    public void setAlerts(PageResponse<AlertStateResponse> alerts) { this.alerts = alerts; }
    public List<StatCard> getStats() { return stats; }
    public void setStats(List<StatCard> stats) { this.stats = stats; }
}
