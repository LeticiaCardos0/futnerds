package br.com.futnerds.futdb.client.dto;

import java.util.List;

public class ClubesResponseDto {
    private PaginacaoDto pagination;
    private List<ClubeApiDto> items;

    public PaginacaoDto getPagination() {
        return pagination;
    }

    public void setPagination(PaginacaoDto pagination) {
        this.pagination = pagination;
    }

    public List<ClubeApiDto> getItems() {
        return items;
    }

    public void setItems(List<ClubeApiDto> items) {
        this.items = items;
    }
}
