package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.dto.Gst2bUploadResult;
import com.amc.backend.dto.GstReconciliation;
import com.amc.backend.model.GstInward;
import com.amc.backend.service.GstInwardService;
import com.amc.backend.service.GstReconciliationService;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/gst-inward")
@RequiredArgsConstructor
public class GstInwardController {

    private final GstInwardService gstInwardService;
    private final GstReconciliationService gstReconciliationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<GstInward>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "invoiceDate") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        Page<GstInward> result = gstInwardService.findAll(page, size, sortBy, direction);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), gstInwardService.buildMeta(result)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GstInward>> getById(@PathVariable String id) {
        GstInward entry = gstInwardService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(entry));
    }

    @GetMapping("/gstin/{gstin}")
    public ResponseEntity<ApiResponse<List<GstInward>>> getByGSTIN(
            @PathVariable String gstin,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<GstInward> result = gstInwardService.findByCompanyGSTIN(gstin, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), gstInwardService.buildMeta(result)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<GstInward>> create(@Valid @RequestBody GstInward gstInward) {
        GstInward created = gstInwardService.create(gstInward);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<GstInward>> update(@PathVariable String id, @Valid @RequestBody GstInward gstInward) {
        GstInward updated = gstInwardService.update(id, gstInward);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        gstInwardService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── R2.1 — Upload GST 2B Excel ──────────────────────────────────────────
    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Gst2bUploadResult>> uploadExcel(
            @RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("BAD_REQUEST", "File is empty"));
        }
        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls") && !filename.endsWith(".csv"))) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("BAD_REQUEST", "Only .xlsx, .xls, or .csv files are accepted"));
        }
        Gst2bUploadResult result = gstInwardService.uploadExcel(file);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(result));
    }

    // ── R2.2 — Export GST 2B as Excel ────────────────────────────────────────
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String month) throws IOException {
        byte[] excelBytes = gstInwardService.exportToExcel(year, month);
        String filename = "GSTR-2B_Inward";
        if (year != null) filename += "_" + year;
        if (month != null) filename += "_" + month;
        filename += ".xlsx";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(excelBytes.length);

        return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
    }

    // ── R2.4 — GST Reconciliation ───────────────────────────────────────────
    @GetMapping("/reconciliation")
    public ResponseEntity<ApiResponse<GstReconciliation>> getReconciliation(
            @RequestParam String year,
            @RequestParam String month) {
        GstReconciliation result = gstReconciliationService.reconcile(year, month);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
