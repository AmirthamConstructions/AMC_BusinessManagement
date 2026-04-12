package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
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
}
