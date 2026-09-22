package br.com.futnerds.futdb.client.dto;

import java.util.List;

public class PlayerApiDto {
    private Long id;
    private Long resourceId;
    private Long resourceBaseId;
    private Long futBinId;
    private Long futWizId;
    private String firstName;
    private String lastName;
    private String name;
    private String commonName;
    private Integer height;
    private Integer weight;
    private String gender;
    private String birthDate;
    private Integer age;
    private Long league;
    private Long nation;
    private Long club;
    private Long rarity;
    private List<String> playStyles;
    private List<String> playStylesPlus;
    private String position;
    private List<String> positionAlternatives;
    private Integer skillMoves;
    private Integer weakFoot;
    private String foot;
    private String attackWorkRate;
    private String defenseWorkRate;
    private Integer totalStats;
    private Integer totalStatsInGame;
    private String color;
    private Integer rating;
    private Integer ratingAverage;
    private Integer pace;
    private Integer shooting;
    private Integer passing;
    private Integer dribbling;
    private Integer defending;
    private Integer physicality;
    private Integer diving;
    private Integer handling;
    private Integer kicking;
    private Integer reflexes;
    private Integer speed;
    private Integer positioning;
    private PaceAttributesDto paceAttributes;
    private ShootingAttributesDto shootingAttributes;
    private PassingAttributesDto passingAttributes;
    private DribblingAttributesDto dribblingAttributes;
    private DefendingAttributesDto defendingAttributes;
    private PhysicalityAttributesDto physicalityAttributes;
    private GoalkeeperAttributesDto goalkeeperAttributes;
    private String version;
    private List<Long> rarity_groups;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getResourceId() {
        return resourceId;
    }

    public void setResourceId(Long resourceId) {
        this.resourceId = resourceId;
    }

    public Long getResourceBaseId() {
        return resourceBaseId;
    }

    public void setResourceBaseId(Long resourceBaseId) {
        this.resourceBaseId = resourceBaseId;
    }

    public Long getFutBinId() {
        return futBinId;
    }

    public void setFutBinId(Long futBinId) {
        this.futBinId = futBinId;
    }

    public Long getFutWizId() {
        return futWizId;
    }

