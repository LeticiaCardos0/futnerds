package br.com.futnerds.futdb.dto;

import java.util.List;

public class TheSportsDbEquipmentResponseDto {
    private List<TheSportsDbEquipmentDto> equipment;

    public List<TheSportsDbEquipmentDto> getEquipment() {
        return equipment;
    }

    public void setEquipment(List<TheSportsDbEquipmentDto> equipment) {
        this.equipment = equipment;
    }
}
