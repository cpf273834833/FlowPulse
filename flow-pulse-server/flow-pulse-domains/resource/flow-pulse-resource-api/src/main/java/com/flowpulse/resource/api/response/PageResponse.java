package com.flowpulse.resource.api.response;

import java.util.ArrayList;
import java.util.List;

public class PageResponse<T> {
    private List<T> records = new ArrayList<T>();
    private long total;
    private int pageNo;
    private int pageSize;

    public List<T> getRecords() { return records; }
    public void setRecords(List<T> records) { this.records = records; }
    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }
    public int getPageNo() { return pageNo; }
    public void setPageNo(int pageNo) { this.pageNo = pageNo; }
    public int getPageSize() { return pageSize; }
    public void setPageSize(int pageSize) { this.pageSize = pageSize; }
}
