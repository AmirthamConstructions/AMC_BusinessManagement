package com.amc.backend.service;

import com.amc.backend.dto.PaginationMeta;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.GstInward;
import com.amc.backend.repository.GstInwardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class GstInwardService {

    private final GstInwardRepository gstInwardRepository;

    public Page<GstInward> findAll(int page, int size, String sortBy, String direction) {
        Sort sort = direction.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return gstInwardRepository.findAll(pageable);
    }

    public GstInward findById(String id) {
        return gstInwardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GstInward", "id", id));
    }

    public Page<GstInward> findByCompanyGSTIN(String gstin, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("invoiceDate").descending());
        return gstInwardRepository.findByCompanyGSTIN(gstin, pageable);
    }

    public GstInward create(GstInward gstInward) {
        gstInward.setCreatedAt(LocalDateTime.now());
        gstInward.setUpdatedAt(LocalDateTime.now());
        return gstInwardRepository.save(gstInward);
    }

    public GstInward update(String id, GstInward gstInward) {
        GstInward existing = findById(id);
        existing.setPurchaseBillNo(gstInward.getPurchaseBillNo());
        existing.setInvoiceDate(gstInward.getInvoiceDate());
        existing.setCompanyName(gstInward.getCompanyName());
        existing.setCompanyGSTIN(gstInward.getCompanyGSTIN());
        existing.setDescription(gstInward.getDescription());
        existing.setTaxableValue(gstInward.getTaxableValue());
        existing.setCgstAmount(gstInward.getCgstAmount());
        existing.setSgstAmount(gstInward.getSgstAmount());
        existing.setPurchaseBillValue(gstInward.getPurchaseBillValue());
        existing.setInputCreditEligible(gstInward.getInputCreditEligible());
        existing.setRemarks(gstInward.getRemarks());
        existing.setUpdatedAt(LocalDateTime.now());
        return gstInwardRepository.save(existing);
    }

    public void delete(String id) {
        if (!gstInwardRepository.existsById(id)) {
            throw new ResourceNotFoundException("GstInward", "id", id);
        }
        gstInwardRepository.deleteById(id);
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
