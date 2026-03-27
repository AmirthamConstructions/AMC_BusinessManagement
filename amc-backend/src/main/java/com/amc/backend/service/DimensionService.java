package com.amc.backend.service;

import com.amc.backend.exception.DuplicateResourceException;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.Dimension;
import com.amc.backend.repository.DimensionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DimensionService {

    private final DimensionRepository dimensionRepository;

    public List<Dimension> findAll() {
        return dimensionRepository.findAll();
    }

    public Dimension findById(String id) {
        return dimensionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dimension", "id", id));
    }

    public Dimension findByName(String name) {
        return dimensionRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("Dimension", "name", name));
    }

    public Dimension create(Dimension dimension) {
        if (dimensionRepository.existsByName(dimension.getName())) {
            throw new DuplicateResourceException("Dimension", "name", dimension.getName());
        }
        dimension.setCreatedAt(LocalDateTime.now());
        dimension.setUpdatedAt(LocalDateTime.now());
        return dimensionRepository.save(dimension);
    }

    public Dimension update(String id, Dimension dimension) {
        Dimension existing = findById(id);
        existing.setName(dimension.getName());
        existing.setValues(dimension.getValues());
        existing.setUpdatedAt(LocalDateTime.now());
        return dimensionRepository.save(existing);
    }

    public Dimension addValue(String id, String value) {
        Dimension dimension = findById(id);
        if (!dimension.getValues().contains(value)) {
            dimension.getValues().add(value);
            dimension.setUpdatedAt(LocalDateTime.now());
            return dimensionRepository.save(dimension);
        }
        return dimension;
    }

    public Dimension removeValue(String id, String value) {
        Dimension dimension = findById(id);
        dimension.getValues().remove(value);
        dimension.setUpdatedAt(LocalDateTime.now());
        return dimensionRepository.save(dimension);
    }

    public void delete(String id) {
        if (!dimensionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Dimension", "id", id);
        }
        dimensionRepository.deleteById(id);
    }
}
