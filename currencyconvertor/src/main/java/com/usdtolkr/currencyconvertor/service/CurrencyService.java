package com.usdtolkr.currencyconvertor.service;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.usdtolkr.currencyconvertor.exception.UnauthorizedException;
import com.usdtolkr.currencyconvertor.model.CurrencyLog;
import com.usdtolkr.currencyconvertor.repository.ApiKeyRepository;
import com.usdtolkr.currencyconvertor.repository.CurrencyRepository;
import com.usdtolkr.currencyconvertor.security.JwtValidator;

import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CurrencyService {
    private final CurrencyRepository currencyRepository;
    private final ApiKeyRepository apiKeyRepository;
    private final JwtValidator jwtValidator;

    private static final double USD_TO_LKR_RATE = 300.0;

    public void validateApiKey(String apiKey) {
        if (!StringUtils.hasText(apiKey)) {
            throw new UnauthorizedException("Missing required header X-API-KEY");
        }

        apiKeyRepository.findByKeyValueAndActiveTrue(apiKey.trim())
                .orElseThrow(() -> new UnauthorizedException("Invalid, inactive, or revoked API key"));
    }

    /**
     * Accepts either a valid Lab 05 API key or a Bearer JWT from auth-service.
     */
    public void authenticate(String apiKey, String authorizationHeader) {
        if (StringUtils.hasText(apiKey)
                && apiKeyRepository.findByKeyValueAndActiveTrue(apiKey.trim()).isPresent()) {
            return;
        }
        if (jwtValidator.isValidBearer(authorizationHeader)) {
            return;
        }
        if (!StringUtils.hasText(apiKey) && !StringUtils.hasText(authorizationHeader)) {
            throw new UnauthorizedException("Missing X-API-KEY or Authorization Bearer token");
        }
        throw new UnauthorizedException("Invalid API key or Bearer token");
    }

    public CurrencyLog convertAndSave(double amount) {
        double result = amount * USD_TO_LKR_RATE;

        CurrencyLog log = new CurrencyLog();
        log.setInputAmount(amount);
        log.setInputCurrency("USD");
        log.setOutputAmount(result);
        log.setOutputCurrency("LKR");
        log.setExchangeRate(USD_TO_LKR_RATE);
        log.setTimestamp(LocalDateTime.now().toString());

        return currencyRepository.save(log);
    }

    public List<CurrencyLog> getAllLogs() {
        return currencyRepository.findAll();
    }
}
