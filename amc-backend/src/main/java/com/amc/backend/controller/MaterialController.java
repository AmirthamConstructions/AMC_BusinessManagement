package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.model.Material;
import com.amc.backend.service.MaterialService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/materials")
@RequiredArgsConstructor
public class MaterialController {

    private final MaterialService materialService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Material>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "date") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        Page<Material> result = materialService.findAll(page, size, sortBy, direction);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), materialService.buildMeta(result)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Material>> getById(@PathVariable String id) {
        Material material = materialService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(material));
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<ApiResponse<List<Material>>> getBySiteId(
            @PathVariable String siteId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Material> result = materialService.findBySiteId(siteId, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), materialService.buildMeta(result)));
    }

    @GetMapping("/date-range")
    public ResponseEntity<ApiResponse<List<Material>>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<Material> materials = materialService.findByDateRange(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.ok(materials));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<Material>>> searchByItemName(
            @RequestParam String itemName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Material> result = materialService.searchByItemName(itemName, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), materialService.buildMeta(result)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Material>> create(@Valid @RequestBody Material material) {
        Material created = materialService.create(material);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Material>> update(@PathVariable String id, @Valid @RequestBody Material material) {
        Material updated = materialService.update(id, material);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        materialService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
