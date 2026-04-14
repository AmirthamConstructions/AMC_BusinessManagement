package com.amc.backend.dto;

import com.amc.backend.model.User;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Safe API response DTO for User.
 *
 * Explicitly includes only fields that are safe to expose to API consumers.
 * Internal fields (password, accountLocked, enabled, provider) are deliberately excluded.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponseDto {

    private String id;
    private String email;
    private String name;
    private String phone;
    private String picture;
    private String role;
    private String lastLoginAt;
    private String createdAt;
    private String updatedAt;

    /**
     * Factory method — converts a User domain object to a safe response DTO.
     * Password, accountLocked, enabled, and provider are never included.
     */
    public static UserResponseDto fromUser(User user) {
        return UserResponseDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .phone(user.getPhone())
                .picture(user.getPicture())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .lastLoginAt(user.getLastLoginAt() != null ? user.getLastLoginAt().toString() : null)
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null)
                .build();
    }
}
