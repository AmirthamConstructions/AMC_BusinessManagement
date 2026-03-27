package com.amc.backend.repository;

import com.amc.backend.model.Site;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SiteRepository extends MongoRepository<Site, String> {
    Optional<Site> findBySiteId(String siteId);
    List<Site> findByCompany(String company);
    List<Site> findByIsActive(Boolean isActive);
    List<Site> findByCompanyAndIsActive(String company, Boolean isActive);
    boolean existsBySiteId(String siteId);
}
