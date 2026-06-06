package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.dto.InvoiceKpi;
import com.amc.backend.model.Invoice;
import com.amc.backend.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Invoice>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "invoiceDate") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        Page<Invoice> result = invoiceService.findAll(page, size, sortBy, direction);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), invoiceService.buildMeta(result)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Invoice>> getById(@PathVariable String id) {
        Invoice invoice = invoiceService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(invoice));
    }

    @GetMapping("/by-number/{invoiceNo}")
    public ResponseEntity<ApiResponse<Invoice>> getByInvoiceNo(@PathVariable String invoiceNo) {
        Invoice invoice = invoiceService.findByInvoiceNo(invoiceNo);
        return ResponseEntity.ok(ApiResponse.ok(invoice));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<Invoice>>> searchByCustomer(
            @RequestParam String customerName) {
        List<Invoice> invoices = invoiceService.findByCustomerName(customerName);
        return ResponseEntity.ok(ApiResponse.ok(invoices));
    }

    @GetMapping("/date-range")
    public ResponseEntity<ApiResponse<List<Invoice>>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        List<Invoice> invoices = invoiceService.findByDateRange(start, end);
        return ResponseEntity.ok(ApiResponse.ok(invoices));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<Map<String, String>>> getNextInvoiceNumber() {
        Map<String, String> result = new HashMap<>();
        result.put("invoiceNo", invoiceService.generateNextInvoiceNo());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Invoice>> create(@Valid @RequestBody Invoice invoice) {
        Invoice created = invoiceService.create(invoice);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Invoice>> update(
            @PathVariable String id,
            @Valid @RequestBody Invoice invoice) {
        Invoice updated = invoiceService.update(id, invoice);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        invoiceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R1.2 — Status Workflow
    // ═══════════════════════════════════════════════════════════════════════════

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Invoice>> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("INVALID_REQUEST", "Status is required"));
        }
        Invoice updated = invoiceService.updateStatus(id, newStatus);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R1.2 — Duplicate Invoice
    // ═══════════════════════════════════════════════════════════════════════════

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<ApiResponse<Invoice>> duplicate(@PathVariable String id) {
        Invoice copy = invoiceService.duplicate(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(copy));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R1.4 — Templates
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<Invoice>>> getTemplates() {
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.getTemplates()));
    }

    @PostMapping("/{id}/save-as-template")
    public ResponseEntity<ApiResponse<Invoice>> saveAsTemplate(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String templateName = body != null ? body.get("templateName") : null;
        Invoice saved = invoiceService.saveAsTemplate(id, templateName);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    @PostMapping("/create-from-template/{templateId}")
    public ResponseEntity<ApiResponse<Invoice>> createFromTemplate(@PathVariable String templateId) {
        Invoice newInvoice = invoiceService.createFromTemplate(templateId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(newInvoice));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R1.5 — Invoice KPIs
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/kpis")
    public ResponseEntity<ApiResponse<InvoiceKpi>> getKpis() {
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.getKpis()));
    }
}
