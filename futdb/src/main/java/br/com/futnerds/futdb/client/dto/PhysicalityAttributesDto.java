package br.com.futnerds.futdb.client.dto;

public class PhysicalityAttributesDto {
    private Integer jumping;
    private Integer stamina;
    private Integer strength;
    private Integer aggression;

    public Integer getJumping() {
        return jumping;
    }

    public void setJumping(Integer jumping) {
        this.jumping = jumping;
    }

    public Integer getStamina() {
        return stamina;
    }

    public void setStamina(Integer stamina) {
        this.stamina = stamina;
    }

    public Integer getStrength() {
        return strength;
    }

    public void setStrength(Integer strength) {
        this.strength = strength;
    }

    public Integer getAggression() {
        return aggression;
    }

    public void setAggression(Integer aggression) {
        this.aggression = aggression;
    }
}