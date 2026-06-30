package com.flowpulse.web.support;

import com.flowpulse.common.ApiResponse;
import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final MessageSource messageSource;

    public GlobalExceptionHandler(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    @ExceptionHandler(BusinessException.class)
    public ApiResponse<Void> handleBusinessException(BusinessException exception) {
        String message = message(exception.getMessageKey(), exception.getMessageArgs());
        return ApiResponse.failure(exception.getErrorCode().getCode(), message);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ApiResponse<Void> handleValidationException(MethodArgumentNotValidException exception) {
        FieldError fieldError = exception.getBindingResult().getFieldError();
        String message = fieldError == null ? message(ErrorCode.VALIDATION_FAILED.getMessageKey()) : fieldError.getDefaultMessage();
        if (message != null && message.startsWith("{") && message.endsWith("}")) {
            message = message(message.substring(1, message.length() - 1));
        }
        return ApiResponse.failure(ErrorCode.VALIDATION_FAILED.getCode(), message);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ApiResponse<Void> handleUnreadableRequest(HttpMessageNotReadableException exception) {
        LOGGER.warn("Unreadable request body", exception);
        return ApiResponse.failure(ErrorCode.VALIDATION_FAILED.getCode(), message(ErrorCode.VALIDATION_FAILED.getMessageKey()));
    }

    @ExceptionHandler(Exception.class)
    public ApiResponse<Void> handleException(Exception exception) {
        LOGGER.error("Unhandled request exception", exception);
        return ApiResponse.failure(ErrorCode.INTERNAL_ERROR.getCode(), message(ErrorCode.INTERNAL_ERROR.getMessageKey()));
    }

    private String message(String messageKey, Object... args) {
        return messageSource.getMessage(messageKey, args, messageKey, LocaleContextHolder.getLocale());
    }
}
