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
    List<Site> findByStatus(String status);
    List<Site> findByStatusIn(List<String> statuses);
    List<Site> findByCompanyAndStatusIn(String company, List<String> statuses);
    boolean existsBySiteId(String siteId);
}
