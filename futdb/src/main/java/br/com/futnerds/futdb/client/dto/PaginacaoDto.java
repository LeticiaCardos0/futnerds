package br.com.futnerds.futdb.client.dto;

public class PaginacaoDto {
    private int countCurrent;
    private int countTotal;
    private int pageCurrent;
    private int pageTotal;
    private int itemsPerPage;

    public int getCountCurrent() {
        return countCurrent;
    }

    public void setCountCurrent(int countCurrent) {
        this.countCurrent = countCurrent;
    }

    public int getCountTotal() {
        return countTotal;
    }

    public void setCountTotal(int countTotal) {
        this.countTotal = countTotal;
    }

    public int getPageCurrent() {
        return pageCurrent;
    }

    public void setPageCurrent(int pageCurrent) {
        this.pageCurrent = pageCurrent;
    }

    public int getPageTotal() {
        return pageTotal;
    }

    public void setPageTotal(int pageTotal) {
        this.pageTotal = pageTotal;
    }

    public int getItemsPerPage() {
        return itemsPerPage;
    }

    public void setItemsPerPage(int itemsPerPage) {
        this.itemsPerPage = itemsPerPage;
    }
}