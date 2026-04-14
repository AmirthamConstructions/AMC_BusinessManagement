package com.amc.backend.service;

import com.amc.backend.dto.SiteAnalytics;
import com.amc.backend.dto.SitesOverview;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.Material;
import com.amc.backend.model.Site;
import com.amc.backend.model.Transaction;
import com.amc.backend.repository.MaterialRepository;
import com.amc.backend.repository.SiteRepository;
import com.amc.backend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SiteAnalyticsService {

    private final SiteRepository siteRepository;
    private final TransactionRepository transactionRepository;
    private final MaterialRepository materialRepository;

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    // ═══════════════════════════════════════════════════════════════════════════
    //  R5.1 — Single Site Analytics
    // ═══════════════════════════════════════════════════════════════════════════

    public SiteAnalytics getSiteAnalytics(String siteId) {
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new ResourceNotFoundException("Site", "id", siteId));

        // Fetch related data — try siteId first, then siteName
        List<Transaction> transactions = transactionRepository.findBySiteName(site.getName());
        List<Material> materials = materialRepository.findBySiteName(site.getName());

        // If no results by name, also try siteId-based methods
        if (transactions.isEmpty() && site.getSiteId() != null) {
            List<Transaction> byId = transactionRepository.findBySiteNameIgnoreCase(site.getName());
            if (!byId.isEmpty()) {
                transactions = byId;
            }
        }
        if (materials.isEmpty() && site.getName() != null) {
            List<Material> byName = materialRepository.findBySiteNameIgnoreCase(site.getName());
            if (!byName.isEmpty()) {
                materials = byName;
            }
        }

        double totalCredits = transactions.stream()
                .filter(t -> "Credit".equalsIgnoreCase(t.getType()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();

        double totalDebits = transactions.stream()
                .filter(t -> "Debit".equalsIgnoreCase(t.getType()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();

        double materialCost = materials.stream()
                .mapToDouble(m -> m.getAmount() != null ? m.getAmount() : 0).sum();

        // Labour = transactions where nature contains "Labour" or "Labor"
        List<Transaction> labourTxns = transactions.stream()
                .filter(t -> "Debit".equalsIgnoreCase(t.getType()))
                .filter(t -> {
                    String nature = t.getNature() != null ? t.getNature().toLowerCase() : "";
                    String desc = t.getDescription() != null ? t.getDescription().toLowerCase() : "";
                    return nature.contains("labour") || nature.contains("labor")
                            || desc.contains("labour") || desc.contains("labor");
                })
                .collect(Collectors.toList());

        double labourCost = labourTxns.stream()
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();

        double otherCost = totalDebits - labourCost;
        double profit = totalCredits - totalDebits;

        double quotation = site.getQuotationAmount() != null ? site.getQuotationAmount() : 0;
        double roi = totalDebits > 0 ? (quotation - totalDebits) / totalDebits * 100 : 0;

        // Monthly expenses (debit transactions)
        Map<String, Double> monthlyExpMap = new TreeMap<>();
        Map<String, Double> monthlyCreditMap = new TreeMap<>();

        for (Transaction t : transactions) {
            if (t.getDate() == null) continue;
            String monthKey = t.getDate().format(MONTH_FMT);
            if ("Debit".equalsIgnoreCase(t.getType())) {
                monthlyExpMap.merge(monthKey, t.getAmount() != null ? t.getAmount() : 0, Double::sum);
            } else {
                monthlyCreditMap.merge(monthKey, t.getAmount() != null ? t.getAmount() : 0, Double::sum);
            }
        }

        List<SiteAnalytics.MonthlyAmount> monthlyExpenses = monthlyExpMap.entrySet().stream()
                .map(e -> SiteAnalytics.MonthlyAmount.builder().month(e.getKey()).amount(e.getValue()).build())
                .collect(Collectors.toList());

        List<SiteAnalytics.MonthlyAmount> monthlyCredits = monthlyCreditMap.entrySet().stream()
                .map(e -> SiteAnalytics.MonthlyAmount.builder().month(e.getKey()).amount(e.getValue()).build())
                .collect(Collectors.toList());

        // Expense breakdown
        List<SiteAnalytics.CategoryAmount> expenseBreakdown = new ArrayList<>();
        expenseBreakdown.add(SiteAnalytics.CategoryAmount.builder().category("Material").amount(materialCost).build());
        expenseBreakdown.add(SiteAnalytics.CategoryAmount.builder().category("Labour").amount(labourCost).build());
        if (otherCost > 0) {
            expenseBreakdown.add(SiteAnalytics.CategoryAmount.builder().category("Other").amount(otherCost).build());
        }

        // Top materials — group by itemName
        Map<String, List<Material>> matGroups = materials.stream()
                .filter(m -> m.getItemName() != null)
                .collect(Collectors.groupingBy(Material::getItemName));

        List<SiteAnalytics.MaterialSummaryRow> topMaterials = matGroups.entrySet().stream()
                .map(e -> {
                    List<Material> mats = e.getValue();
                    double totalAmt = mats.stream().mapToDouble(m -> m.getAmount() != null ? m.getAmount() : 0).sum();
                    double totalRate = mats.stream().filter(m -> m.getRate() != null).mapToDouble(Material::getRate).sum();
                    long rateCount = mats.stream().filter(m -> m.getRate() != null).count();
                    String totalQty = mats.stream().map(Material::getQuantity).filter(Objects::nonNull)
                            .collect(Collectors.joining(", "));
                    return SiteAnalytics.MaterialSummaryRow.builder()
                            .itemName(e.getKey())
                            .totalQuantity(totalQty)
                            .totalAmount(totalAmt)
                            .avgRate(rateCount > 0 ? Math.round(totalRate / rateCount * 100.0) / 100.0 : 0)
                            .entryCount(mats.size())
                            .build();
                })
                .sorted((a, b) -> Double.compare(b.getTotalAmount(), a.getTotalAmount()))
                .limit(20)
                .collect(Collectors.toList());

        // Labour entries
        List<SiteAnalytics.LabourEntry> labourEntries = labourTxns.stream()
                .sorted(Comparator.comparing(t -> t.getDate() != null ? t.getDate() : LocalDate.MIN, Comparator.reverseOrder()))
                .map(t -> SiteAnalytics.LabourEntry.builder()
                        .date(t.getDate() != null ? t.getDate().toString() : "")
                        .description(t.getDescription())
                        .party(t.getParty())
                        .amount(t.getAmount())
                        .nature(t.getNature())
                        .build())
                .collect(Collectors.toList());

        // All charges — unified view (debit txns + materials)
        List<SiteAnalytics.ChargeRow> allCharges = new ArrayList<>();

        for (Transaction t : transactions) {
            if ("Debit".equalsIgnoreCase(t.getType())) {
                allCharges.add(SiteAnalytics.ChargeRow.builder()
                        .date(t.getDate() != null ? t.getDate().toString() : "")
                        .type("Transaction")
                        .description(t.getDescription() != null ? t.getDescription() : t.getNature())
                        .amount(t.getAmount())
                        .party(t.getParty())
                        .build());
            }
        }
        for (Material m : materials) {
            allCharges.add(SiteAnalytics.ChargeRow.builder()
                    .date(m.getDate() != null ? m.getDate().toString() : "")
                    .type("Material")
                    .description(m.getItemName() + (m.getQuantity() != null ? " × " + m.getQuantity() : ""))
                    .amount(m.getAmount())
                    .party(m.getShopName())
                    .build());
        }
        allCharges.sort((a, b) -> b.getDate().compareTo(a.getDate()));

        return SiteAnalytics.builder()
                .siteId(site.getSiteId())
                .siteName(site.getName())
                .clientName(site.getClientName())
                .company(site.getCompany())
                .address(site.getAddress())
                .quotationAmount(quotation)
                .dateOfStart(site.getDateOfStart() != null ? site.getDateOfStart().toString() : null)
                .dueDate(site.getDueDate() != null ? site.getDueDate().toString() : null)
                .isActive(site.getIsActive())
                .totalCredits(totalCredits)
                .totalDebits(totalDebits)
                .materialCost(materialCost)
                .labourCost(labourCost)
                .otherCost(otherCost)
                .profit(profit)
                .roi(Math.round(roi * 100.0) / 100.0)
                .transactionCount(transactions.size())
                .materialEntryCount(materials.size())
                .labourEntryCount(labourTxns.size())
                .monthlyExpenses(monthlyExpenses)
                .monthlyCredits(monthlyCredits)
                .expenseBreakdown(expenseBreakdown)
                .topMaterials(topMaterials)
                .labourEntries(labourEntries)
                .allCharges(allCharges)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R5.2 — Sites Overview (all sites comparison)
    // ═══════════════════════════════════════════════════════════════════════════

    public SitesOverview getSitesOverview() {
        List<Site> allSites = siteRepository.findAll();
        List<Transaction> allTransactions = transactionRepository.findAll();
        List<Material> allMaterials = materialRepository.findAll();

        // Group transactions and materials by siteName
        Map<String, List<Transaction>> txnBySite = allTransactions.stream()
                .filter(t -> t.getSiteName() != null)
                .collect(Collectors.groupingBy(Transaction::getSiteName));

        Map<String, List<Material>> matBySite = allMaterials.stream()
                .filter(m -> m.getSiteName() != null)
                .collect(Collectors.groupingBy(Material::getSiteName));

        double totalQuotation = 0;
        double totalExpenses = 0;
        double totalMatCost = 0;
        double totalLabCost = 0;

        List<SitesOverview.SiteComparisonRow> comparisons = new ArrayList<>();

        for (Site site : allSites) {
            List<Transaction> txns = txnBySite.getOrDefault(site.getName(), Collections.emptyList());
            List<Material> mats = matBySite.getOrDefault(site.getName(), Collections.emptyList());

            double debits = txns.stream()
                    .filter(t -> "Debit".equalsIgnoreCase(t.getType()))
                    .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();

            double matCost = mats.stream()
                    .mapToDouble(m -> m.getAmount() != null ? m.getAmount() : 0).sum();

            double labCost = txns.stream()
                    .filter(t -> "Debit".equalsIgnoreCase(t.getType()))
                    .filter(t -> {
                        String nature = t.getNature() != null ? t.getNature().toLowerCase() : "";
                        String desc = t.getDescription() != null ? t.getDescription().toLowerCase() : "";
                        return nature.contains("labour") || nature.contains("labor")
                                || desc.contains("labour") || desc.contains("labor");
                    })
                    .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();

            double quotation = site.getQuotationAmount() != null ? site.getQuotationAmount() : 0;
            double profit = quotation - debits;
            double roi = debits > 0 ? profit / debits * 100 : 0;

            totalQuotation += quotation;
            totalExpenses += debits;
            totalMatCost += matCost;
            totalLabCost += labCost;

            comparisons.add(SitesOverview.SiteComparisonRow.builder()
                    .siteId(site.getSiteId())
                    .siteName(site.getName())
                    .company(site.getCompany())
                    .isActive(site.getIsActive())
                    .quotationAmount(quotation)
                    .totalExpense(debits)
                    .materialCost(matCost)
                    .labourCost(labCost)
                    .profit(Math.round(profit * 100.0) / 100.0)
                    .roi(Math.round(roi * 100.0) / 100.0)
                    .build());
        }

        // Sort for top profitable and top expensive
        List<SitesOverview.SiteComparisonRow> topProfitable = comparisons.stream()
                .sorted((a, b) -> Double.compare(b.getProfit(), a.getProfit()))
                .limit(5)
                .collect(Collectors.toList());

        List<SitesOverview.SiteComparisonRow> topExpensive = comparisons.stream()
                .sorted((a, b) -> Double.compare(b.getTotalExpense(), a.getTotalExpense()))
                .limit(5)
                .collect(Collectors.toList());

        long activeSites = allSites.stream().filter(s -> Boolean.TRUE.equals(s.getIsActive())).count();
        long mainSites = allSites.stream().filter(s -> "Main".equalsIgnoreCase(s.getCompany())).count();

        return SitesOverview.builder()
                .totalSites(allSites.size())
                .activeSites((int) activeSites)
                .inactiveSites(allSites.size() - (int) activeSites)
                .mainCompanySites((int) mainSites)
                .gstCompanySites(allSites.size() - (int) mainSites)
                .totalQuotation(totalQuotation)
                .totalExpenses(totalExpenses)
                .totalMaterialCost(totalMatCost)
                .totalLabourCost(totalLabCost)
                .overallProfit(Math.round((totalQuotation - totalExpenses) * 100.0) / 100.0)
                .siteComparisons(comparisons)
                .topProfitable(topProfitable)
                .topExpensive(topExpensive)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R5.4 — Export site detail as multi-sheet Excel
    // ═══════════════════════════════════════════════════════════════════════════

    public byte[] exportSiteDetail(String siteId) throws IOException {
        SiteAnalytics analytics = getSiteAnalytics(siteId);

        Workbook workbook = new XSSFWorkbook();
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle currencyStyle = createCurrencyStyle(workbook);

        // Sheet 1: Site Info
        Sheet infoSheet = workbook.createSheet("Site Info");
        String[][] infoData = {
                {"Site ID", analytics.getSiteId()},
                {"Site Name", analytics.getSiteName()},
                {"Client", analytics.getClientName()},
                {"Company", analytics.getCompany()},
                {"Address", analytics.getAddress()},
                {"Quotation", analytics.getQuotationAmount() != null ? analytics.getQuotationAmount().toString() : ""},
                {"Start Date", analytics.getDateOfStart() != null ? analytics.getDateOfStart() : ""},
                {"Due Date", analytics.getDueDate() != null ? analytics.getDueDate() : ""},
                {"Status", Boolean.TRUE.equals(analytics.getIsActive()) ? "Active" : "Inactive"},
                {"Total Credits", String.valueOf(analytics.getTotalCredits())},
                {"Total Debits", String.valueOf(analytics.getTotalDebits())},
                {"Material Cost", String.valueOf(analytics.getMaterialCost())},
                {"Labour Cost", String.valueOf(analytics.getLabourCost())},
                {"Profit", String.valueOf(analytics.getProfit())},
                {"ROI %", String.valueOf(analytics.getRoi())}
        };
        for (int i = 0; i < infoData.length; i++) {
            Row row = infoSheet.createRow(i);
            Cell keyCell = row.createCell(0);
            keyCell.setCellValue(infoData[i][0]);
            keyCell.setCellStyle(headerStyle);
            row.createCell(1).setCellValue(infoData[i][1]);
        }
        infoSheet.autoSizeColumn(0);
        infoSheet.autoSizeColumn(1);

        // Sheet 2: All Charges
        Sheet chargesSheet = workbook.createSheet("All Charges");
        String[] chargeHeaders = {"Date", "Type", "Description", "Party", "Amount"};
        Row chargeHeaderRow = chargesSheet.createRow(0);
        for (int i = 0; i < chargeHeaders.length; i++) {
            Cell cell = chargeHeaderRow.createCell(i);
            cell.setCellValue(chargeHeaders[i]);
            cell.setCellStyle(headerStyle);
        }
        int rowNum = 1;
        for (SiteAnalytics.ChargeRow charge : analytics.getAllCharges()) {
            Row row = chargesSheet.createRow(rowNum++);
            row.createCell(0).setCellValue(charge.getDate());
            row.createCell(1).setCellValue(charge.getType());
            row.createCell(2).setCellValue(charge.getDescription());
            row.createCell(3).setCellValue(charge.getParty() != null ? charge.getParty() : "");
            Cell amtCell = row.createCell(4);
            if (charge.getAmount() != null) {
                amtCell.setCellValue(charge.getAmount());
                amtCell.setCellStyle(currencyStyle);
            }
        }
        for (int i = 0; i < chargeHeaders.length; i++) chargesSheet.autoSizeColumn(i);

        // Sheet 3: Material Purchases
        Sheet matSheet = workbook.createSheet("Materials");
        String[] matHeaders = {"Item Name", "Total Qty", "Total Amount", "Avg Rate", "Entries"};
        Row matHeaderRow = matSheet.createRow(0);
        for (int i = 0; i < matHeaders.length; i++) {
            Cell cell = matHeaderRow.createCell(i);
            cell.setCellValue(matHeaders[i]);
            cell.setCellStyle(headerStyle);
        }
        int matRow = 1;
        for (SiteAnalytics.MaterialSummaryRow mat : analytics.getTopMaterials()) {
            Row row = matSheet.createRow(matRow++);
            row.createCell(0).setCellValue(mat.getItemName());
            row.createCell(1).setCellValue(mat.getTotalQuantity() != null ? mat.getTotalQuantity() : "");
            Cell amtCell = row.createCell(2);
            amtCell.setCellValue(mat.getTotalAmount());
            amtCell.setCellStyle(currencyStyle);
            Cell rateCell = row.createCell(3);
            rateCell.setCellValue(mat.getAvgRate());
            rateCell.setCellStyle(currencyStyle);
            row.createCell(4).setCellValue(mat.getEntryCount());
        }
        for (int i = 0; i < matHeaders.length; i++) matSheet.autoSizeColumn(i);

        // Sheet 4: Labour
        Sheet labourSheet = workbook.createSheet("Labour");
        String[] labHeaders = {"Date", "Description", "Party", "Amount"};
        Row labHeaderRow = labourSheet.createRow(0);
        for (int i = 0; i < labHeaders.length; i++) {
            Cell cell = labHeaderRow.createCell(i);
            cell.setCellValue(labHeaders[i]);
            cell.setCellStyle(headerStyle);
        }
        int labRow = 1;
        for (SiteAnalytics.LabourEntry lab : analytics.getLabourEntries()) {
            Row row = labourSheet.createRow(labRow++);
            row.createCell(0).setCellValue(lab.getDate());
            row.createCell(1).setCellValue(lab.getDescription() != null ? lab.getDescription() : "");
            row.createCell(2).setCellValue(lab.getParty() != null ? lab.getParty() : "");
            Cell amtCell = row.createCell(3);
            if (lab.getAmount() != null) {
                amtCell.setCellValue(lab.getAmount());
                amtCell.setCellStyle(currencyStyle);
            }
        }
        for (int i = 0; i < labHeaders.length; i++) labourSheet.autoSizeColumn(i);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();
        return out.toByteArray();
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0.00"));
        return style;
    }
}
