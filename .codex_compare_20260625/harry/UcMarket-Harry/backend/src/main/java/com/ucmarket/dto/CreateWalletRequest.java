package com.ucmarket.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record CreateWalletRequest(
		@NotNull UUID userId
		// 我傳入只要userID
) {

}
