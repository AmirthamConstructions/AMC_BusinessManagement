package com.amc.backend.repository;

import com.amc.backend.model.GstInward;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GstInwardRepository extends MongoRepository<GstInward, String> {
    Optional<GstInward> findByPurchaseBillNo(String purchaseBillNo);
    Page<GstInward> findByCompanyGSTIN(String companyGSTIN, Pageable pageable);
    Page<GstInward> findByCompanyName(String companyName, Pageable pageable);
    Page<GstInward> findByYear(String year, Pageable pageable);
    Page<GstInward> findByInvoiceMonth(String invoiceMonth, Pageable pageable);
    List<GstInward> findByYearAndInvoiceMonth(String year, String invoiceMonth);
}
