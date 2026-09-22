package br.com.futnerds.futdb.client.dto;

public class ShootingAttributesDto {
    private Integer positioning;
    private Integer finishing;
    private Integer shotPower;
    private Integer longShots;
    private Integer volleys;
    private Integer penalties;

    public Integer getPositioning() {
        return positioning;
    }

    public void setPositioning(Integer positioning) {
        this.positioning = positioning;
    }

    public Integer getFinishing() {
        return finishing;
    }

    public void setFinishing(Integer finishing) {
        this.finishing = finishing;
    }

    public Integer getShotPower() {
        return shotPower;
    }

    public void setShotPower(Integer shotPower) {
        this.shotPower = shotPower;
    }

    public Integer getLongShots() {
        return longShots;
    }

    public void setLongShots(Integer longShots) {
        this.longShots = longShots;
    }

    public Integer getVolleys() {
        return volleys;
    }

    public void setVolleys(Integer volleys) {
        this.volleys = volleys;
    }

    public Integer getPenalties() {
        return penalties;
    }

    public void setPenalties(Integer penalties) {
        this.penalties = penalties;
    }
}