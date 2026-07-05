package com.nima.tempconv.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.nima.tempconv.service.TemperatureService;

@RestController
public class HomeController {

    private final TemperatureService temperatureService;

    public HomeController(TemperatureService temperatureService) {
        this.temperatureService = temperatureService;
    }

    @GetMapping("/")
    public Map<String, Object> home(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey) {
        temperatureService.validateApiKey(apiKey);
        return Map.of(
                "service", "Temperature Converter API",
                "port", 8081,
                "endpoints", Map.of(
                        "convert", "POST /api/temperatures/convert?value={value}&unit={unit}",
                        "history", "GET /api/temperatures/history"),
                "frontend", "Open http://localhost:3000 for the web UI");
    }
}
