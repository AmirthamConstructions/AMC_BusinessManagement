package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.dto.CreateUserRequest;
import com.amc.backend.dto.UpdateUserRequest;
import com.amc.backend.dto.UserResponseDto;
import com.amc.backend.service.UserService;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponseDto>>> getAll() {
        List<UserResponseDto> users = userService.findAll();
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponseDto>> getById(@PathVariable String id) {
        UserResponseDto user = userService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<ApiResponse<UserResponseDto>> getByEmail(@PathVariable String email) {
        UserResponseDto user = userService.findByEmail(email);
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponseDto>> create(
            @Valid @RequestBody CreateUserRequest request) {
        UserResponseDto created = userService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponseDto>> update(
            @PathVariable String id,
            @Valid @RequestBody UpdateUserRequest request) {
        UserResponseDto updated = userService.update(id, request);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @PatchMapping("/{id}/last-login")
    public ResponseEntity<ApiResponse<UserResponseDto>> updateLastLogin(@PathVariable String id) {
        UserResponseDto updated = userService.updateLastLogin(id);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
