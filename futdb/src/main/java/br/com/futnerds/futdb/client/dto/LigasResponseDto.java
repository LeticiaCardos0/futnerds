package br.com.futnerds.futdb.client.dto;

import java.util.List;

public class LigasResponseDto {
    private PaginacaoDto pagination;
    private List<LigaApiDto> items;

    public PaginacaoDto getPagination() {
        return pagination;
    }

    public void setPagination(PaginacaoDto pagination) {
        this.pagination = pagination;
    }

    public List<LigaApiDto> getItems() {
        return items;
    }

    public void setItems(List<LigaApiDto> items) {
        this.items = items;
    }
}
