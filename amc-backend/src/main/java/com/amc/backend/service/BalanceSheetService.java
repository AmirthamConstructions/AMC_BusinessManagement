package com.amc.backend.service;

import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.BalanceRow;
import com.amc.backend.repository.BalanceRowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BalanceSheetService {

    private final BalanceRowRepository balanceRowRepository;

    public List<BalanceRow> findAll() {
        return balanceRowRepository.findAllByOrderBySNoAsc();
    }

    public BalanceRow findById(String id) {
        return balanceRowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BalanceRow", "id", id));
    }

    public List<BalanceRow> findByCompany(String company) {
        return balanceRowRepository.findByCompany(company);
    }

    public List<BalanceRow> findByFinancialYear(String financialYear) {
        return balanceRowRepository.findByFinancialYear(financialYear);
    }

    public List<BalanceRow> findByCompanyAndFinancialYear(String company, String financialYear) {
        return balanceRowRepository.findByCompanyAndFinancialYear(company, financialYear);
    }

    public BalanceRow create(BalanceRow balanceRow) {
        balanceRow.setCreatedAt(LocalDateTime.now());
        balanceRow.setUpdatedAt(LocalDateTime.now());
        return balanceRowRepository.save(balanceRow);
    }

    public BalanceRow update(String id, BalanceRow balanceRow) {
        BalanceRow existing = findById(id);
        existing.setSNo(balanceRow.getSNo());
        existing.setLiability(balanceRow.getLiability());
        existing.setLiabilityAmount(balanceRow.getLiabilityAmount());
        existing.setAsset(balanceRow.getAsset());
        existing.setAssetAmount(balanceRow.getAssetAmount());
        existing.setCompany(balanceRow.getCompany());
        existing.setFinancialYear(balanceRow.getFinancialYear());
        existing.setUpdatedAt(LocalDateTime.now());
        return balanceRowRepository.save(existing);
    }

    public void delete(String id) {
        if (!balanceRowRepository.existsById(id)) {
            throw new ResourceNotFoundException("BalanceRow", "id", id);
        }
        balanceRowRepository.deleteById(id);
    }
}
