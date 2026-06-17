package com.ucmarket.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.ucmarket.entity.Wallet;
import com.ucmarket.repository.UserRepository;
import com.ucmarket.security.JwtTokenProvider;
import com.ucmarket.service.WalletService;

/**
 * WalletController「網頁層」測試 —— @WebMvcTest 只載 controller，不連 DB。
 * WalletService 用 @MockitoBean 換成假的 → 只驗「HTTP 進來 → 回 201 → JSON 形狀對」。
 * 跟你專案裡的 MarketControllerTest 同一套寫法。
 */
@WebMvcTest(WalletController.class)
@AutoConfigureMockMvc(addFilters = false)
class WalletControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private WalletService walletService;

	@MockitoBean
	private JwtTokenProvider jwtTokenProvider;

	@MockitoBean
	private UserRepository userRepository;

	@Test
	@DisplayName("POST /api/wallets → 201 + 回傳 balance 0 的錢包")
	void createWalletReturnsCreated() throws Exception {
		UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");
		Wallet wallet = new Wallet(userId);
		// id / createdAt 平常由 JPA 在進 DB 時產生；這裡沒進 DB，用反射手動塞，模擬「存完的樣子」
		ReflectionTestUtils.setField(wallet, "id", UUID.randomUUID());
		ReflectionTestUtils.setField(wallet, "createdAt", LocalDateTime.now());
		when(walletService.createWalletForUser(userId)).thenReturn(wallet);

		mockMvc.perform(post("/api/wallets")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{ "userId": "11111111-1111-1111-1111-111111111111" }
					"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.userId").value("11111111-1111-1111-1111-111111111111"))
			.andExpect(jsonPath("$.balance").value(0));
	}

	@Test
	@DisplayName("缺 userId → 400(@Valid 擋下)，且完全不呼叫 service")
	void createWalletRejectsMissingUserId() throws Exception {
		mockMvc.perform(post("/api/wallets")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
			.andExpect(status().isBadRequest());

		verify(walletService, never()).createWalletForUser(any());
	}
}
