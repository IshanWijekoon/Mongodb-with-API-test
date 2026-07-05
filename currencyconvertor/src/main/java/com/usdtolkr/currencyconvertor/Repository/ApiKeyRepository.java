package com.usdtolkr.currencyconvertor.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.usdtolkr.currencyconvertor.model.ApiKey;

@Repository
public interface ApiKeyRepository extends MongoRepository<ApiKey, String> {

    Optional<ApiKey> findByKeyValueAndActiveTrue(String keyValue);
}
