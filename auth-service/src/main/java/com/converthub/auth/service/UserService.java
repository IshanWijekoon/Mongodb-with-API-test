package com.converthub.auth.service;

import java.time.Instant;
import java.util.Map;

import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import com.converthub.auth.model.User;
import com.converthub.auth.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User upsertFromOAuth(OAuth2User oauthUser) {
        String googleId = oauthUser.getAttribute("sub");
        if (googleId == null || googleId.isBlank()) {
            throw new IllegalStateException("Google OAuth response missing subject (sub)");
        }

        String email = oauthUser.getAttribute("email");
        String name = oauthUser.getAttribute("name");
        String picture = oauthUser.getAttribute("picture");

        return userRepository.findByGoogleId(googleId)
                .map(existing -> {
                    existing.setEmail(email);
                    existing.setName(name);
                    existing.setPicture(picture);
                    return userRepository.save(existing);
                })
                .orElseGet(() -> userRepository.save(new User(
                        null,
                        googleId,
                        email,
                        name,
                        picture,
                        Instant.now().toString())));
    }

    public Map<String, Object> toPublicProfile(User user) {
        return Map.of(
                "googleId", user.getGoogleId(),
                "email", nullToEmpty(user.getEmail()),
                "name", nullToEmpty(user.getName()),
                "picture", nullToEmpty(user.getPicture()));
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
