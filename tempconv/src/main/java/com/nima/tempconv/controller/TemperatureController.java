package com.nima.tempconv.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.nima.tempconv.model.TemperatureLog;
import com.nima.tempconv.service.TemperatureService;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/temperatures")
public class TemperatureController {

    private final TemperatureService temperatureService;

    public TemperatureController(TemperatureService temperatureService) {
        this.temperatureService = temperatureService;
    }

    @PostMapping("/convert")
    public TemperatureLog convert(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam double value,
            @RequestParam String unit) {
        temperatureService.authenticate(apiKey, authorization);
        return temperatureService.convertAndSave(value, unit);
    }

    @GetMapping(value = "/safety-check", produces = MediaType.TEXT_PLAIN_VALUE)
    public String safetyCheck(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam double value,
            @RequestParam String unit) {
        temperatureService.authenticate(apiKey, authorization);
        return temperatureService.checkSafety(value, unit);
    }

    @GetMapping("/history")
    public List<TemperatureLog> history(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        temperatureService.authenticate(apiKey, authorization);
        return temperatureService.getHistory();
    }

    @GetMapping("/history/filter")
    public List<TemperatureLog> historyFilter(
            @RequestHeader(value = "X-API-KEY", required = false) String apiKey,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam String unit) {
        temperatureService.authenticate(apiKey, authorization);
        return temperatureService.getHistoryByUnit(unit);
    }
}
