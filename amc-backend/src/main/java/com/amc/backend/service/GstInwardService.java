package com.amc.backend.service;

import com.amc.backend.dto.Gst2bUploadResult;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GstInwardService {

    private final GstInwardRepository gstInwardRepository;
    private final GstExcelService gstExcelService;

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

    public Page<GstInward> findByYear(String year, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("invoiceDate").descending());
        return gstInwardRepository.findByYear(year, pageable);
    }

    public Page<GstInward> findByInvoiceMonth(String invoiceMonth, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("invoiceDate").descending());
        return gstInwardRepository.findByInvoiceMonth(invoiceMonth, pageable);
    }

    public List<GstInward> findByYearAndMonth(String year, String invoiceMonth) {
        return gstInwardRepository.findByYearAndInvoiceMonth(year, invoiceMonth);
    }

    public GstInward create(GstInward gstInward) {
        gstInward.setCreatedAt(LocalDateTime.now());
        gstInward.setUpdatedAt(LocalDateTime.now());
        return gstInwardRepository.save(gstInward);
    }

    public GstInward update(String id, GstInward gstInward) {
        GstInward existing = findById(id);
        existing.setYear(gstInward.getYear());
        existing.setInvoiceMonth(gstInward.getInvoiceMonth());
        existing.setPurchaseBillNo(gstInward.getPurchaseBillNo());
        existing.setInvoiceDate(gstInward.getInvoiceDate());
        existing.setCompanyName(gstInward.getCompanyName());
        existing.setCompanyGSTIN(gstInward.getCompanyGSTIN());
        existing.setDescription(gstInward.getDescription());
        existing.setTaxableValue(gstInward.getTaxableValue());
        existing.setCgstPercent(gstInward.getCgstPercent());
        existing.setCgstAmount(gstInward.getCgstAmount());
        existing.setSgstPercent(gstInward.getSgstPercent());
        existing.setSgstAmount(gstInward.getSgstAmount());
        existing.setPurchaseBillValue(gstInward.getPurchaseBillValue());
        existing.setPlaceOfPurchase(gstInward.getPlaceOfPurchase());
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

    // ── Upload Excel file and import rows ────────────────────────────────────
    public Gst2bUploadResult uploadExcel(MultipartFile file) throws IOException {
        List<GstInward> parsed = gstExcelService.parseInwardExcel(file.getInputStream());

        int imported = 0;
        int skipped = 0;
        List<String> skippedReasons = new ArrayList<>();
        List<String> errorMessages = new ArrayList<>();

        for (int i = 0; i < parsed.size(); i++) {
            GstInward entry = parsed.get(i);
            try {
                // Check for duplicate
                if (entry.getPurchaseBillNo() != null && entry.getInvoiceDate() != null
                        && gstInwardRepository.existsByPurchaseBillNoAndInvoiceDate(
                        entry.getPurchaseBillNo(), entry.getInvoiceDate())) {
                    skipped++;
                    skippedReasons.add("Row " + (i + 1) + ": Duplicate bill " + entry.getPurchaseBillNo()
                            + " dated " + entry.getInvoiceDate());
                    continue;
                }
                gstInwardRepository.save(entry);
                imported++;
            } catch (Exception e) {
                errorMessages.add("Row " + (i + 1) + ": " + e.getMessage());
            }
        }

        return Gst2bUploadResult.builder()
                .totalRows(parsed.size())
                .importedCount(imported)
                .skippedCount(skipped)
                .errorCount(errorMessages.size())
                .skippedReasons(skippedReasons)
                .errorMessages(errorMessages)
                .build();
    }

    // ── Export to Excel ──────────────────────────────────────────────────────
    public byte[] exportToExcel(String year, String month) throws IOException {
        List<GstInward> entries;
        if (year != null && month != null) {
            entries = gstInwardRepository.findByYearAndInvoiceMonth(year, month);
        } else if (year != null) {
            entries = gstInwardRepository.findByYear(year, PageRequest.of(0, 10000, Sort.by("invoiceDate").ascending())).getContent();
        } else {
            entries = gstInwardRepository.findAll(Sort.by("invoiceDate").ascending());
        }
        return gstExcelService.exportInwardToExcel(entries);
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
