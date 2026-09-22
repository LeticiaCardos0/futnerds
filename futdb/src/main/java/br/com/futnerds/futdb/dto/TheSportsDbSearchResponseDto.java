package br.com.futnerds.futdb.dto;

import java.util.List;

public class TheSportsDbSearchResponseDto {
    private List<TheSportsDbTeamDto> teams;

    public List<TheSportsDbTeamDto> getTeams() {
        return teams;
    }

    public void setTeams(List<TheSportsDbTeamDto> teams) {
        this.teams = teams;
    }
}
