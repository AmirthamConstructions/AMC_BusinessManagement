package com.amc.backend.service;

import com.amc.backend.dto.PaginationMeta;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.Transaction;
import com.amc.backend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;

    public Page<Transaction> findAll(int page, int size, String sortBy, String direction) {
        Sort sort = direction.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return transactionRepository.findAll(pageable);
    }

    public Transaction findById(String id) {
        return transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", "id", id));
    }

    public Page<Transaction> findByCompany(String company, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("date").descending());
        return transactionRepository.findByCompany(company, pageable);
    }

    public Page<Transaction> findBySiteId(String siteId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("date").descending());
        return transactionRepository.findBySiteId(siteId, pageable);
    }

    public Page<Transaction> findByCompanyAndType(String company, String type, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("date").descending());
        return transactionRepository.findByCompanyAndType(company, type, pageable);
    }

    public List<Transaction> findByDateRange(LocalDate startDate, LocalDate endDate) {
        return transactionRepository.findByDateBetween(startDate, endDate);
    }

    public Transaction create(Transaction transaction) {
        if (transaction.getTransactionId() == null || transaction.getTransactionId().isBlank()) {
            transaction.setTransactionId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        transaction.setCreatedAt(LocalDateTime.now());
        transaction.setUpdatedAt(LocalDateTime.now());
        return transactionRepository.save(transaction);
    }

    public Transaction update(String id, Transaction transaction) {
        Transaction existing = findById(id);
        existing.setDate(transaction.getDate());
        existing.setCompany(transaction.getCompany());
        existing.setSiteId(transaction.getSiteId());
        existing.setSiteName(transaction.getSiteName());
        existing.setType(transaction.getType());
        existing.setNature(transaction.getNature());
        existing.setDescription(transaction.getDescription());
        existing.setAmount(transaction.getAmount());
        existing.setParty(transaction.getParty());
        existing.setInvoiceNo(transaction.getInvoiceNo());
        existing.setGstNo(transaction.getGstNo());
        existing.setCompanyAccount(transaction.getCompanyAccount());
        existing.setModeOfPayment(transaction.getModeOfPayment());
        existing.setNotes(transaction.getNotes());
        existing.setUpdatedAt(LocalDateTime.now());
        return transactionRepository.save(existing);
    }

    public void delete(String id) {
        if (!transactionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Transaction", "id", id);
        }
        transactionRepository.deleteById(id);
    }

    public PaginationMeta buildMeta(Page<?> page) {
        return PaginationMeta.builder()
                .total(page.getTotalElements())
                .page(page.getNumber())
                .perPage(page.getSize())
                .totalPages(page.getTotalPages())
                .build();
    }
}
