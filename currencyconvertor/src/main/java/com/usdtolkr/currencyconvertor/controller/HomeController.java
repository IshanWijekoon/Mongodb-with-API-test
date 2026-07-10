package com.usdtolkr.currencyconvertor.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.usdtolkr.currencyconvertor.service.CurrencyService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class HomeController {

    private final CurrencyService currencyService;

    @GetMapping("/")
    public Map<String, Object> home(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        currencyService.authenticate(apiKey, authorization);
        return Map.of(
                "service", "Currency Converter API",
                "port", 8082,
                "endpoints", Map.of(
                        "convert", "POST /api/currency/convert?usdAmount={amount}",
                        "history", "GET /api/currency/history"),
                "frontend", "Open http://localhost:3000 for the web UI");
    }
}
