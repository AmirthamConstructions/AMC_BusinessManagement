package com.amc.backend.service;

import com.amc.backend.dto.PaginationMeta;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.GstOutward;
import com.amc.backend.repository.GstOutwardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GstOutwardService {

    private final GstOutwardRepository gstOutwardRepository;

    public Page<GstOutward> findAll(int page, int size, String sortBy, String direction) {
        Sort sort = direction.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return gstOutwardRepository.findAll(pageable);
    }

    public GstOutward findById(String id) {
        return gstOutwardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GstOutward", "id", id));
    }

    public Page<GstOutward> findByYear(String year, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("invoiceDate").descending());
        return gstOutwardRepository.findByYear(year, pageable);
    }

    public Page<GstOutward> findByFilingMonth(String filingMonth, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("invoiceDate").descending());
        return gstOutwardRepository.findByFilingMonth(filingMonth, pageable);
    }

    public List<GstOutward> findByYearAndMonth(String year, String invoiceMonth) {
        return gstOutwardRepository.findByYearAndInvoiceMonth(year, invoiceMonth);
    }

    public GstOutward create(GstOutward gstOutward) {
        gstOutward.setCreatedAt(LocalDateTime.now());
        gstOutward.setUpdatedAt(LocalDateTime.now());
        return gstOutwardRepository.save(gstOutward);
    }

    public GstOutward update(String id, GstOutward gstOutward) {
        GstOutward existing = findById(id);
        existing.setYear(gstOutward.getYear());
        existing.setInvoiceMonth(gstOutward.getInvoiceMonth());
        existing.setFilingMonth(gstOutward.getFilingMonth());
        existing.setInvoiceNo(gstOutward.getInvoiceNo());
        existing.setInvoiceDate(gstOutward.getInvoiceDate());
        existing.setCustomerName(gstOutward.getCustomerName());
        existing.setCustomerGSTIN(gstOutward.getCustomerGSTIN());
        existing.setDescription(gstOutward.getDescription());
        existing.setTaxableValue(gstOutward.getTaxableValue());
        existing.setCgstPercent(gstOutward.getCgstPercent());
        existing.setCgstAmount(gstOutward.getCgstAmount());
        existing.setSgstPercent(gstOutward.getSgstPercent());
        existing.setSgstAmount(gstOutward.getSgstAmount());
        existing.setInvoiceValue(gstOutward.getInvoiceValue());
        existing.setPlaceOfSupply(gstOutward.getPlaceOfSupply());
        existing.setInputCreditEligible(gstOutward.getInputCreditEligible());
        existing.setRemarks(gstOutward.getRemarks());
        existing.setUpdatedAt(LocalDateTime.now());
        return gstOutwardRepository.save(existing);
    }

    public void delete(String id) {
        if (!gstOutwardRepository.existsById(id)) {
            throw new ResourceNotFoundException("GstOutward", "id", id);
        }
        gstOutwardRepository.deleteById(id);
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
