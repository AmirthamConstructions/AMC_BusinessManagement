package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.model.Transaction;
import com.amc.backend.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Transaction>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "date") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        Page<Transaction> result = transactionService.findAll(page, size, sortBy, direction);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), transactionService.buildMeta(result)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Transaction>> getById(@PathVariable String id) {
        Transaction transaction = transactionService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(transaction));
    }

    @GetMapping("/company/{company}")
    public ResponseEntity<ApiResponse<List<Transaction>>> getByCompany(
            @PathVariable String company,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Transaction> result = transactionService.findByCompany(company, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), transactionService.buildMeta(result)));
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<Transaction>>> getBySiteId(
            @PathVariable String siteId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Transaction> result = transactionService.findBySiteId(siteId, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), transactionService.buildMeta(result)));
    }

    @GetMapping("/company/{company}/type/{type}")
    public ResponseEntity<ApiResponse<List<Transaction>>> getByCompanyAndType(
            @PathVariable String company,
            @PathVariable String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Transaction> result = transactionService.findByCompanyAndType(company, type, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), transactionService.buildMeta(result)));
    }

    @GetMapping("/date-range")
    public ResponseEntity<ApiResponse<List<Transaction>>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<Transaction> transactions = transactionService.findByDateRange(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.ok(transactions));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Transaction>> create(@Valid @RequestBody Transaction transaction) {
        Transaction created = transactionService.create(transaction);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Transaction>> update(@PathVariable String id, @Valid @RequestBody Transaction transaction) {
        Transaction updated = transactionService.update(id, transaction);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        transactionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
