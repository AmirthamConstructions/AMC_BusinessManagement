package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.dto.SiteAnalytics;
import com.amc.backend.dto.SitesOverview;
import com.amc.backend.model.Site;
import com.amc.backend.service.SiteAnalyticsService;
import com.amc.backend.service.SiteService;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/sites")
@RequiredArgsConstructor
public class SiteController {

    private final SiteService siteService;
    private final SiteAnalyticsService siteAnalyticsService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Site>>> getAll() {
        List<Site> sites = siteService.findAll();
        return ResponseEntity.ok(ApiResponse.ok(sites));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Site>> getById(@PathVariable String id) {
        Site site = siteService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(site));
    }

    @GetMapping("/company/{company}")
    public ResponseEntity<ApiResponse<List<Site>>> getByCompany(@PathVariable String company) {
        List<Site> sites = siteService.findByCompany(company);
        return ResponseEntity.ok(ApiResponse.ok(sites));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<Site>>> getActive() {
        List<Site> sites = siteService.findActive();
        return ResponseEntity.ok(ApiResponse.ok(sites));
    }

    @GetMapping("/company/{company}/active")
    public ResponseEntity<ApiResponse<List<Site>>> getByCompanyAndActive(@PathVariable String company) {
        List<Site> sites = siteService.findByCompanyAndActive(company);
        return ResponseEntity.ok(ApiResponse.ok(sites));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Site>> create(@Valid @RequestBody Site site) {
        Site created = siteService.create(site);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Site>> update(@PathVariable String id, @Valid @RequestBody Site site) {
        Site updated = siteService.update(id, site);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        siteService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── R5.1 — Single site analytics ─────────────────────────────────────────
    @GetMapping("/{id}/analytics")
    public ResponseEntity<ApiResponse<SiteAnalytics>> getSiteAnalytics(@PathVariable String id) {
        SiteAnalytics analytics = siteAnalyticsService.getSiteAnalytics(id);
        return ResponseEntity.ok(ApiResponse.ok(analytics));
    }

    // ── R5.2 — All sites overview (comparisons, top profitable, etc.) ────────
    @GetMapping("/analytics/overview")
    public ResponseEntity<ApiResponse<SitesOverview>> getSitesOverview() {
        SitesOverview overview = siteAnalyticsService.getSitesOverview();
        return ResponseEntity.ok(ApiResponse.ok(overview));
    }

    // ── R5.4 — Export site detail as multi-sheet Excel ───────────────────────
    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportSiteDetail(@PathVariable String id) throws IOException {
        byte[] excelBytes = siteAnalyticsService.exportSiteDetail(id);
        String filename = "Site_Report_" + id + ".xlsx";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(excelBytes.length);

        return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
    }
}
