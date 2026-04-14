package com.amc.backend.dto;

import com.amc.backend.model.User;
import javax.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for PUT /api/users/{id} (admin user update).
 *
 * Only exposes fields that an admin is permitted to change.
 * Email and password are intentionally excluded — email changes require
 * a dedicated verified flow, password changes use /api/auth/change-password.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String phone;

    private String picture;

    /** Role assignment — admin only. */
    private User.Role role;

    /** Enable or disable the account. */
    private Boolean enabled;

    /** Lock or unlock the account. */
    private Boolean accountLocked;
}
