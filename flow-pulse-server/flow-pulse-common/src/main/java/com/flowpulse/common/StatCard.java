package com.flowpulse.common;

public class StatCard {
    private String title;
    private String value;
    private String description;

    public StatCard() {
    }

    public StatCard(String title, String value, String description) {
        this.title = title;
        this.value = value;
        this.description = description;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
