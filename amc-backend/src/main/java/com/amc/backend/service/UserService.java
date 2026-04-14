package com.amc.backend.service;

import com.amc.backend.dto.CreateUserRequest;
import com.amc.backend.dto.UpdateUserRequest;
import com.amc.backend.dto.UserResponseDto;
import com.amc.backend.exception.DuplicateResourceException;
import com.amc.backend.exception.ResourceNotFoundException;
import com.amc.backend.model.User;
import com.amc.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserResponseDto> findAll() {
        return userRepository.findAll().stream()
                .map(UserResponseDto::fromUser)
                .collect(Collectors.toList());
    }

    public UserResponseDto findById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return UserResponseDto.fromUser(user);
    }

    public UserResponseDto findByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return UserResponseDto.fromUser(user);
    }

    /**
     * Admin user creation — password is hashed before persistence.
     * Uses CreateUserRequest DTO so callers cannot inject internal fields.
     */
    public UserResponseDto create(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .picture(request.getPicture())
                .role(request.getRole() != null ? request.getRole() : User.Role.VIEWER)
                .provider("local")
                .enabled(true)
                .accountLocked(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return UserResponseDto.fromUser(userRepository.save(user));
    }

    /**
     * Admin user update — only safe, explicitly permitted fields are changed.
     * Email and password are not editable here.
     */
    public UserResponseDto update(String id, UpdateUserRequest request) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        existing.setName(request.getName());
        existing.setPhone(request.getPhone());
        existing.setPicture(request.getPicture());
        if (request.getRole() != null) {
            existing.setRole(request.getRole());
        }
        if (request.getEnabled() != null) {
            existing.setEnabled(request.getEnabled());
        }
        if (request.getAccountLocked() != null) {
            existing.setAccountLocked(request.getAccountLocked());
        }
        existing.setUpdatedAt(LocalDateTime.now());

        return UserResponseDto.fromUser(userRepository.save(existing));
    }

    public UserResponseDto updateLastLogin(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        user.setLastLoginAt(LocalDateTime.now());
        return UserResponseDto.fromUser(userRepository.save(user));
    }

    public void delete(String id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", "id", id);
        }
        userRepository.deleteById(id);
    }
}
