package com.converthub.auth.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.converthub.auth.model.User;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByGoogleId(String googleId);
}
