package com.amc.backend.service;

import com.amc.backend.model.GstInward;
import com.amc.backend.model.GstOutward;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Utility service for reading/writing GST 2B Excel files.
 * Uses the standard GSTR-2B portal template format.
 */
@Service
public class GstExcelService {

    
    // ── Standard GSTR-2B Inward column headers (as per GST portal download) ──
    private static final String[] INWARD_HEADERS = {
            "S.No",
            "GSTIN of Supplier",
            "Trade/Legal Name",
            "Invoice Number",
            "Invoice Type",
            "Invoice Date",
            "Invoice Value (₹)",
            "Place of Supply",
            "Supply Attract Reverse Charge",
            "Rate (%)",
            "Taxable Value (₹)",
            "Integrated Tax (₹)",
            "Central Tax (₹)",
            "State/UT Tax (₹)",
            "Cess (₹)",
            "ITC Available",
            "Reason",
            "Applicable % of Tax Rate",
            "Remarks"
    };

    // ── Standard GSTR-1 Outward column headers ──
    private static final String[] OUTWARD_HEADERS = {
            "S.No",
            "GSTIN/UIN of Recipient",
            "Receiver Name",
            "Invoice Number",
            "Invoice Date",
            "Invoice Value (₹)",
            "Place of Supply",
            "Reverse Charge",
            "Applicable % of Tax Rate",
            "Invoice Type",
            "E-Commerce GSTIN",
            "Rate (%)",
            "Taxable Value (₹)",
            "Central Tax (₹)",
            "State/UT Tax (₹)",
            "Cess (₹)"
    };

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    // ═══════════════════════════════════════════════════════════════════════════
    //  EXPORT — Generate Excel from List<GstInward>
    // ═══════════════════════════════════════════════════════════════════════════

    public byte[] exportInwardToExcel(List<GstInward> entries) throws IOException {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("GSTR-2B");

        // Header style
        CellStyle headerStyle = createHeaderStyle(workbook);

        // Write headers
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < INWARD_HEADERS.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(INWARD_HEADERS[i]);
            cell.setCellStyle(headerStyle);
        }

        // Write data rows
        CellStyle dateStyle = createDateStyle(workbook);
        CellStyle currencyStyle = createCurrencyStyle(workbook);

        int rowNum = 1;
        for (GstInward entry : entries) {
            Row row = sheet.createRow(rowNum);

            row.createCell(0).setCellValue(rowNum);                                         // S.No
            row.createCell(1).setCellValue(safe(entry.getCompanyGSTIN()));                   // GSTIN of Supplier
            row.createCell(2).setCellValue(safe(entry.getCompanyName()));                    // Trade/Legal Name
            row.createCell(3).setCellValue(safe(entry.getPurchaseBillNo()));                 // Invoice Number
            row.createCell(4).setCellValue("Regular");                                       // Invoice Type
            setCellDate(row.createCell(5), entry.getInvoiceDate(), dateStyle);               // Invoice Date
            setCellCurrency(row.createCell(6), entry.getPurchaseBillValue(), currencyStyle);  // Invoice Value
            row.createCell(7).setCellValue(safe(entry.getPlaceOfPurchase()));                // Place of Supply
            row.createCell(8).setCellValue("N");                                             // Reverse Charge
            setCellDouble(row.createCell(9), computeGstRate(entry.getCgstPercent(), entry.getSgstPercent())); // Rate %
            setCellCurrency(row.createCell(10), entry.getTaxableValue(), currencyStyle);     // Taxable Value
            setCellCurrency(row.createCell(11), 0.0, currencyStyle);                         // IGST (intra-state = 0)
            setCellCurrency(row.createCell(12), entry.getCgstAmount(), currencyStyle);       // CGST
            setCellCurrency(row.createCell(13), entry.getSgstAmount(), currencyStyle);       // SGST
            setCellCurrency(row.createCell(14), 0.0, currencyStyle);                         // Cess
            row.createCell(15).setCellValue(safe(entry.getInputCreditEligible()));           // ITC Available
            row.createCell(16).setCellValue("");                                              // Reason
            row.createCell(17).setCellValue("");                                              // Applicable %
            row.createCell(18).setCellValue(safe(entry.getRemarks()));                       // Remarks

            rowNum++;
        }

