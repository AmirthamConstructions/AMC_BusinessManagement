package com.amc.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private String status;
    private T data;
    private PaginationMeta meta;
    private ApiError error;

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder()
                .status("ok")
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> ok(T data, PaginationMeta meta) {
        return ApiResponse.<T>builder()
                .status("ok")
                .data(data)
                .meta(meta)
                .build();
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return ApiResponse.<T>builder()
                .status("error")
                .error(new ApiError(code, message))
                .build();
    }
}
