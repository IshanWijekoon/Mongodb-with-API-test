package com.usdtolkr.currencyconvertor.service;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.usdtolkr.currencyconvertor.exception.UnauthorizedException;
import com.usdtolkr.currencyconvertor.model.CurrencyLog;
import com.usdtolkr.currencyconvertor.repository.ApiKeyRepository;
import com.usdtolkr.currencyconvertor.repository.CurrencyRepository;

import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CurrencyService {
    private final CurrencyRepository currencyRepository;
    private final ApiKeyRepository apiKeyRepository;

    private static final double USD_TO_LKR_RATE = 300.0;

    public void validateApiKey(String apiKey) {
        if (!StringUtils.hasText(apiKey)) {
            throw new UnauthorizedException("Missing required header X-API-KEY");
        }

        apiKeyRepository.findByKeyValueAndActiveTrue(apiKey.trim())
                .orElseThrow(() -> new UnauthorizedException("Invalid, inactive, or revoked API key"));
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