        // Auto-size columns
        for (int i = 0; i < INWARD_HEADERS.length; i++) {
            sheet.autoSizeColumn(i);
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();
        return out.toByteArray();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  EXPORT — Generate Excel from List<GstOutward>
    // ═══════════════════════════════════════════════════════════════════════════

    public byte[] exportOutwardToExcel(List<GstOutward> entries) throws IOException {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("GSTR-1");

        CellStyle headerStyle = createHeaderStyle(workbook);

        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < OUTWARD_HEADERS.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(OUTWARD_HEADERS[i]);
            cell.setCellStyle(headerStyle);
        }

        CellStyle dateStyle = createDateStyle(workbook);
        CellStyle currencyStyle = createCurrencyStyle(workbook);

        int rowNum = 1;
        for (GstOutward entry : entries) {
            Row row = sheet.createRow(rowNum);

            row.createCell(0).setCellValue(rowNum);                                           // S.No
            row.createCell(1).setCellValue(safe(entry.getCustomerGSTIN()));                   // GSTIN/UIN
            row.createCell(2).setCellValue(safe(entry.getCustomerName()));                    // Receiver Name
            row.createCell(3).setCellValue(safe(entry.getInvoiceNo()));                       // Invoice Number
            setCellDate(row.createCell(4), entry.getInvoiceDate(), dateStyle);                // Invoice Date
            setCellCurrency(row.createCell(5), entry.getInvoiceValue(), currencyStyle);       // Invoice Value
            row.createCell(6).setCellValue(safe(entry.getPlaceOfSupply()));                   // Place of Supply
            row.createCell(7).setCellValue("N");                                               // Reverse Charge
            row.createCell(8).setCellValue("");                                                // Applicable %
            row.createCell(9).setCellValue("Regular");                                         // Invoice Type
            row.createCell(10).setCellValue("");                                               // E-Commerce GSTIN
            setCellDouble(row.createCell(11), computeGstRate(entry.getCgstPercent(), entry.getSgstPercent())); // Rate %
            setCellCurrency(row.createCell(12), entry.getTaxableValue(), currencyStyle);      // Taxable Value
            setCellCurrency(row.createCell(13), entry.getCgstAmount(), currencyStyle);        // CGST
            setCellCurrency(row.createCell(14), entry.getSgstAmount(), currencyStyle);        // SGST
            setCellCurrency(row.createCell(15), 0.0, currencyStyle);                           // Cess

            rowNum++;
        }

        for (int i = 0; i < OUTWARD_HEADERS.length; i++) {
            sheet.autoSizeColumn(i);
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();
        return out.toByteArray();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  IMPORT — Parse uploaded Excel (GSTR-2B format) to List<GstInward>
    // ═══════════════════════════════════════════════════════════════════════════

    public List<GstInward> parseInwardExcel(InputStream inputStream) throws IOException {
        List<GstInward> entries = new ArrayList<>();
        Workbook workbook = new XSSFWorkbook(inputStream);
        Sheet sheet = workbook.getSheetAt(0);

        // Find header row (skip until we find "GSTIN" in a cell)
        int headerRowIdx = findHeaderRow(sheet, "GSTIN");
        if (headerRowIdx < 0) {
            headerRowIdx = 0; // Assume first row is header
        }

        for (int i = headerRowIdx + 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;

            // Skip empty rows
            String gstin = getCellString(row, 1);
            if (gstin == null || gstin.trim().isEmpty()) continue;

            GstInward entry = new GstInward();
            entry.setCompanyGSTIN(gstin.trim());
            entry.setCompanyName(getCellString(row, 2));
            entry.setPurchaseBillNo(getCellString(row, 3));
            // Column 4 = Invoice Type (skip, we don't store it)
            entry.setInvoiceDate(parseDateFromCell(row, 5));
            entry.setPurchaseBillValue(getCellDouble(row, 6));
            entry.setPlaceOfPurchase(getCellString(row, 7));
            // Column 8 = Reverse Charge (skip)
            Double gstRate = getCellDouble(row, 9);
            entry.setTaxableValue(getCellDouble(row, 10));
            // Column 11 = IGST (skip for intra-state)
            entry.setCgstAmount(getCellDouble(row, 12));
            entry.setSgstAmount(getCellDouble(row, 13));
            // Column 14 = Cess (skip)
            entry.setInputCreditEligible(getCellString(row, 15));
            // Column 16 = Reason (skip)
            // Column 17 = Applicable % (skip)
            entry.setRemarks(getCellString(row, 18));

            // Compute percentages from rate
            if (gstRate != null && gstRate > 0) {
                entry.setCgstPercent(gstRate / 2);
                entry.setSgstPercent(gstRate / 2);
            } else if (entry.getTaxableValue() != null && entry.getTaxableValue() > 0) {
                // Derive from amounts
                if (entry.getCgstAmount() != null) {
                    entry.setCgstPercent(roundTwo(entry.getCgstAmount() / entry.getTaxableValue() * 100));
                }
                if (entry.getSgstAmount() != null) {
                    entry.setSgstPercent(roundTwo(entry.getSgstAmount() / entry.getTaxableValue() * 100));
                }
            }

            // Derive year and month from invoiceDate
            if (entry.getInvoiceDate() != null) {
                entry.setYear(deriveFinancialYear(entry.getInvoiceDate()));
                entry.setInvoiceMonth(entry.getInvoiceDate().getMonth().name().substring(0, 1)
                        + entry.getInvoiceDate().getMonth().name().substring(1, 3).toLowerCase());
            }

            entry.setCreatedAt(LocalDateTime.now());
            entry.setUpdatedAt(LocalDateTime.now());

            entries.add(entry);
        }

        workbook.close();
        return entries;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Helper methods
    // ═══════════════════════════════════════════════════════════════════════════

    private int findHeaderRow(Sheet sheet, String keyword) {
        for (int i = 0; i <= Math.min(10, sheet.getLastRowNum()); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            for (int j = 0; j < row.getLastCellNum(); j++) {
                String val = getCellString(row, j);
                if (val != null && val.toUpperCase().contains(keyword.toUpperCase())) {
                    return i;
                }
            }
        }
        return -1;
    }

    private String getCellString(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    java.util.Date javaDate = cell.getDateCellValue();
                    if (javaDate != null) {
                        LocalDate ld = javaDate.toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                        return ld.format(DATE_FMT);
                    }
                    return "";
                }
                double d = cell.getNumericCellValue();
                if (d == Math.floor(d) && !Double.isInfinite(d)) {
                    return String.valueOf((long) d);
                }
                return String.valueOf(d);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    try {
                        return String.valueOf(cell.getNumericCellValue());
                    } catch (Exception e2) {
                        return null;
                    }
                }
            default:
                return null;
        }
    }

