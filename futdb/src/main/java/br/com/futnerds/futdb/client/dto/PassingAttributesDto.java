package br.com.futnerds.futdb.client.dto;

public class PassingAttributesDto {
    private Integer vision;
    private Integer crossing;
    private Integer freeKickAccuracy;
    private Integer shortPassing;
    private Integer longPassing;
    private Integer curve;

    public Integer getVision() {
        return vision;
    }

    public void setVision(Integer vision) {
        this.vision = vision;
    }

    public Integer getCrossing() {
        return crossing;
    }

    public void setCrossing(Integer crossing) {
        this.crossing = crossing;
    }

    public Integer getFreeKickAccuracy() {
        return freeKickAccuracy;
    }

    public void setFreeKickAccuracy(Integer freeKickAccuracy) {
        this.freeKickAccuracy = freeKickAccuracy;
    }

    public Integer getShortPassing() {
        return shortPassing;
    }

    public void setShortPassing(Integer shortPassing) {
        this.shortPassing = shortPassing;
    }

    public Integer getLongPassing() {
        return longPassing;
    }

    public void setLongPassing(Integer longPassing) {
        this.longPassing = longPassing;
    }

    public Integer getCurve() {
        return curve;
    }

    public void setCurve(Integer curve) {
        this.curve = curve;
    }
}