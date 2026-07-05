package com.nima.tempconv.config;

import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.nima.tempconv.model.ApiKey;
import com.nima.tempconv.repository.ApiKeyRepository;

@Component
public class ApiKeySeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ApiKeySeeder.class);

    private final ApiKeyRepository apiKeyRepository;

    public ApiKeySeeder(ApiKeyRepository apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<ApiKey> keys = List.of(
                new ApiKey(null, "SUPER-SECRET-DEV-KEY-123", "dev", true, Instant.now().toString()),
                new ApiKey(null, "EXPIRED-HACKER-KEY-999", "expired", false, Instant.now().toString()));

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
        return apiKeyRepository.findByKeyValue(seed.getKeyValue())
                .map(existing -> {
                    boolean updated = existing.isActive() != seed.isActive()
                            || !seed.getOwner().equals(existing.getOwner());
                    if (updated) {
                        existing.setActive(seed.isActive());
                        existing.setOwner(seed.getOwner());
                        apiKeyRepository.save(existing);
                    }
                    return updated;
                })
                .orElseGet(() -> {
                    apiKeyRepository.save(seed);
                    return true;
                });
    }
}