    private Double getCellDouble(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case NUMERIC:
                return cell.getNumericCellValue();
            case STRING:
                try {
                    String val = cell.getStringCellValue().replaceAll("[₹,\\s]", "");
                    return val.isEmpty() ? null : Double.parseDouble(val);
                } catch (NumberFormatException e) {
                    return null;
                }
            case FORMULA:
                try {
                    return cell.getNumericCellValue();
                } catch (Exception e) {
                    return null;
                }
            default:
                return null;
        }
    }

    private LocalDate parseDateFromCell(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    java.util.Date javaDate = cell.getDateCellValue();
                    if (javaDate != null) {
                        return javaDate.toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                    }
                }
                return null;
            case STRING:
                return parseStringDate(cell.getStringCellValue().trim());
            default:
                return null;
        }
    }

    private LocalDate parseStringDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        // Try common formats
        String[] patterns = {"dd-MM-yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "dd-MMM-yyyy", "dd/MMM/yyyy"};
        for (String pattern : patterns) {
            try {
                return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern(pattern));
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private String safe(String val) {
        return val != null ? val : "";
    }

    private Double computeGstRate(Double cgstPercent, Double sgstPercent) {
        double cgst = cgstPercent != null ? cgstPercent : 0.0;
        double sgst = sgstPercent != null ? sgstPercent : 0.0;
        return cgst + sgst;
    }

    private void setCellDate(Cell cell, LocalDate date, CellStyle style) {
        if (date != null) {
            cell.setCellValue(date.format(DATE_FMT));
        } else {
            cell.setCellValue("");
        }
    }

    private void setCellCurrency(Cell cell, Double value, CellStyle style) {
        if (value != null) {
            cell.setCellValue(value);
            cell.setCellStyle(style);
        } else {
            cell.setCellValue(0.0);
            cell.setCellStyle(style);
        }
    }

    private void setCellDouble(Cell cell, Double value) {
        if (value != null) {
            cell.setCellValue(value);
        } else {
            cell.setCellValue(0.0);
        }
    }

    private Double roundTwo(Double val) {
        if (val == null) return null;
        return Math.round(val * 100.0) / 100.0;
    }

    private String deriveFinancialYear(LocalDate date) {
        int year = date.getYear();
        int month = date.getMonthValue();
        if (month >= 4) {
            return (year % 100) + "-" + ((year + 1) % 100);
        } else {
            return ((year - 1) % 100) + "-" + (year % 100);
        }
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createDateStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        CreationHelper helper = workbook.getCreationHelper();
        style.setDataFormat(helper.createDataFormat().getFormat("dd-mm-yyyy"));
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        CreationHelper helper = workbook.getCreationHelper();
        style.setDataFormat(helper.createDataFormat().getFormat("#,##0.00"));
        return style;
    }
}
