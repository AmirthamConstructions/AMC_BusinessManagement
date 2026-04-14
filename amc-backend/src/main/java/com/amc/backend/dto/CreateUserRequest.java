package com.amc.backend.dto;

import com.amc.backend.model.User;
import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for POST /api/users (admin user creation).
 *
 * Separates the API contract from the domain model — clients can only set
 * the fields listed here; internal fields (id, createdAt, updatedAt, etc.)
 * can never be injected by callers.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    private String phone;

    private String picture;

    /** Defaults to VIEWER if not provided. */
    private User.Role role;
}
