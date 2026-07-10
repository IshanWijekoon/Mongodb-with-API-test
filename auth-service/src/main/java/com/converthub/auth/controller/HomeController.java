package com.converthub.auth.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

    @GetMapping("/")
    public Map<String, Object> home() {
        return Map.of(
                "service", "ConvertHub Auth Service",
                "port", 8083,
                "login", "GET /oauth2/authorization/google",
                "me", "GET /api/auth/me (Authorization: Bearer <jwt>)",
                "frontend", "Open http://localhost:3000 for the web UI");
    }
}
