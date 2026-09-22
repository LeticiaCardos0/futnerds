package br.com.futnerds.futdb.client.dto;

import java.util.List;

public class NacoesResponseDto {
    private PaginacaoDto pagination;
    private List<NacaoApiDto> items;

    public PaginacaoDto getPagination() {
        return pagination;
    }

    public void setPagination(PaginacaoDto pagination) {
        this.pagination = pagination;
    }

    public List<NacaoApiDto> getItems() {
        return items;
    }

    public void setItems(List<NacaoApiDto> items) {
        this.items = items;
    }
}
