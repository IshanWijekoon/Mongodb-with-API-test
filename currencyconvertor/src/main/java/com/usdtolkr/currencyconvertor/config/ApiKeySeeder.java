package com.usdtolkr.currencyconvertor.config;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import com.usdtolkr.currencyconvertor.model.ApiKey;
import com.usdtolkr.currencyconvertor.repository.ApiKeyRepository;

@Component
public class ApiKeySeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ApiKeySeeder.class);

    private final ApiKeyRepository apiKeyRepository;
    private final MongoTemplate mongoTemplate;

    public ApiKeySeeder(ApiKeyRepository apiKeyRepository, MongoTemplate mongoTemplate) {
        this.apiKeyRepository = apiKeyRepository;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<ApiKey> keys = List.of(
                new ApiKey(null, "SUPER-SECRET-DEV-KEY-123", "Frontend-Web-App", true),
                new ApiKey(null, "EXPIRED-HACKER-KEY-999", "Suspicious-Client", false));

        boolean changed = false;
        for (ApiKey key : keys) {
            changed |= upsertKey(key);
        }

        if (changed) {
            log.info("Seeded api_keys collection.");
        } else {
            log.info("API keys already present in api_keys collection.");
        }
    }

    private boolean upsertKey(ApiKey seed) {
        Query query = new Query(Criteria.where("keyValue").is(seed.getKeyValue()));
        ApiKey existing = mongoTemplate.findOne(query, ApiKey.class);

        if (existing == null) {
            apiKeyRepository.save(seed);
            return true;
        }

        boolean updated = !seed.getClientName().equals(existing.getClientName())
                || existing.isActive() != seed.isActive();
        if (updated) {
            existing.setClientName(seed.getClientName());
            existing.setActive(seed.isActive());
            apiKeyRepository.save(existing);
        }
        return updated;
    }
}
