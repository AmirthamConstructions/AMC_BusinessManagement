package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.model.GstOutward;
import com.amc.backend.service.GstOutwardService;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/gst-outward")
@RequiredArgsConstructor
public class GstOutwardController {

    private final GstOutwardService gstOutwardService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<GstOutward>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "invoiceDate") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        Page<GstOutward> result = gstOutwardService.findAll(page, size, sortBy, direction);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), gstOutwardService.buildMeta(result)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GstOutward>> getById(@PathVariable String id) {
        GstOutward entry = gstOutwardService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(entry));
    }

    @GetMapping("/year/{year}")
    public ResponseEntity<ApiResponse<List<GstOutward>>> getByYear(
            @PathVariable String year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<GstOutward> result = gstOutwardService.findByYear(year, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), gstOutwardService.buildMeta(result)));
    }

    @GetMapping("/filing-month/{filingMonth}")
    public ResponseEntity<ApiResponse<List<GstOutward>>> getByFilingMonth(
            @PathVariable String filingMonth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<GstOutward> result = gstOutwardService.findByFilingMonth(filingMonth, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), gstOutwardService.buildMeta(result)));
    }

    @GetMapping("/year/{year}/month/{month}")
    public ResponseEntity<ApiResponse<List<GstOutward>>> getByYearAndMonth(
            @PathVariable String year,
            @PathVariable String month) {
        List<GstOutward> entries = gstOutwardService.findByYearAndMonth(year, month);
        return ResponseEntity.ok(ApiResponse.ok(entries));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<GstOutward>> create(@Valid @RequestBody GstOutward gstOutward) {
        GstOutward created = gstOutwardService.create(gstOutward);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<GstOutward>> update(@PathVariable String id, @Valid @RequestBody GstOutward gstOutward) {
        GstOutward updated = gstOutwardService.update(id, gstOutward);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        gstOutwardService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── R2.2 — Export GSTR-1 as Excel ────────────────────────────────────────
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String month) throws IOException {
        byte[] excelBytes = gstOutwardService.exportToExcel(year, month);
        String filename = "GSTR-1_Outward";
        if (year != null) filename += "_" + year;
        if (month != null) filename += "_" + month;
        filename += ".xlsx";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(excelBytes.length);

        return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
    }
}
