package com.amc.backend.controller;

import com.amc.backend.dto.*;
import com.amc.backend.model.Material;
import com.amc.backend.model.PriceListItem;
import com.amc.backend.service.MaterialAnalyticsService;
import com.amc.backend.service.MaterialService;
import com.amc.backend.service.PriceListService;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/materials")
@RequiredArgsConstructor
public class MaterialController {

    private final MaterialService materialService;
    private final MaterialAnalyticsService materialAnalyticsService;
    private final PriceListService priceListService;

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

    // ═══════════════════════════════════════════════════════════════════════════
    //  R4.1 — Rate Analysis
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/rate-analysis")
    public ResponseEntity<ApiResponse<MaterialRateAnalysis>> getRateAnalysis() {
        return ResponseEntity.ok(ApiResponse.ok(materialAnalyticsService.getRateAnalysis()));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R4.2 — Usage Report (per site)
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/usage")
    public ResponseEntity<ApiResponse<MaterialUsageReport>> getUsageReport(
            @RequestParam String siteId) {
        return ResponseEntity.ok(ApiResponse.ok(materialAnalyticsService.getUsageReport(siteId)));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R4.3 — ROI & Breakeven Analysis (per site)
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/roi")
    public ResponseEntity<ApiResponse<MaterialRoiAnalysis>> getRoiAnalysis(
            @RequestParam String siteId) {
        return ResponseEntity.ok(ApiResponse.ok(materialAnalyticsService.getRoiAnalysis(siteId)));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R4.5 — Inventory Summary
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/inventory-summary")
    public ResponseEntity<ApiResponse<MaterialInventorySummary>> getInventorySummary() {
        return ResponseEntity.ok(ApiResponse.ok(materialAnalyticsService.getInventorySummary()));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R4.5 — Export as Excel
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel() throws IOException {
        byte[] bytes = materialAnalyticsService.exportInventoryExcel();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "Material_Inventory_Report.xlsx");
        headers.setContentLength(bytes.length);
        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  R4.4 — Price List CRUD
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/price-list")
    public ResponseEntity<ApiResponse<List<PriceListItem>>> getPriceList() {
        return ResponseEntity.ok(ApiResponse.ok(priceListService.findAll()));
    }

    @GetMapping("/price-list/{id}")
    public ResponseEntity<ApiResponse<PriceListItem>> getPriceListItem(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(priceListService.findById(id)));
    }

    @GetMapping("/price-list/category/{category}")
    public ResponseEntity<ApiResponse<List<PriceListItem>>> getPriceListByCategory(
            @PathVariable String category) {
        return ResponseEntity.ok(ApiResponse.ok(priceListService.findByCategory(category)));
    }

    @PostMapping("/price-list")
    public ResponseEntity<ApiResponse<PriceListItem>> createPriceListItem(
            @Valid @RequestBody PriceListItem item) {
        PriceListItem created = priceListService.create(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/price-list/{id}")
    public ResponseEntity<ApiResponse<PriceListItem>> updatePriceListItem(
            @PathVariable String id, @Valid @RequestBody PriceListItem item) {
        return ResponseEntity.ok(ApiResponse.ok(priceListService.update(id, item)));
    }

    @DeleteMapping("/price-list/{id}")
    public ResponseEntity<Void> deletePriceListItem(@PathVariable String id) {
        priceListService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
