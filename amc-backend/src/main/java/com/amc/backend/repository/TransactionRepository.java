package com.amc.backend.repository;

import com.amc.backend.model.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends MongoRepository<Transaction, String> {
    Optional<Transaction> findByTransactionId(String transactionId);
    Page<Transaction> findByCompany(String company, Pageable pageable);
    Page<Transaction> findBySiteId(String siteId, Pageable pageable);
    Page<Transaction> findByType(String type, Pageable pageable);
    Page<Transaction> findByCompanyAndType(String company, String type, Pageable pageable);
    List<Transaction> findByDateBetween(LocalDate startDate, LocalDate endDate);
    Page<Transaction> findByCompanyAndDateBetween(String company, LocalDate startDate, LocalDate endDate, Pageable pageable);
    List<Transaction> findBySiteIdAndDateBetween(String siteId, LocalDate startDate, LocalDate endDate);
}
