package com.amc.backend.service;

import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.PnlEntry;
import com.amc.backend.repository.PnlEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PnlService {

    private final PnlEntryRepository pnlEntryRepository;

    public List<PnlEntry> findAll() {
        return pnlEntryRepository.findAll();
    }

    public PnlEntry findById(String id) {
        return pnlEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PnlEntry", "id", id));
    }

    public List<PnlEntry> findByCompany(String company) {
        return pnlEntryRepository.findByCompany(company);
    }

    public List<PnlEntry> findByFinancialYear(String financialYear) {
        return pnlEntryRepository.findByFinancialYear(financialYear);
    }

    public List<PnlEntry> findByDateRange(LocalDate startDate, LocalDate endDate) {
        return pnlEntryRepository.findByDateBetween(startDate, endDate);
    }

    public PnlEntry create(PnlEntry entry) {
        entry.setCreatedAt(LocalDateTime.now());
        entry.setUpdatedAt(LocalDateTime.now());
        return pnlEntryRepository.save(entry);
    }

    public PnlEntry update(String id, PnlEntry entry) {
        PnlEntry existing = findById(id);
        existing.setDate(entry.getDate());
        existing.setIncome(entry.getIncome());
        existing.setIncomeAmount(entry.getIncomeAmount());
        existing.setExpense(entry.getExpense());
        existing.setExpenseAmount(entry.getExpenseAmount());
        existing.setCompany(entry.getCompany());
        existing.setFinancialYear(entry.getFinancialYear());
        existing.setUpdatedAt(LocalDateTime.now());
        return pnlEntryRepository.save(existing);
    }

    public void delete(String id) {
        if (!pnlEntryRepository.existsById(id)) {
            throw new ResourceNotFoundException("PnlEntry", "id", id);
        }
        pnlEntryRepository.deleteById(id);
    }
}
