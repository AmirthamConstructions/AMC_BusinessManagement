package com.amc.backend.controller;

import com.amc.backend.dto.ApiResponse;
import com.amc.backend.model.User;
import com.amc.backend.service.UserService;
import jakarta.validation.Valid;
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
    public ResponseEntity<ApiResponse<List<User>>> getAll() {
        List<User> users = userService.findAll();
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> getById(@PathVariable String id) {
        User user = userService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<ApiResponse<User>> getByEmail(@PathVariable String email) {
        User user = userService.findByEmail(email);
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<User>> create(@Valid @RequestBody User user) {
        User created = userService.create(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> update(@PathVariable String id, @Valid @RequestBody User user) {
        User updated = userService.update(id, user);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @PatchMapping("/{id}/last-login")
    public ResponseEntity<ApiResponse<User>> updateLastLogin(@PathVariable String id) {
        User updated = userService.updateLastLogin(id);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
