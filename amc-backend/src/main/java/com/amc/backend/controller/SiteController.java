package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.model.Site;
import com.amc.backend.service.SiteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sites")
@RequiredArgsConstructor
public class SiteController {

    private final SiteService siteService;

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
}
