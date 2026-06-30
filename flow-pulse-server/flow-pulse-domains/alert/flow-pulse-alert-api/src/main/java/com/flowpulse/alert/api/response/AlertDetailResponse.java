package com.flowpulse.alert.api.response;

import java.util.List;

public class AlertDetailResponse {
    private AlertStateResponse alert;
    private List<AlertEventResponse> events;

    public AlertStateResponse getAlert() { return alert; }
    public void setAlert(AlertStateResponse alert) { this.alert = alert; }
    public List<AlertEventResponse> getEvents() { return events; }
    public void setEvents(List<AlertEventResponse> events) { this.events = events; }
}
