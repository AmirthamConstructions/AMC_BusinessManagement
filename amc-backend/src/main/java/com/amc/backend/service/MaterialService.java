package com.amc.backend.service;

import com.amc.backend.dto.PaginationMeta;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.Material;
import com.amc.backend.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MaterialService {

    private final MaterialRepository materialRepository;

    public Page<Material> findAll(int page, int size, String sortBy, String direction) {
        Sort sort = direction.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return materialRepository.findAll(pageable);
    }

    public Material findById(String id) {
        return materialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material", "id", id));
    }

    public Page<Material> findBySiteId(String siteId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("date").descending());
        return materialRepository.findBySiteId(siteId, pageable);
    }

    public List<Material> findByDateRange(LocalDate startDate, LocalDate endDate) {
        return materialRepository.findByDateBetween(startDate, endDate);
    }

    public Page<Material> searchByItemName(String itemName, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("date").descending());
        return materialRepository.findByItemNameContainingIgnoreCase(itemName, pageable);
    }

    public Material create(Material material) {
        material.setCreatedAt(LocalDateTime.now());
        material.setUpdatedAt(LocalDateTime.now());
        return materialRepository.save(material);
    }

    public Material update(String id, Material material) {
        Material existing = findById(id);
        existing.setDate(material.getDate());
        existing.setBillNo(material.getBillNo());
        existing.setItemName(material.getItemName());
        existing.setQuantity(material.getQuantity());
        existing.setRate(material.getRate());
        existing.setAmount(material.getAmount());
        existing.setSiteId(material.getSiteId());
        existing.setSiteName(material.getSiteName());
        existing.setShopName(material.getShopName());
        existing.setNotes(material.getNotes());
        existing.setUpdatedAt(LocalDateTime.now());
        return materialRepository.save(existing);
    }

    public void delete(String id) {
        if (!materialRepository.existsById(id)) {
            throw new ResourceNotFoundException("Material", "id", id);
        }
        materialRepository.deleteById(id);
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
