package com.amc.backend.service;

import com.amc.backend.dto.*;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.Material;
import com.amc.backend.model.PriceListItem;
import com.amc.backend.model.Site;
import com.amc.backend.model.Transaction;
import com.amc.backend.repository.MaterialRepository;
import com.amc.backend.repository.PriceListItemRepository;
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
public class MaterialAnalyticsService {

    private final MaterialRepository materialRepository;
    private final TransactionRepository transactionRepository;
    private final SiteRepository siteRepository;
    private final PriceListItemRepository priceListItemRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    // ═══════════════════════════════════════════════════════════════════════════
    //  R4.1 — Rate Analysis
    // ═══════════════════════════════════════════════════════════════════════════

    public MaterialRateAnalysis getRateAnalysis() {
        List<Material> allMaterials = materialRepository.findAll();

        Map<String, List<Material>> byItem = allMaterials.stream()
                .filter(m -> m.getItemName() != null && !m.getItemName().trim().isEmpty())
                .collect(Collectors.groupingBy(m -> m.getItemName().trim()));

        List<MaterialRateAnalysis.ItemRateInfo> items = new ArrayList<>();

        for (Map.Entry<String, List<Material>> entry : byItem.entrySet()) {
            String itemName = entry.getKey();
            List<Material> purchases = entry.getValue();

            // Filter out records with no rate
            List<Material> withRate = purchases.stream()
                    .filter(m -> m.getRate() != null && m.getRate() > 0)
                    .collect(Collectors.toList());

            if (withRate.isEmpty()) continue;

            // Sort by date for history
            withRate.sort(Comparator.comparing(m -> m.getDate() != null ? m.getDate() : LocalDate.MIN));

            double minRate = withRate.stream().mapToDouble(Material::getRate).min().orElse(0);
            double maxRate = withRate.stream().mapToDouble(Material::getRate).max().orElse(0);
            double avgRate = withRate.stream().mapToDouble(Material::getRate).average().orElse(0);
            double lastRate = withRate.get(withRate.size() - 1).getRate();

            LocalDate lastDate = withRate.get(withRate.size() - 1).getDate();
            String lastPurchaseDate = lastDate != null ? lastDate.format(DATE_FMT) : null;

            // Trend: compare last rate to avg
            String trend = "STABLE";
            if (withRate.size() >= 2) {
                double prevRate = withRate.get(withRate.size() - 2).getRate();
                if (lastRate > prevRate * 1.02) trend = "UP";
                else if (lastRate < prevRate * 0.98) trend = "DOWN";
            }

            double totalQty = parseAndSumQuantity(purchases);
            double totalAmt = purchases.stream()
                    .mapToDouble(m -> m.getAmount() != null ? m.getAmount() : 0).sum();

            // Rate history points
            List<MaterialRateAnalysis.RatePoint> history = withRate.stream()
                    .map(m -> MaterialRateAnalysis.RatePoint.builder()
                            .date(m.getDate() != null ? m.getDate().format(DATE_FMT) : null)
                            .rate(m.getRate())
                            .quantity(parseQuantity(m.getQuantity()))
                            .siteName(m.getSiteName())
                            .build())
                    .collect(Collectors.toList());

            items.add(MaterialRateAnalysis.ItemRateInfo.builder()
                    .itemName(itemName)
                    .minRate(round2(minRate))
                    .maxRate(round2(maxRate))
                    .avgRate(round2(avgRate))
                    .lastRate(round2(lastRate))
                    .lastPurchaseDate(lastPurchaseDate)
                    .trend(trend)
                    .purchaseCount(purchases.size())
                    .totalQuantity(round2(totalQty))
                    .totalAmount(round2(totalAmt))
                    .rateHistory(history)
                    .build());
        }

        // Sort by total amount descending
        items.sort(Comparator.comparingDouble(MaterialRateAnalysis.ItemRateInfo::getTotalAmount).reversed());

        return MaterialRateAnalysis.builder()
                .items(items)
                .totalDistinctItems(items.size())
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R4.2 — Usage Report
    // ═══════════════════════════════════════════════════════════════════════════

    public MaterialUsageReport getUsageReport(String siteId) {
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new ResourceNotFoundException("Site", "id", siteId));

        List<Material> materials = materialRepository.findBySiteNameIgnoreCase(site.getName());

        Map<String, List<Material>> byItem = materials.stream()
                .filter(m -> m.getItemName() != null && !m.getItemName().trim().isEmpty())
                .collect(Collectors.groupingBy(m -> m.getItemName().trim()));

        List<MaterialUsageReport.ItemUsage> items = new ArrayList<>();

        for (Map.Entry<String, List<Material>> entry : byItem.entrySet()) {
            List<Material> purchases = entry.getValue();
            double totalQty = parseAndSumQuantity(purchases);
            double totalAmt = purchases.stream()
                    .mapToDouble(m -> m.getAmount() != null ? m.getAmount() : 0).sum();
            double avgRate = totalQty > 0 ? totalAmt / totalQty : 0;

            LocalDate lastDate = purchases.stream()
                    .map(Material::getDate)
                    .filter(Objects::nonNull)
                    .max(Comparator.naturalOrder())
                    .orElse(null);

            items.add(MaterialUsageReport.ItemUsage.builder()
                    .itemName(entry.getKey())
                    .totalQuantity(round2(totalQty))
                    .totalAmount(round2(totalAmt))
                    .avgRate(round2(avgRate))
                    .purchaseCount(purchases.size())
                    .lastPurchaseDate(lastDate != null ? lastDate.format(DATE_FMT) : null)
                    .build());
        }

        items.sort(Comparator.comparingDouble(MaterialUsageReport.ItemUsage::getTotalAmount).reversed());

        double totalCost = materials.stream()
                .mapToDouble(m -> m.getAmount() != null ? m.getAmount() : 0).sum();

        return MaterialUsageReport.builder()
                .siteId(siteId)
                .siteName(site.getName())
                .totalMaterialCost(round2(totalCost))
                .distinctItemCount(items.size())
                .items(items)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R4.3 — ROI & Breakeven Analysis
    // ═══════════════════════════════════════════════════════════════════════════

    public MaterialRoiAnalysis getRoiAnalysis(String siteId) {
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new ResourceNotFoundException("Site", "id", siteId));

        List<Material> materials = materialRepository.findBySiteNameIgnoreCase(site.getName());
        List<Transaction> transactions = transactionRepository.findBySiteNameIgnoreCase(site.getName());

        double materialCost = materials.stream()
                .mapToDouble(m -> m.getAmount() != null ? m.getAmount() : 0).sum();

        // Labour = debit transactions where nature/description contains labour
        double labourCost = transactions.stream()
                .filter(t -> "Debit".equalsIgnoreCase(t.getType()))
                .filter(t -> isLabour(t))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();

        // Other costs = all debits minus labour
        double totalDebits = transactions.stream()
                .filter(t -> "Debit".equalsIgnoreCase(t.getType()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0).sum();
        double otherCost = totalDebits - labourCost;

        double totalCost = materialCost + labourCost + otherCost;
        double quotation = site.getQuotationAmount() != null ? site.getQuotationAmount() : 0;
        double profit = quotation - totalCost;
        double roi = totalCost > 0 ? (quotation - totalCost) / totalCost * 100 : 0;

        return MaterialRoiAnalysis.builder()
                .siteId(siteId)
                .siteName(site.getName())
                .quotation(round2(quotation))
                .materialCost(round2(materialCost))
                .labourCost(round2(labourCost))
                .otherCost(round2(otherCost))
                .totalCost(round2(totalCost))
                .profit(round2(profit))
                .roi(round2(roi))
                .breakeven(round2(totalCost))
                .isProfitable(profit > 0)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R4.5 — Inventory Summary (all items across all sites)
    // ═══════════════════════════════════════════════════════════════════════════

    public MaterialInventorySummary getInventorySummary() {
        List<Material> allMaterials = materialRepository.findAll();

        Map<String, List<Material>> byItem = allMaterials.stream()
                .filter(m -> m.getItemName() != null && !m.getItemName().trim().isEmpty())
                .collect(Collectors.groupingBy(m -> m.getItemName().trim()));

        List<MaterialInventorySummary.InventoryRow> rows = new ArrayList<>();

        for (Map.Entry<String, List<Material>> entry : byItem.entrySet()) {
            String itemName = entry.getKey();
            List<Material> purchases = entry.getValue();

            double totalQty = parseAndSumQuantity(purchases);
            double totalAmt = purchases.stream()
                    .mapToDouble(m -> m.getAmount() != null ? m.getAmount() : 0).sum();
            double avgRate = totalQty > 0 ? totalAmt / totalQty : 0;

            // Last rate
            double lastRate = purchases.stream()
                    .filter(m -> m.getRate() != null && m.getRate() > 0 && m.getDate() != null)
                    .max(Comparator.comparing(Material::getDate))
                    .map(Material::getRate)
                    .orElse(0.0);

            // How many distinct sites used this item
            long sitesUsed = purchases.stream()
                    .map(Material::getSiteName)
                    .filter(Objects::nonNull)
                    .distinct().count();

            LocalDate lastDate = purchases.stream()
                    .map(Material::getDate)
                    .filter(Objects::nonNull)
                    .max(Comparator.naturalOrder())
                    .orElse(null);

            rows.add(MaterialInventorySummary.InventoryRow.builder()
                    .itemName(itemName)
                    .category(guessCategory(itemName))
                    .totalQuantity(round2(totalQty))
                    .totalAmount(round2(totalAmt))
                    .avgRate(round2(avgRate))
                    .lastRate(round2(lastRate))
                    .sitesUsedCount((int) sitesUsed)
                    .purchaseCount(purchases.size())
                    .lastPurchaseDate(lastDate != null ? lastDate.format(DATE_FMT) : null)
                    .build());
        }

        rows.sort(Comparator.comparingDouble(MaterialInventorySummary.InventoryRow::getTotalAmount).reversed());

        double grandTotal = rows.stream().mapToDouble(MaterialInventorySummary.InventoryRow::getTotalAmount).sum();

        return MaterialInventorySummary.builder()
                .items(rows)
                .totalDistinctItems(rows.size())
                .grandTotalAmount(round2(grandTotal))
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R4.5 — Excel Export
    // ═══════════════════════════════════════════════════════════════════════════

    public byte[] exportInventoryExcel() throws IOException {
        MaterialInventorySummary summary = getInventorySummary();

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Material Inventory");

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Currency style
            CellStyle currencyStyle = workbook.createCellStyle();
            currencyStyle.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00"));

            String[] headers = {"Item Name", "Category", "Total Qty", "Total Amount (₹)",
                    "Avg Rate (₹)", "Last Rate (₹)", "Sites Used", "Purchases", "Last Purchase Date"};

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (MaterialInventorySummary.InventoryRow item : summary.getItems()) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(item.getItemName());
                row.createCell(1).setCellValue(item.getCategory() != null ? item.getCategory() : "");

                Cell qtyCell = row.createCell(2);
                qtyCell.setCellValue(item.getTotalQuantity());

                Cell amtCell = row.createCell(3);
                amtCell.setCellValue(item.getTotalAmount());
                amtCell.setCellStyle(currencyStyle);

                Cell avgCell = row.createCell(4);
                avgCell.setCellValue(item.getAvgRate());
                avgCell.setCellStyle(currencyStyle);

                Cell lastRateCell = row.createCell(5);
                lastRateCell.setCellValue(item.getLastRate());
                lastRateCell.setCellStyle(currencyStyle);

                row.createCell(6).setCellValue(item.getSitesUsedCount());
                row.createCell(7).setCellValue(item.getPurchaseCount());
                row.createCell(8).setCellValue(item.getLastPurchaseDate() != null ? item.getLastPurchaseDate() : "");
            }

            // Total row
            Row totalRow = sheet.createRow(rowIdx);
            Cell totalLabel = totalRow.createCell(0);
            totalLabel.setCellValue("TOTAL");
            totalLabel.setCellStyle(headerStyle);
            Cell totalAmt = totalRow.createCell(3);
            totalAmt.setCellValue(summary.getGrandTotalAmount());
            totalAmt.setCellStyle(currencyStyle);

            // Set column widths (avoid autoSizeColumn for performance)
            int[] widths = {8000, 4000, 3000, 5000, 4000, 4000, 3000, 3000, 5000};
            for (int i = 0; i < widths.length; i++) {
                sheet.setColumnWidth(i, widths[i]);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════════════════════

    private boolean isLabour(Transaction t) {
        String nature = t.getNature() != null ? t.getNature().toLowerCase() : "";
        String desc = t.getDescription() != null ? t.getDescription().toLowerCase() : "";
        return nature.contains("labour") || nature.contains("labor")
                || desc.contains("labour") || desc.contains("labor")
                || nature.contains("coolie") || desc.contains("coolie");
    }

    private String guessCategory(String itemName) {
        if (itemName == null) return "Other";
        String lower = itemName.toLowerCase();
        if (lower.contains("cement") || lower.contains("ultra tech") || lower.contains("acc")) return "Cement";
        if (lower.contains("sand") || lower.contains("m-sand") || lower.contains("msand")) return "M-Sand";
        if (lower.contains("wire") || lower.contains("switch") || lower.contains("elec")
                || lower.contains("cable") || lower.contains("mcb")) return "Electrical";
        if (lower.contains("pipe") || lower.contains("tap") || lower.contains("plumb")
                || lower.contains("valve") || lower.contains("cpvc")) return "Plumbing";
        if (lower.contains("tile") || lower.contains("ceramic") || lower.contains("granite")) return "Tiles";
        if (lower.contains("paint") || lower.contains("primer") || lower.contains("putty")
                || lower.contains("asian") || lower.contains("emulsion")) return "Painting";
        if (lower.contains("brick") || lower.contains("steel") || lower.contains("rod")
                || lower.contains("aggregate") || lower.contains("jelly")) return "Civil";
        return "Other";
    }

    private double parseQuantity(String qty) {
        if (qty == null || qty.trim().isEmpty()) return 0;
        try {
            return Double.parseDouble(qty.replaceAll("[^\\d.]", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private double parseAndSumQuantity(List<Material> materials) {
        return materials.stream()
                .mapToDouble(m -> parseQuantity(m.getQuantity()))
                .sum();
    }

    private double round2(double val) {
        return Math.round(val * 100.0) / 100.0;
    }
}