    public void setFutWizId(Long futWizId) {
        this.futWizId = futWizId;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCommonName() {
        return commonName;
    }

    public void setCommonName(String commonName) {
        this.commonName = commonName;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public Integer getWeight() {
        return weight;
    }

    public void setWeight(Integer weight) {
        this.weight = weight;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(String birthDate) {
        this.birthDate = birthDate;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public Long getLeague() {
        return league;
    }

    public void setLeague(Long league) {
        this.league = league;
    }

    public Long getNation() {
        return nation;
    }

    public void setNation(Long nation) {
        this.nation = nation;
    }

    public Long getClub() {
        return club;
    }

    public void setClub(Long club) {
        this.club = club;
    }

    public Long getRarity() {
        return rarity;
    }

    public void setRarity(Long rarity) {
        this.rarity = rarity;
    }

    public List<String> getPlayStyles() {
        return playStyles;
    }

    public void setPlayStyles(List<String> playStyles) {
        this.playStyles = playStyles;
    }

    public List<String> getPlayStylesPlus() {
        return playStylesPlus;
    }

    public void setPlayStylesPlus(List<String> playStylesPlus) {
        this.playStylesPlus = playStylesPlus;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public List<String> getPositionAlternatives() {
        return positionAlternatives;
    }

    public void setPositionAlternatives(List<String> positionAlternatives) {
        this.positionAlternatives = positionAlternatives;
    }

    public Integer getSkillMoves() {
        return skillMoves;
    }

    public void setSkillMoves(Integer skillMoves) {
        this.skillMoves = skillMoves;
    }

    public Integer getWeakFoot() {
        return weakFoot;
    }

    public void setWeakFoot(Integer weakFoot) {
        this.weakFoot = weakFoot;
    }

    public String getFoot() {
        return foot;
    }

    public void setFoot(String foot) {
        this.foot = foot;
    }

    public String getAttackWorkRate() {
        return attackWorkRate;
    }

    public void setAttackWorkRate(String attackWorkRate) {
        this.attackWorkRate = attackWorkRate;
    }

    public String getDefenseWorkRate() {
        return defenseWorkRate;
    }

    public void setDefenseWorkRate(String defenseWorkRate) {
        this.defenseWorkRate = defenseWorkRate;
    }

    public Integer getTotalStats() {
        return totalStats;
    }

    public void setTotalStats(Integer totalStats) {
        this.totalStats = totalStats;
    }

    public Integer getTotalStatsInGame() {
        return totalStatsInGame;
    }

    public void setTotalStatsInGame(Integer totalStatsInGame) {
        this.totalStatsInGame = totalStatsInGame;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public Integer getRatingAverage() {
        return ratingAverage;
    }

    public void setRatingAverage(Integer ratingAverage) {
        this.ratingAverage = ratingAverage;
    }

    public Integer getPace() {
        return pace;
    }

    public void setPace(Integer pace) {
        this.pace = pace;
    }

    public Integer getShooting() {
        return shooting;
    }

    public void setShooting(Integer shooting) {
        this.shooting = shooting;
    }

    public Integer getPassing() {
        return passing;
    }

    public void setPassing(Integer passing) {
        this.passing = passing;
    }

    public Integer getDribbling() {
        return dribbling;
    }

    public void setDribbling(Integer dribbling) {
        this.dribbling = dribbling;
    }

    public Integer getDefending() {
        return defending;
    }

    public void setDefending(Integer defending) {
        this.defending = defending;
    }

    public Integer getPhysicality() {
        return physicality;
    }

    public void setPhysicality(Integer physicality) {
        this.physicality = physicality;
    }

    public Integer getDiving() {
        return diving;
    }

    public void setDiving(Integer diving) {
        this.diving = diving;
    }

    public Integer getHandling() {
        return handling;
    }

    public void setHandling(Integer handling) {
        this.handling = handling;
    }

    public Integer getKicking() {
        return kicking;
    }

    public void setKicking(Integer kicking) {
        this.kicking = kicking;
    }

    public Integer getReflexes() {
        return reflexes;
    }

    public void setReflexes(Integer reflexes) {
        this.reflexes = reflexes;
    }

    public Integer getSpeed() {
        return speed;
    }

    public void setSpeed(Integer speed) {
        this.speed = speed;
    }

    public Integer getPositioning() {
        return positioning;
    }

    public void setPositioning(Integer positioning) {
        this.positioning = positioning;
    }

    public PaceAttributesDto getPaceAttributes() {
        return paceAttributes;
    }

    public void setPaceAttributes(PaceAttributesDto paceAttributes) {
        this.paceAttributes = paceAttributes;
    }

    public ShootingAttributesDto getShootingAttributes() {
        return shootingAttributes;
    }

    public void setShootingAttributes(ShootingAttributesDto shootingAttributes) {
        this.shootingAttributes = shootingAttributes;
    }

    public PassingAttributesDto getPassingAttributes() {
        return passingAttributes;
    }

    public void setPassingAttributes(PassingAttributesDto passingAttributes) {
        this.passingAttributes = passingAttributes;
    }

    public DribblingAttributesDto getDribblingAttributes() {
        return dribblingAttributes;
    }

    public void setDribblingAttributes(DribblingAttributesDto dribblingAttributes) {
        this.dribblingAttributes = dribblingAttributes;
    }

    public DefendingAttributesDto getDefendingAttributes() {
        return defendingAttributes;
    }

    public void setDefendingAttributes(DefendingAttributesDto defendingAttributes) {
        this.defendingAttributes = defendingAttributes;
    }

    public PhysicalityAttributesDto getPhysicalityAttributes() {
        return physicalityAttributes;
    }

    public void setPhysicalityAttributes(PhysicalityAttributesDto physicalityAttributes) {
        this.physicalityAttributes = physicalityAttributes;
    }

    public GoalkeeperAttributesDto getGoalkeeperAttributes() {
        return goalkeeperAttributes;
    }

    public void setGoalkeeperAttributes(GoalkeeperAttributesDto goalkeeperAttributes) {
        this.goalkeeperAttributes = goalkeeperAttributes;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public List<Long> getRarity_groups() {
        return rarity_groups;
    }

    public void setRarity_groups(List<Long> rarity_groups) {
        this.rarity_groups = rarity_groups;
    }
}
