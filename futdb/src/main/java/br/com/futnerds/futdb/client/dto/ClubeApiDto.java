package br.com.futnerds.futdb.client.dto;

public class ClubeApiDto {
    private Long id;
    private String name;
    private Long league;
    private Long parent_club;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getLeague() {
        return league;
    }

    public void setLeague(Long league) {
        this.league = league;
    }

    public Long getParent_club() {
        return parent_club;
    }

    public void setParent_club(Long parent_club) {
        this.parent_club = parent_club;
    }
}
