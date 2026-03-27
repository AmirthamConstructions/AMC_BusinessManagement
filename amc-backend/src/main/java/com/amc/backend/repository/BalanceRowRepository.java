package com.amc.backend.repository;

import com.amc.backend.model.BalanceRow;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BalanceRowRepository extends MongoRepository<BalanceRow, String> {
    List<BalanceRow> findByCompany(String company);
    List<BalanceRow> findByFinancialYear(String financialYear);
    List<BalanceRow> findByCompanyAndFinancialYear(String company, String financialYear);
    List<BalanceRow> findAllByOrderBySNoAsc();
}
