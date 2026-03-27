package com.amc.backend.repository;

import com.amc.backend.model.GstOutward;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GstOutwardRepository extends MongoRepository<GstOutward, String> {
    Optional<GstOutward> findByInvoiceNo(String invoiceNo);
    Page<GstOutward> findByYear(String year, Pageable pageable);
    Page<GstOutward> findByInvoiceMonth(String invoiceMonth, Pageable pageable);
    Page<GstOutward> findByFilingMonth(String filingMonth, Pageable pageable);
    List<GstOutward> findByYearAndInvoiceMonth(String year, String invoiceMonth);
    Page<GstOutward> findByCustomerGSTIN(String customerGSTIN, Pageable pageable);
}
