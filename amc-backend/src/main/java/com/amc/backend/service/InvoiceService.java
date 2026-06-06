package com.amc.backend.service;

import com.amc.backend.dto.InvoiceKpi;
import com.amc.backend.dto.PaginationMeta;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.Invoice;
import com.amc.backend.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    // Valid status transitions
    private static final List<String> STATUS_ORDER = Arrays.asList("DRAFT", "SENT", "PAID", "CANCELLED");

    public Page<Invoice> findAll(int page, int size, String sortBy, String direction) {
        Sort sort = direction.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return invoiceRepository.findAll(pageable);
    }

    public Invoice findById(String id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", id));
    }

    public Invoice findByInvoiceNo(String invoiceNo) {
        return invoiceRepository.findByInvoiceNo(invoiceNo)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "invoiceNo", invoiceNo));
    }

    public List<Invoice> findByCustomerName(String customerName) {
        return invoiceRepository.findByCustomerNameContainingIgnoreCase(customerName);
    }

    public List<Invoice> findByDateRange(LocalDate start, LocalDate end) {
        return invoiceRepository.findByInvoiceDateBetween(start, end);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R1.1 — Fixed Invoice Numbering (per FY, MAX+1)
    // ═══════════════════════════════════════════════════════════════════════════

    public String generateNextInvoiceNo() {
        LocalDate now = LocalDate.now();
        int startYear = now.getMonthValue() >= 4 ? now.getYear() : now.getYear() - 1;
        String fy = String.format("%02d-%02d", startYear % 100, (startYear + 1) % 100);
        String prefix = "AMC/" + fy + "/";

        // Find all invoices with this FY prefix and extract the MAX number
        List<Invoice> fyInvoices = invoiceRepository.findByInvoiceNoStartingWith(prefix);

        int maxNum = 0;
        for (Invoice inv : fyInvoices) {
            try {
                String numPart = inv.getInvoiceNo().substring(prefix.length());
                int num = Integer.parseInt(numPart);
                if (num > maxNum) {
                    maxNum = num;
                }
            } catch (NumberFormatException | StringIndexOutOfBoundsException e) {
                // skip malformed invoice numbers
            }
        }

        return prefix + String.format("%03d", maxNum + 1);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R1.2 — Status Workflow
    // ═══════════════════════════════════════════════════════════════════════════

    public Invoice updateStatus(String id, String newStatus) {
        Invoice invoice = findById(id);
        String currentStatus = invoice.getStatus();

        // Validate transition
        if (!isValidTransition(currentStatus, newStatus)) {
            throw new IllegalArgumentException(
                    String.format("Invalid status transition: %s → %s", currentStatus, newStatus));
        }

        invoice.setStatus(newStatus);
        invoice.setUpdatedAt(LocalDateTime.now());
        return invoiceRepository.save(invoice);
    }

    private boolean isValidTransition(String from, String to) {
        if (from == null) from = "DRAFT";
        // DRAFT → SENT, DRAFT → CANCELLED
        // SENT → PAID, SENT → CANCELLED
        // PAID and CANCELLED are terminal (no further transitions)
        switch (from) {
            case "DRAFT":
                return "SENT".equals(to) || "CANCELLED".equals(to);
            case "SENT":
                return "PAID".equals(to) || "CANCELLED".equals(to);
            default:
                return false; // PAID and CANCELLED are terminal
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R1.2 — Duplicate Invoice
    // ═══════════════════════════════════════════════════════════════════════════

    public Invoice duplicate(String id) {
        Invoice original = findById(id);
        String newInvoiceNo = generateNextInvoiceNo();

        Invoice copy = Invoice.builder()
                .invoiceNo(newInvoiceNo)
                .invoiceDate(LocalDate.now())
                .customerName(original.getCustomerName())
                .customerAddress(original.getCustomerAddress())
                .customerState(original.getCustomerState())
                .customerPincode(original.getCustomerPincode())
                .customerGSTIN(original.getCustomerGSTIN())
                .nameOfWork(original.getNameOfWork())
                .lineItems(original.getLineItems())
                .subTotal(original.getSubTotal())
                .cgstPercent(original.getCgstPercent())
                .cgstAmount(original.getCgstAmount())
                .sgstPercent(original.getSgstPercent())
                .sgstAmount(original.getSgstAmount())
                .igstPercent(original.getIgstPercent())
                .igstAmount(original.getIgstAmount())
                .roundOff(original.getRoundOff())
                .grandTotal(original.getGrandTotal())
                .amountInWords(original.getAmountInWords())
                .status("DRAFT")
                .notes(original.getNotes())
                .isTemplate(false)
                .templateName(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return invoiceRepository.save(copy);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R1.4 — Templates
    // ═══════════════════════════════════════════════════════════════════════════

    public List<Invoice> getTemplates() {
        return invoiceRepository.findByIsTemplateTrue();
    }

    public Invoice saveAsTemplate(String id, String templateName) {
        Invoice invoice = findById(id);
        invoice.setIsTemplate(true);
        invoice.setTemplateName(templateName != null ? templateName : invoice.getCustomerName());
        invoice.setUpdatedAt(LocalDateTime.now());
        return invoiceRepository.save(invoice);
    }

    public Invoice createFromTemplate(String templateId) {
        Invoice template = findById(templateId);
        String newInvoiceNo = generateNextInvoiceNo();

        Invoice newInvoice = Invoice.builder()
                .invoiceNo(newInvoiceNo)
                .invoiceDate(LocalDate.now())
                .customerName(template.getCustomerName())
                .customerAddress(template.getCustomerAddress())
                .customerState(template.getCustomerState())
                .customerPincode(template.getCustomerPincode())
                .customerGSTIN(template.getCustomerGSTIN())
                .nameOfWork(template.getNameOfWork())
                .lineItems(template.getLineItems())
                .subTotal(template.getSubTotal())
                .cgstPercent(template.getCgstPercent())
                .cgstAmount(template.getCgstAmount())
                .sgstPercent(template.getSgstPercent())
                .sgstAmount(template.getSgstAmount())
                .igstPercent(template.getIgstPercent())
                .igstAmount(template.getIgstAmount())
                .roundOff(template.getRoundOff())
                .grandTotal(template.getGrandTotal())
                .amountInWords(template.getAmountInWords())
                .status("DRAFT")
                .notes(template.getNotes())
                .isTemplate(false)
                .templateName(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return invoiceRepository.save(newInvoice);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R1.5 — Invoice KPIs
    // ═══════════════════════════════════════════════════════════════════════════

    public InvoiceKpi getKpis() {
        LocalDate now = LocalDate.now();

        // Current month boundaries
        LocalDate monthStart = now.withDayOfMonth(1);
        LocalDate monthEnd = now.plusMonths(1).withDayOfMonth(1).minusDays(1);

        // Current FY boundaries (Apr to Mar)
        int fyStartYear = now.getMonthValue() >= 4 ? now.getYear() : now.getYear() - 1;
        LocalDate fyStart = LocalDate.of(fyStartYear, 4, 1);
        LocalDate fyEnd = LocalDate.of(fyStartYear + 1, 3, 31);

        // Non-template invoices this month
        List<Invoice> monthInvoices = invoiceRepository
                .findByInvoiceDateBetweenAndIsTemplateNot(monthStart, monthEnd, true);

        // Non-template invoices this FY
        List<Invoice> fyInvoices = invoiceRepository
                .findByInvoiceDateBetweenAndIsTemplateNot(fyStart, fyEnd, true);

        // All non-template invoices
        List<Invoice> allInvoices = invoiceRepository.findAll().stream()
                .filter(inv -> !Boolean.TRUE.equals(inv.getIsTemplate()))
                .collect(Collectors.toList());

        double billedThisMonth = monthInvoices.stream()
                .filter(i -> !"CANCELLED".equals(i.getStatus()))
                .mapToDouble(i -> i.getGrandTotal() != null ? i.getGrandTotal() : 0)
                .sum();

        double billedThisFY = fyInvoices.stream()
                .filter(i -> !"CANCELLED".equals(i.getStatus()))
                .mapToDouble(i -> i.getGrandTotal() != null ? i.getGrandTotal() : 0)
                .sum();

        int totalDraft = 0, totalSent = 0, totalPaid = 0, totalCancelled = 0;
        double totalBilled = 0, totalCollected = 0, totalOutstanding = 0;

        for (Invoice inv : allInvoices) {
            String status = inv.getStatus() != null ? inv.getStatus() : "DRAFT";
            double amount = inv.getGrandTotal() != null ? inv.getGrandTotal() : 0;

            switch (status) {
                case "DRAFT":
                    totalDraft++;
                    totalOutstanding += amount;
                    totalBilled += amount;
                    break;
                case "SENT":
                    totalSent++;
                    totalOutstanding += amount;
                    totalBilled += amount;
                    break;
                case "PAID":
                    totalPaid++;
                    totalCollected += amount;
                    totalBilled += amount;
                    break;
                case "CANCELLED":
                    totalCancelled++;
                    break;
            }
        }

        return InvoiceKpi.builder()
                .invoicesThisMonth(monthInvoices.size())
                .billedThisMonth(Math.round(billedThisMonth * 100.0) / 100.0)
                .invoicesThisFY(fyInvoices.size())
                .billedThisFY(Math.round(billedThisFY * 100.0) / 100.0)
                .totalDraft(totalDraft)
                .totalSent(totalSent)
                .totalPaid(totalPaid)
                .totalCancelled(totalCancelled)
                .totalBilled(Math.round(totalBilled * 100.0) / 100.0)
                .totalCollected(Math.round(totalCollected * 100.0) / 100.0)
                .totalOutstanding(Math.round(totalOutstanding * 100.0) / 100.0)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Standard CRUD
    // ═══════════════════════════════════════════════════════════════════════════

    public Invoice create(Invoice invoice) {
        invoice.setCreatedAt(LocalDateTime.now());
        invoice.setUpdatedAt(LocalDateTime.now());
        if (invoice.getStatus() == null) {
            invoice.setStatus("DRAFT");
        }
        if (invoice.getIsTemplate() == null) {
            invoice.setIsTemplate(false);
        }
        return invoiceRepository.save(invoice);
    }

    public Invoice update(String id, Invoice invoice) {
        Invoice existing = findById(id);
        existing.setInvoiceNo(invoice.getInvoiceNo());
        existing.setInvoiceDate(invoice.getInvoiceDate());
        existing.setCustomerName(invoice.getCustomerName());
        existing.setCustomerAddress(invoice.getCustomerAddress());
        existing.setCustomerState(invoice.getCustomerState());
        existing.setCustomerPincode(invoice.getCustomerPincode());
        existing.setCustomerGSTIN(invoice.getCustomerGSTIN());
        existing.setNameOfWork(invoice.getNameOfWork());
        existing.setLineItems(invoice.getLineItems());
        existing.setSubTotal(invoice.getSubTotal());
        existing.setCgstPercent(invoice.getCgstPercent());
        existing.setCgstAmount(invoice.getCgstAmount());
        existing.setSgstPercent(invoice.getSgstPercent());
        existing.setSgstAmount(invoice.getSgstAmount());
        existing.setIgstPercent(invoice.getIgstPercent());
        existing.setIgstAmount(invoice.getIgstAmount());
        existing.setRoundOff(invoice.getRoundOff());
        existing.setGrandTotal(invoice.getGrandTotal());
        existing.setAmountInWords(invoice.getAmountInWords());
        existing.setStatus(invoice.getStatus());
        existing.setNotes(invoice.getNotes());
        existing.setUpdatedAt(LocalDateTime.now());
        return invoiceRepository.save(existing);
    }

    public void delete(String id) {
        if (!invoiceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Invoice", "id", id);
        }
        invoiceRepository.deleteById(id);
    }

    public PaginationMeta buildMeta(Page<Invoice> page) {
        return PaginationMeta.builder()
                .total(page.getTotalElements())
                .page(page.getNumber())
                .perPage(page.getSize())
                .totalPages(page.getTotalPages())
                .build();
    }
}
