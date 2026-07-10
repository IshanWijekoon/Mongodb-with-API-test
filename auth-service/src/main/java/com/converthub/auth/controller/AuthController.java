package com.converthub.auth.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.converthub.auth.repository.UserRepository;
import com.converthub.auth.service.JwtService;
import com.converthub.auth.service.UserService;

import io.jsonwebtoken.Claims;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final UserService userService;

    public AuthController(JwtService jwtService, UserRepository userRepository, UserService userService) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.userService = userService;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "service", "ConvertHub Auth Service",
                "port", 8083,
                "status", "ok");
    }

    @GetMapping("/me")
    public Map<String, Object> me(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        String token = extractBearerToken(authorization);
        if (!StringUtils.hasText(token) || !jwtService.isValid(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing or invalid Bearer token");
        }

        Claims claims = jwtService.parseClaims(token);
        String googleId = claims.getSubject();

        return userRepository.findByGoogleId(googleId)
                .map(userService::toPublicProfile)
                .orElseGet(() -> Map.of(
                        "googleId", googleId,
                        "email", stringClaim(claims, "email"),
                        "name", stringClaim(claims, "name"),
                        "picture", stringClaim(claims, "picture")));
    }

    private static String extractBearerToken(String authorization) {
        if (!StringUtils.hasText(authorization)) {
            return null;
        }
        String value = authorization.trim();
        if (value.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return value.substring(7).trim();
        }
        return null;
    }

    private static String stringClaim(Claims claims, String key) {
        Object value = claims.get(key);
        return value == null ? "" : String.valueOf(value);
    }
}
