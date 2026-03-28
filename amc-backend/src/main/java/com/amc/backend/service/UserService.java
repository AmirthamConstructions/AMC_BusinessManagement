package com.amc.backend.service;

import com.amc.backend.exception.DuplicateResourceException;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.User;
import com.amc.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public User findById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    public User create(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new DuplicateResourceException("User", "email", user.getEmail());
        }
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    public User update(String id, User user) {
        User existing = findById(id);
        existing.setName(user.getName());
        existing.setPhone(user.getPhone());
        existing.setPicture(user.getPicture());
        existing.setRole(user.getRole());
        existing.setEnabled(user.isEnabled());
        existing.setAccountLocked(user.isAccountLocked());
        existing.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(existing);
    }

    public User updateLastLogin(String id) {
        User user = findById(id);
        user.setLastLoginAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    public void delete(String id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", "id", id);
        }
        userRepository.deleteById(id);
    }
}
