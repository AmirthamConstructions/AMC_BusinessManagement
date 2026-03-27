package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.model.Dimension;
import com.amc.backend.service.DimensionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dimensions")
@RequiredArgsConstructor
public class DimensionController {

    private final DimensionService dimensionService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Dimension>>> getAll() {
        List<Dimension> dimensions = dimensionService.findAll();
        return ResponseEntity.ok(ApiResponse.ok(dimensions));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Dimension>> getById(@PathVariable String id) {
        Dimension dimension = dimensionService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(dimension));
    }

    @GetMapping("/name/{name}")
    public ResponseEntity<ApiResponse<Dimension>> getByName(@PathVariable String name) {
        Dimension dimension = dimensionService.findByName(name);
        return ResponseEntity.ok(ApiResponse.ok(dimension));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Dimension>> create(@Valid @RequestBody Dimension dimension) {
        Dimension created = dimensionService.create(dimension);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Dimension>> update(@PathVariable String id, @Valid @RequestBody Dimension dimension) {
        Dimension updated = dimensionService.update(id, dimension);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @PatchMapping("/{id}/add-value")
    public ResponseEntity<ApiResponse<Dimension>> addValue(@PathVariable String id, @RequestBody Map<String, String> body) {
        String value = body.get("value");
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Value is required");
        }
        Dimension updated = dimensionService.addValue(id, value);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @PatchMapping("/{id}/remove-value")
    public ResponseEntity<ApiResponse<Dimension>> removeValue(@PathVariable String id, @RequestBody Map<String, String> body) {
        String value = body.get("value");
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Value is required");
        }
        Dimension updated = dimensionService.removeValue(id, value);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        dimensionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
