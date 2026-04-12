package com.amc.backend.service;

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
import java.util.List;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

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

    public String generateNextInvoiceNo() {
        // Generate invoice number in format AMC/YY-YY/NNN
        LocalDate now = LocalDate.now();
        int year = now.getMonthValue() >= 4 ? now.getYear() : now.getYear() - 1;
        String fy = String.format("%02d-%02d", year % 100, (year + 1) % 100);
        String prefix = "AMC/" + fy + "/";

        long count = invoiceRepository.count();
        return prefix + String.format("%03d", count + 1);
    }

    public Invoice create(Invoice invoice) {
        invoice.setCreatedAt(LocalDateTime.now());
        invoice.setUpdatedAt(LocalDateTime.now());
        if (invoice.getStatus() == null) {
            invoice.setStatus("DRAFT");
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
