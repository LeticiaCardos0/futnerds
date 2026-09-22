package br.com.futnerds.futdb.client.dto;

import java.util.List;

public class PlayersResponseDto {
    private PaginacaoDto pagination;
    private List<PlayerApiDto> items;

    public PaginacaoDto getPagination() {
        return pagination;
    }

    public void setPagination(PaginacaoDto pagination) {
        this.pagination = pagination;
    }

    public List<PlayerApiDto> getItems() {
        return items;
    }

    public void setItems(List<PlayerApiDto> items) {
        this.items = items;
    }
}
