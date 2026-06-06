package com.amc.backend.repository;

import com.amc.backend.model.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends MongoRepository<Invoice, String> {

    Optional<Invoice> findByInvoiceNo(String invoiceNo);

    Page<Invoice> findByStatus(String status, Pageable pageable);

    List<Invoice> findByCustomerNameContainingIgnoreCase(String customerName);

    List<Invoice> findByInvoiceDateBetween(LocalDate start, LocalDate end);

    long countByStatus(String status);

    // R1.1: Find invoices with number starting with FY prefix to compute MAX
    List<Invoice> findByInvoiceNoStartingWith(String prefix);

    // R1.4: Template support
    List<Invoice> findByIsTemplateTrue();

    // R1.5: KPIs — count and sum by status and date range
    List<Invoice> findByInvoiceDateBetweenAndIsTemplateNot(LocalDate start, LocalDate end, Boolean isTemplate);
}
