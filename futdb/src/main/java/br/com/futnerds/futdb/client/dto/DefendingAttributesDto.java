package br.com.futnerds.futdb.client.dto;

public class DefendingAttributesDto {
    private Integer interceptions;
    private Integer headingAccuracy;
    private Integer standingTackle;
    private Integer slidingTackle;
    private Integer defenseAwareness;

    public Integer getInterceptions() {
        return interceptions;
    }

    public void setInterceptions(Integer interceptions) {
        this.interceptions = interceptions;
    }

    public Integer getHeadingAccuracy() {
        return headingAccuracy;
    }

    public void setHeadingAccuracy(Integer headingAccuracy) {
        this.headingAccuracy = headingAccuracy;
    }

    public Integer getStandingTackle() {
        return standingTackle;
    }

    public void setStandingTackle(Integer standingTackle) {
        this.standingTackle = standingTackle;
    }

    public Integer getSlidingTackle() {
        return slidingTackle;
    }

    public void setSlidingTackle(Integer slidingTackle) {
        this.slidingTackle = slidingTackle;
    }

    public Integer getDefenseAwareness() {
        return defenseAwareness;
    }

    public void setDefenseAwareness(Integer defenseAwareness) {
        this.defenseAwareness = defenseAwareness;
    }
}