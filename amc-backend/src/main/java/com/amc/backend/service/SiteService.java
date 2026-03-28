package com.amc.backend.service;

import com.amc.backend.exception.DuplicateResourceException;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.Site;
import com.amc.backend.repository.SiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SiteService {

    private final SiteRepository siteRepository;

    public List<Site> findAll() {
        return siteRepository.findAll();
    }

    public Site findById(String id) {
        return siteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Site", "id", id));
    }

    public List<Site> findByCompany(String company) {
        return siteRepository.findByCompany(company);
    }

    public List<Site> findActive() {
        return siteRepository.findByIsActive(true);
    }

    public List<Site> findByCompanyAndActive(String company) {
        return siteRepository.findByCompanyAndIsActive(company, true);
    }

    public Site create(Site site) {
        if (site.getSiteId() == null || site.getSiteId().trim().isEmpty()) {
            site.setSiteId("SITE-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }
        if (siteRepository.existsBySiteId(site.getSiteId())) {
            throw new DuplicateResourceException("Site", "siteId", site.getSiteId());
        }
        site.setCreatedAt(LocalDateTime.now());
        site.setUpdatedAt(LocalDateTime.now());
        return siteRepository.save(site);
    }

    public Site update(String id, Site site) {
        Site existing = findById(id);
        existing.setName(site.getName());
        existing.setClientName(site.getClientName());
        existing.setAddress(site.getAddress());
        existing.setContactNumber(site.getContactNumber());
        existing.setCompany(site.getCompany());
        existing.setQuotationAmount(site.getQuotationAmount());
        existing.setDateOfStart(site.getDateOfStart());
        existing.setDueDate(site.getDueDate());
        existing.setProfit(site.getProfit());
        existing.setProfitDate(site.getProfitDate());
        existing.setExpenseHead(site.getExpenseHead());
        existing.setIncomeHead(site.getIncomeHead());
        existing.setPaymentMode(site.getPaymentMode());
        existing.setCompanyAccount(site.getCompanyAccount());
        existing.setIsActive(site.getIsActive());
        existing.setUpdatedAt(LocalDateTime.now());
        return siteRepository.save(existing);
    }

    public void delete(String id) {
        if (!siteRepository.existsById(id)) {
            throw new ResourceNotFoundException("Site", "id", id);
        }
        siteRepository.deleteById(id);
    }
}
