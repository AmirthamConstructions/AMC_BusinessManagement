package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.model.GstInward;
import com.amc.backend.service.GstInwardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gst-inward")
@RequiredArgsConstructor
public class GstInwardController {

    private final GstInwardService gstInwardService;

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
}
